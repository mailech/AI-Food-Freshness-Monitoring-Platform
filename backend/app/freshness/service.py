"""Freshness assessment service - the orchestrator for the whole analysis workflow.

    image bytes + storage inputs
        -> image analysis engine (colour, texture, spoilage, visual freshness)
        -> storage score            (compliance evaluation)
        -> shelf-life score         (prediction service)
        -> product age score
        -> weighted freshness score (40/25/20/15)
        -> persist assessment + indicators + shelf-life prediction
        -> recommendations
        -> alerts + notifications
        -> batch summary refresh

Results are stored, so re-reading an analysis never re-runs inference.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.category_rules import get_profile
from app.core.enums import AuditAction, ModelKind
from app.core.logging_config import get_logger
from app.freshness.scoring import (
    build_score_explanation,
    compute_freshness_score,
    overall_health_score,
    product_age_score,
    quality_score,
    shelf_life_score,
    storage_score_from_deviation,
)
from app.inventory.categories import base_shelf_life_days
from app.inventory.service import age_in_days, storage_duration_days, touch_assessment_summary
from app.ml.image_analysis.analyzer import ImageAnalysisResult, get_engine
from app.ml.registry import get_registry
from app.models import (
    FoodBatch,
    FoodImage,
    FreshnessAssessment,
    ShelfLifePrediction,
    SpoilageIndicator,
    User,
)
from app.services.audit import record_audit

logger = get_logger("app.freshness.service")

# Keys from the raw descriptor set that are worth persisting for explainability.
_PERSISTED_FEATURE_KEYS = (
    "mean_hue", "mean_saturation", "mean_value", "std_saturation",
    "color_uniformity", "colourfulness", "browning_ratio", "dark_spot_ratio",
    "pale_ratio", "green_ratio", "red_ratio", "yellow_ratio", "grey_blue_ratio",
    "laplacian_variance", "edge_density", "local_variance_mean", "ridge_ratio",
    "lbp_entropy", "glcm_contrast", "glcm_homogeneity", "glcm_energy",
    "glcm_correlation", "glcm_entropy", "color_degradation_score",
    "texture_condition_score", "food_pixel_ratio",
)


def previous_score(db: Session, batch_id: int) -> float | None:
    row = db.scalar(
        select(FreshnessAssessment.freshness_score)
        .where(FreshnessAssessment.batch_id == batch_id)
        .order_by(FreshnessAssessment.created_at.desc())
    )
    return float(row) if row is not None else None


def analyze_batch(
    db: Session,
    batch: FoodBatch,
    *,
    image_bytes: bytes | None = None,
    image: FoodImage | None = None,
    temperature_c: float | None = None,
    humidity_pct: float | None = None,
    air_circulation: str | None = None,
    light_exposure: str | None = None,
    packaging_type: str | None = None,
    storage_duration_days_override: float | None = None,
    user: User | None = None,
    notes: str | None = None,
    request_meta: dict | None = None,
    generate_recommendations: bool = True,
    raise_alerts: bool = True,
) -> FreshnessAssessment:
    """Run the full assessment pipeline for a batch and persist everything."""
    registry = get_registry()
    product = batch.product
    category = product.category if product else None
    category_slug = category.slug if category else None
    profile = get_profile(category_slug)

    # ---- 0. record the storage environment supplied with the analysis ----
    from app.storage.service import (
        batch_storage_snapshot,
        get_active_condition,
        upsert_storage_condition,
    )

    if any(
        value is not None
        for value in (temperature_c, humidity_pct, air_circulation, light_exposure)
    ):
        upsert_storage_condition(
            db,
            batch,
            temperature_c=temperature_c,
            humidity_pct=humidity_pct,
            air_circulation=air_circulation,
            light_exposure=light_exposure,
            location_name=batch.storage_location,
        )
    condition = get_active_condition(db, batch.id)
    effective_temp = temperature_c if temperature_c is not None else (
        condition.temperature_c if condition else None
    )
    effective_humidity = humidity_pct if humidity_pct is not None else (
        condition.humidity_pct if condition else None
    )
    effective_circulation = air_circulation or (condition.air_circulation if condition else None)
    effective_light = light_exposure or (condition.light_exposure if condition else None)

    # ---- 1. visual analysis ------------------------------------------
    analysis: ImageAnalysisResult | None = None
    if image_bytes is not None:
        analysis = get_engine().analyze_bytes(image_bytes, category_slug=category_slug)

    visual_score = analysis.visual_score if analysis else None
    visual_confidence = analysis.freshness.confidence if analysis else 0.35
    spoilage_probability = analysis.spoilage.spoilage_probability if analysis else None

    # ---- 2. storage score ---------------------------------------------
    storage_component, storage_notes = storage_score_from_deviation(
        effective_temp,
        effective_humidity,
        profile=profile,
        air_circulation=effective_circulation,
        light_exposure=effective_light,
    )

    # ---- 3. shelf-life score ------------------------------------------
    from app.shelf_life import service as shelf_life_service

    total_life = base_shelf_life_days(category, product.shelf_life_days if product else None)
    shelf_result = shelf_life_service.predict(
        db,
        batch,
        freshness_score=visual_score,
        freshness_confidence=visual_confidence,
        temperature_c=effective_temp,
        humidity_pct=effective_humidity,
        packaging_type=packaging_type,
        air_circulation=effective_circulation,
    )
    shelf_component = shelf_life_score(
        shelf_result.remaining_days, total_shelf_life_days=total_life, profile=profile
    )

    # ---- 4. product age score -----------------------------------------
    age = age_in_days(batch)
    age_component = product_age_score(age, total_shelf_life_days=total_life, profile=profile)

    # ---- 5. weighted combination --------------------------------------
    score_result = compute_freshness_score(
        visual_score=visual_score if visual_score is not None else 60.0,
        storage_score=storage_component,
        shelf_life_score_value=shelf_component,
        product_age_score_value=age_component,
        explanation=(
            [f"Storage: {note}" for note in storage_notes]
            + ([f"Shelf life: {shelf_result.explanation}"] if shelf_result.explanation else [])
            + (
                [f"Visual: {ind}" for ind in analysis.freshness.detected_indicators]
                if analysis
                else ["Visual: no image supplied - visual component defaulted to a neutral 60."]
            )
        ),
    )

    health = overall_health_score(
        score_result.score,
        spoilage_probability=spoilage_probability,
        compliance_penalty=max(0.0, 100.0 - storage_component) * 0.08,
    )

    # ---- 6. persist ----------------------------------------------------
    model_info = analysis.freshness.model_info if analysis else None
    is_demo = model_info.is_demo if model_info else True

    explanation = build_score_explanation(score_result)
    explanation["analysis_label"] = registry.analysis_label()
    explanation["pipeline_steps"] = analysis.pipeline_steps if analysis else []
    if analysis:
        explanation["feature_summary"] = analysis.feature_summary()
        explanation["classification"] = analysis.classification.as_dict()
        explanation["spoilage"] = analysis.spoilage.as_dict()
    explanation["shelf_life"] = shelf_result.as_dict()

    assessment = FreshnessAssessment(
        batch_id=batch.id,
        image_id=image.id if image else None,
        assessed_by_id=user.id if user else None,
        freshness_score=score_result.score,
        freshness_category=str(score_result.category),
        freshness_probability=analysis.freshness.freshness_probability if analysis else None,
        confidence=visual_confidence,
        spoilage_probability=spoilage_probability,
        overall_health_score=health,
        visual_score=score_result.components.visual,
        storage_score=score_result.components.storage,
        shelf_life_score=score_result.components.shelf_life,
        product_age_score=score_result.components.product_age,
        weights_used=score_result.weights,
        model_kind=str(model_info.kind) if model_info else str(ModelKind.BASELINE),
        model_name=model_info.name if model_info else "no-image-baseline",
        model_version=model_info.version if model_info else "1.0.0",
        is_demo=is_demo,
        visual_features=(
            {
                key: round(float(analysis.features[key]), 5)
                for key in _PERSISTED_FEATURE_KEYS
                if key in analysis.features
            }
            if analysis
            else None
        ),
        class_probabilities=analysis.freshness.class_probabilities if analysis else None,
        explanation=explanation,
        detected_indicators=(
            analysis.freshness.detected_indicators if analysis else ["No image supplied"]
        ),
        notes=notes,
        processing_ms=analysis.processing_ms if analysis else None,
        input_temperature_c=effective_temp,
        input_humidity_pct=effective_humidity,
        input_packaging=str(packaging_type or batch.packaging_type or "") or None,
        input_storage_duration_days=(
            storage_duration_days_override
            if storage_duration_days_override is not None
            else storage_duration_days(batch)
        ),
        input_product_age_days=age,
    )
    db.add(assessment)
    db.flush()

    # ---- 7. spoilage indicators ---------------------------------------
    if analysis:
        for finding in analysis.spoilage.findings:
            db.add(
                SpoilageIndicator(
                    assessment_id=assessment.id,
                    indicator_type=finding.indicator_type,
                    label=finding.label,
                    severity=finding.severity,
                    confidence=finding.confidence,
                    affected_area_ratio=finding.affected_area_ratio,
                    detected=finding.detected,
                    regions=[r.as_dict() for r in finding.regions] or None,
                    description=finding.description,
                    detector=finding.detector,
                )
            )
        db.flush()

    # ---- 8. shelf-life record linked to this assessment ----------------
    shelf_row = _store_shelf_life(db, batch, assessment, shelf_result, user)

    # ---- 9. batch summary ---------------------------------------------
    prior = previous_score(db, batch.id)
    touch_assessment_summary(
        db,
        batch,
        freshness_score=score_result.score,
        freshness_category=str(score_result.category),
        remaining_days=shelf_result.remaining_days,
        predicted_expiry=shelf_row.predicted_expiry_date,
    )

    if image is not None:
        image.is_analyzed = True
        # Persist the visual-explanation overlay produced by the same pipeline
        # run (never re-run inference just to draw boxes).
        if analysis is not None and analysis.overlay_jpeg:
            try:
                from app.services.storage_backend import build_storage_key, get_storage

                storage = get_storage()
                overlay_key = build_storage_key(
                    f"overlay-{image.id}.jpg",
                    prefix="food-images/overlays",
                    owner_id=user.id if user else None,
                )
                storage.save(overlay_key, analysis.overlay_jpeg, "image/jpeg")
                image.overlay_storage_key = overlay_key
            except Exception as exc:  # noqa: BLE001 - overlay is non-essential
                logger.warning("failed to store analysis overlay: %s", exc)
        db.flush()

    # ---- 10. recommendations ------------------------------------------
    if generate_recommendations:
        from app.recommendations.engine import generate_for_batch
        from app.recommendations.rotation import refresh_rotation_priorities

        generate_for_batch(db, batch, assessment_id=assessment.id)
        refresh_rotation_priorities(db)

    # ---- 11. alerts ---------------------------------------------------
    if raise_alerts:
        from app.notifications.alerts import (
            raise_expiry_alerts,
            raise_freshness_alerts,
            raise_shelf_life_alerts,
            raise_storage_alerts,
        )

        raise_freshness_alerts(
            db,
            batch,
            freshness_score=score_result.score,
            freshness_category=str(score_result.category),
            spoilage_probability=spoilage_probability,
            detected_indicators=[
                f.label for f in (analysis.spoilage.detected_findings if analysis else [])
            ],
            previous_score=prior,
            user=user,
        )
        raise_shelf_life_alerts(
            db,
            batch,
            remaining_days=shelf_result.remaining_days,
            predicted_expiry=shelf_row.predicted_expiry_date,
            risk_level=str(shelf_result.risk_level),
            user=user,
        )
        raise_expiry_alerts(db, batch, user)
        # The storage conditions submitted with the analysis are themselves
        # alertable - a warm batch should surface a storage alert even when the
        # image still looks acceptable.
        raise_storage_alerts(db, batch, batch_storage_snapshot(db, batch), user=user)

    if user is not None:
        record_audit(
            db,
            action=AuditAction.IMAGE_ANALYSIS,
            user=user,
            entity_type="freshness_assessment",
            entity_id=str(assessment.id),
            description=(
                f"Analysed batch {batch.batch_number}: {score_result.score:.0f}/100 "
                f"({score_result.category})"
            ),
            metadata={
                "batch_id": batch.id,
                "image_id": image.id if image else None,
                "model": assessment.model_name,
                "is_demo": is_demo,
                "processing_ms": assessment.processing_ms,
            },
            request_meta=request_meta,
        )

    logger.info(
        "assessment stored id=%s batch=%s score=%.1f category=%s demo=%s",
        assessment.id, batch.id, score_result.score, score_result.category, is_demo,
        extra={"event": "ml_prediction"},
    )
    return assessment


def _store_shelf_life(
    db: Session,
    batch: FoodBatch,
    assessment: FreshnessAssessment,
    result,
    user: User | None,
) -> ShelfLifePrediction:
    from datetime import date, timedelta

    info = result.model_info
    row = ShelfLifePrediction(
        batch_id=batch.id,
        assessment_id=assessment.id,
        predicted_by_id=user.id if user else None,
        remaining_shelf_life_days=result.remaining_days,
        predicted_expiry_date=date.today() + timedelta(days=int(round(result.remaining_days))),
        confidence=result.confidence,
        risk_level=str(result.risk_level),
        lower_bound_days=result.lower_bound_days,
        upper_bound_days=result.upper_bound_days,
        model_kind=str(info.kind) if info else str(ModelKind.BASELINE),
        model_name=info.name if info else "baseline",
        model_version=info.version if info else "1.0.0",
        is_demo=info.is_demo if info else True,
        features={
            k: v
            for k, v in result.features.items()
            if isinstance(v, (str, int, float, bool, type(None)))
        },
        factors=result.factors,
        explanation=result.explanation,
        computed_at=datetime.now(UTC),
    )
    db.add(row)
    db.flush()
    return row


# --------------------------------------------------------------- retrieval
def latest_for_batch(db: Session, batch_id: int) -> FreshnessAssessment | None:
    return db.scalar(
        select(FreshnessAssessment)
        .where(FreshnessAssessment.batch_id == batch_id)
        .order_by(FreshnessAssessment.created_at.desc())
    )


def history_for_batch(
    db: Session, batch_id: int, limit: int = 30
) -> list[FreshnessAssessment]:
    return list(
        db.scalars(
            select(FreshnessAssessment)
            .where(FreshnessAssessment.batch_id == batch_id)
            .order_by(FreshnessAssessment.created_at.desc())
            .limit(limit)
        ).all()
    )


def serialise_assessment(
    assessment: FreshnessAssessment, *, include_explanation: bool = True
) -> dict[str, Any]:
    from app.services.storage_backend import get_storage

    image_url = None
    overlay_url = None
    if assessment.image is not None:
        storage = get_storage()
        image_url = storage.url_for(assessment.image.storage_key)
        if assessment.image.overlay_storage_key:
            overlay_url = storage.url_for(assessment.image.overlay_storage_key)

    payload: dict[str, Any] = {
        "id": assessment.id,
        "batch_id": assessment.batch_id,
        "image_id": assessment.image_id,
        "image_url": image_url,
        "overlay_url": overlay_url,
        "freshness_score": round(assessment.freshness_score, 2),
        "freshness_category": assessment.freshness_category,
        "freshness_probability": assessment.freshness_probability,
        "confidence": assessment.confidence,
        "spoilage_probability": assessment.spoilage_probability,
        "overall_health_score": assessment.overall_health_score,
        "quality_score": round(
            quality_score(
                assessment.visual_score,
                assessment.storage_score,
                assessment.shelf_life_score,
                spoilage_probability=assessment.spoilage_probability,
            ),
            2,
        ),
        "components": {
            "visual": assessment.visual_score,
            "storage": assessment.storage_score,
            "shelf_life": assessment.shelf_life_score,
            "product_age": assessment.product_age_score,
        },
        "weights_used": assessment.weights_used,
        "detected_indicators": assessment.detected_indicators or [],
        "class_probabilities": assessment.class_probabilities,
        "model": {
            "kind": assessment.model_kind,
            "name": assessment.model_name,
            "version": assessment.model_version,
            "is_demo": assessment.is_demo,
            "label": (
                "Demo AI Analysis (baseline)" if assessment.is_demo
                else "Trained Model Prediction"
            ),
        },
        "inputs": {
            "temperature_c": assessment.input_temperature_c,
            "humidity_pct": assessment.input_humidity_pct,
            "packaging": assessment.input_packaging,
            "storage_duration_days": assessment.input_storage_duration_days,
            "product_age_days": assessment.input_product_age_days,
        },
        "indicators": [
            {
                "indicator_type": ind.indicator_type,
                "label": ind.label,
                "severity": ind.severity,
                "confidence": ind.confidence,
                "affected_area_ratio": ind.affected_area_ratio,
                "detected": ind.detected,
                "description": ind.description,
                "regions": ind.regions or [],
                "detector": ind.detector,
            }
            for ind in assessment.indicators
        ],
        "processing_ms": assessment.processing_ms,
        "notes": assessment.notes,
        "created_at": assessment.created_at,
    }
    if include_explanation:
        payload["explanation"] = assessment.explanation
        payload["visual_features"] = assessment.visual_features
    return payload
