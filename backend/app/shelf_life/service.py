"""Shelf-life prediction service.

Builds the feature vector from the batch, product, category and storage state,
delegates to whichever `ShelfLifeModel` the registry selected, persists the
result and updates the batch's denormalised summary.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import RiskLevel
from app.core.logging_config import get_logger
from app.inventory.categories import base_shelf_life_days
from app.inventory.service import age_in_days, storage_duration_days
from app.ml.base import ShelfLifePredictionResult
from app.ml.registry import get_registry
from app.models import FoodBatch, FreshnessAssessment, ShelfLifePrediction, User
from app.storage.service import get_active_condition

logger = get_logger("app.shelf_life")


def build_features(
    db: Session,
    batch: FoodBatch,
    *,
    freshness_score: float | None = None,
    freshness_confidence: float | None = None,
    temperature_c: float | None = None,
    humidity_pct: float | None = None,
    packaging_type: str | None = None,
    air_circulation: str | None = None,
    storage_duration_override: float | None = None,
) -> dict[str, Any]:
    """Assemble the model input. Explicit arguments override stored values."""
    product = batch.product
    category = product.category if product else None
    condition = get_active_condition(db, batch.id)

    temperature = temperature_c if temperature_c is not None else (
        condition.temperature_c if condition else None
    )
    humidity = humidity_pct if humidity_pct is not None else (
        condition.humidity_pct if condition else None
    )
    circulation = air_circulation or (condition.air_circulation if condition else None)
    packaging = packaging_type or batch.packaging_type or (
        product.default_packaging if product else None
    )

    score = freshness_score if freshness_score is not None else batch.current_freshness_score
    duration = (
        storage_duration_override
        if storage_duration_override is not None
        else storage_duration_days(batch)
    )

    declared_remaining = None
    if batch.expected_expiry_date is not None:
        declared_remaining = float((batch.expected_expiry_date - date.today()).days)
        # Never predict "less than zero remaining" via the cap; only cap upward.
        declared_remaining = max(0.0, declared_remaining)

    return {
        "category_slug": category.slug if category else None,
        "base_shelf_life_days": base_shelf_life_days(
            category, product.shelf_life_days if product else None
        ),
        "temperature_c": temperature,
        "humidity_pct": humidity,
        "packaging_type": str(packaging) if packaging else None,
        "air_circulation": str(circulation) if circulation else None,
        "storage_duration_days": duration,
        "product_age_days": age_in_days(batch),
        "freshness_score": score,
        "freshness_confidence": freshness_confidence,
        "declared_remaining_days": declared_remaining,
        "quantity": float(batch.quantity or 0),
    }


def predict(
    db: Session,
    batch: FoodBatch,
    *,
    freshness_score: float | None = None,
    freshness_confidence: float | None = None,
    temperature_c: float | None = None,
    humidity_pct: float | None = None,
    packaging_type: str | None = None,
    air_circulation: str | None = None,
) -> ShelfLifePredictionResult:
    """Run inference without persisting (used by the preview endpoint)."""
    features = build_features(
        db,
        batch,
        freshness_score=freshness_score,
        freshness_confidence=freshness_confidence,
        temperature_c=temperature_c,
        humidity_pct=humidity_pct,
        packaging_type=packaging_type,
        air_circulation=air_circulation,
    )
    return get_registry().shelf_life.predict(features)


def predict_and_store(
    db: Session,
    batch: FoodBatch,
    *,
    assessment: FreshnessAssessment | None = None,
    user: User | None = None,
    temperature_c: float | None = None,
    humidity_pct: float | None = None,
    packaging_type: str | None = None,
    air_circulation: str | None = None,
    raise_alerts: bool = True,
) -> ShelfLifePrediction:
    """Predict, persist and update the batch summary + alerts."""
    result = predict(
        db,
        batch,
        freshness_score=assessment.freshness_score if assessment else None,
        freshness_confidence=assessment.confidence if assessment else None,
        temperature_c=temperature_c,
        humidity_pct=humidity_pct,
        packaging_type=packaging_type,
        air_circulation=air_circulation,
    )

    predicted_expiry = date.today() + timedelta(days=int(round(result.remaining_days)))
    info = result.model_info

    row = ShelfLifePrediction(
        batch_id=batch.id,
        assessment_id=assessment.id if assessment else None,
        predicted_by_id=user.id if user else None,
        remaining_shelf_life_days=result.remaining_days,
        predicted_expiry_date=predicted_expiry,
        confidence=result.confidence,
        risk_level=str(result.risk_level),
        lower_bound_days=result.lower_bound_days,
        upper_bound_days=result.upper_bound_days,
        model_kind=str(info.kind) if info else "BASELINE",
        model_name=info.name if info else "baseline",
        model_version=info.version if info else "1.0.0",
        is_demo=info.is_demo if info else True,
        features={k: v for k, v in result.features.items() if _json_safe(v)},
        factors=result.factors,
        explanation=result.explanation,
        computed_at=datetime.now(UTC),
    )
    db.add(row)
    db.flush()

    batch.remaining_shelf_life_days = result.remaining_days
    batch.predicted_expiry_date = predicted_expiry
    db.flush()

    if raise_alerts:
        from app.notifications.alerts import raise_shelf_life_alerts

        raise_shelf_life_alerts(
            db,
            batch,
            remaining_days=result.remaining_days,
            predicted_expiry=predicted_expiry,
            risk_level=str(result.risk_level),
            user=user,
        )

    logger.info(
        "shelf-life prediction batch=%s remaining=%.2f risk=%s model=%s",
        batch.id, result.remaining_days, result.risk_level,
        info.name if info else "baseline",
        extra={"event": "ml_prediction"},
    )
    return row


def _json_safe(value: Any) -> bool:
    return isinstance(value, (str, int, float, bool, type(None), list, dict))


def latest_for_batch(db: Session, batch_id: int) -> ShelfLifePrediction | None:
    return db.scalar(
        select(ShelfLifePrediction)
        .where(ShelfLifePrediction.batch_id == batch_id)
        .order_by(ShelfLifePrediction.created_at.desc())
    )


def history_for_batch(db: Session, batch_id: int, limit: int = 30) -> list[ShelfLifePrediction]:
    return list(
        db.scalars(
            select(ShelfLifePrediction)
            .where(ShelfLifePrediction.batch_id == batch_id)
            .order_by(ShelfLifePrediction.created_at.desc())
            .limit(limit)
        ).all()
    )


def serialise(row: ShelfLifePrediction) -> dict[str, Any]:
    return {
        "id": row.id,
        "batch_id": row.batch_id,
        "assessment_id": row.assessment_id,
        "remaining_shelf_life_days": row.remaining_shelf_life_days,
        "predicted_expiry_date": row.predicted_expiry_date,
        "confidence": row.confidence,
        "risk_level": row.risk_level,
        "lower_bound_days": row.lower_bound_days,
        "upper_bound_days": row.upper_bound_days,
        "model": {
            "kind": row.model_kind,
            "name": row.model_name,
            "version": row.model_version,
            "is_demo": row.is_demo,
            "label": "Baseline prediction" if row.is_demo else "Trained model prediction",
        },
        "factors": row.factors,
        "explanation": row.explanation,
        "computed_at": row.computed_at,
        "created_at": row.created_at,
    }


def risk_summary(remaining_days: float | None, risk_level: str | None) -> str:
    if remaining_days is None:
        return "No prediction available yet."
    level = RiskLevel.parse(risk_level, RiskLevel.LOW)
    return (
        f"Approximately {remaining_days:.1f} day(s) of shelf life remaining "
        f"(risk: {level})."
    )


def project_shelf_life(
    db: Session,
    batch: FoodBatch,
    *,
    days: int = 14,
    freshness_score: float | None = None,
    freshness_confidence: float | None = None,
    temperature_c: float | None = None,
    humidity_pct: float | None = None,
    packaging_type: str | None = None,
    air_circulation: str | None = None,
) -> list[dict[str, Any]]:
    """Forward-project remaining shelf life day by day.

    Re-runs the active shelf-life model with advancing storage duration and
    product age while holding storage conditions constant, so the curve answers
    "if nothing changes, how fast does this batch run out?". Works with any
    registered model (baseline or trained) because it only shifts time inputs.
    """
    horizon = max(1, min(int(days), 90))
    base = build_features(
        db,
        batch,
        freshness_score=freshness_score,
        freshness_confidence=freshness_confidence,
        temperature_c=temperature_c,
        humidity_pct=humidity_pct,
        packaging_type=packaging_type,
        air_circulation=air_circulation,
    )
    model = get_registry().shelf_life
    elapsed0 = float(base.get("storage_duration_days") or 0.0)
    age0 = float(base.get("product_age_days") or elapsed0)
    declared0 = base.get("declared_remaining_days")
    today = date.today()

    points: list[dict[str, Any]] = []
    for offset in range(horizon + 1):
        features = dict(base)
        features["storage_duration_days"] = elapsed0 + offset
        features["product_age_days"] = age0 + offset
        if declared0 is not None:
            # The declared best-before date is fixed in time, so its cap
            # tightens as the projection advances.
            features["declared_remaining_days"] = max(0.0, float(declared0) - offset)
        result = model.predict(features)
        points.append(
            {
                "day_offset": offset,
                "date": (today + timedelta(days=offset)).isoformat(),
                "remaining_shelf_life_days": result.remaining_days,
                "risk_level": str(result.risk_level),
                "confidence": round(result.confidence, 4),
            }
        )
    return points
