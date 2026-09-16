"""Image analysis, freshness and shelf-life endpoints."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status

from app.core.enums import Permission
from app.core.errors import NotFoundError, ValidationError
from app.deps import DbSession, RequestMeta, require_permissions
from app.freshness import service as freshness_service
from app.inventory import service as inventory_service
from app.ml.preprocessing.image_ops import validate_image_bytes
from app.ml.registry import get_registry
from app.models import FoodImage, FreshnessAssessment
from app.recommendations.engine import active_for_batch, serialise_recommendation
from app.repositories.food import BatchRepository, ImageRepository
from app.schemas.analysis import AnalysisRequest, AnalysisResponse, AssessmentOut
from app.services.storage_backend import build_storage_key, get_storage
from app.shelf_life import service as shelf_life_service

router = APIRouter(tags=["Analysis"])

DISCLAIMER = (
    "This is an AI estimate derived from image features and the storage data you "
    "supplied. It is not a laboratory measurement and must not be treated as a "
    "guarantee of food safety. Always confirm by physical inspection."
)


def _open_alerts_payload(db, batch_id: int) -> list[dict[str, Any]]:
    from sqlalchemy import select

    from app.models import Alert

    rows = db.scalars(
        select(Alert)
        .where(Alert.batch_id == batch_id, Alert.resolved.is_(False))
        .order_by(Alert.created_at.desc())
        .limit(10)
    ).all()
    return [
        {
            "id": a.id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "message": a.message,
            "created_at": a.created_at,
        }
        for a in rows
    ]


def _build_response(db, batch, assessment: FreshnessAssessment) -> AnalysisResponse:
    shelf_row = shelf_life_service.latest_for_batch(db, batch.id)
    return AnalysisResponse(
        assessment=AssessmentOut.model_validate(
            freshness_service.serialise_assessment(assessment)
        ),
        shelf_life=shelf_life_service.serialise(shelf_row) if shelf_row else None,
        recommendations=[serialise_recommendation(r) for r in active_for_batch(db, batch.id)],
        alerts_raised=_open_alerts_payload(db, batch.id),
        batch=inventory_service.serialise_batch(db, batch),
        analysis_label=get_registry().analysis_label(),
        disclaimer=DISCLAIMER,
    )


# ------------------------------------------------------------------ analysis
@router.post(
    "/analysis/image",
    response_model=AnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload an image and run the full freshness analysis",
    description=(
        "One-shot endpoint for the analysis workflow: uploads the image, runs the "
        "vision pipeline (colour, texture, spoilage detection), computes the weighted "
        "freshness score, predicts remaining shelf life, generates recommendations and "
        "raises any alerts.\n\n"
        "In DEMO_MODE the vision components are transparent OpenCV baselines - the "
        "response is labelled accordingly via `analysis_label` and `assessment.model`."
    ),
)
async def analyze_image(
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_CREATE))],
    batch_id: Annotated[int, Form(description="Batch being analysed")],
    file: Annotated[UploadFile | None, File(description="JPG/JPEG/PNG image")] = None,
    image_id: Annotated[int | None, Form(description="Re-analyse an existing image")] = None,
    temperature_c: Annotated[float | None, Form(ge=-40, le=80)] = None,
    humidity_pct: Annotated[float | None, Form(ge=0, le=100)] = None,
    air_circulation: Annotated[str | None, Form()] = None,
    light_exposure: Annotated[str | None, Form()] = None,
    packaging_type: Annotated[str | None, Form()] = None,
    storage_duration_days: Annotated[float | None, Form(ge=0, le=3650)] = None,
    notes: Annotated[str | None, Form(max_length=1000)] = None,
) -> AnalysisResponse:
    batch = BatchRepository(db).get_or_404(batch_id, "Batch")
    inventory_service.assert_batch_access(user, batch, db)

    storage = get_storage()
    image_row: FoodImage | None = None
    image_bytes: bytes | None = None

    if file is not None:
        data = await file.read()
        validate_image_bytes(data, file.content_type, file.filename)
        from app.ml.preprocessing.image_ops import decode

        _, (width, height) = decode(data)
        key = build_storage_key(file.filename or "analysis.jpg", owner_id=user.id)
        storage.save(key, data, file.content_type or "image/jpeg")

        image_row = FoodImage(
            batch_id=batch.id,
            uploaded_by_id=user.id,
            storage_key=key,
            storage_backend=storage.name,
            original_filename=(file.filename or "analysis.jpg")[:255],
            content_type=file.content_type or "image/jpeg",
            size_bytes=len(data),
            width=width,
            height=height,
            checksum_sha256=storage.checksum(data),
        )
        db.add(image_row)
        db.flush()
        image_bytes = data
    elif image_id is not None:
        image_row = ImageRepository(db).get_or_404(image_id, "Image")
        image_bytes = storage.read(image_row.storage_key)
    else:
        raise ValidationError(
            "Provide either an image file or an existing image_id.",
            code="IMAGE_REQUIRED",
        )

    assessment = freshness_service.analyze_batch(
        db,
        batch,
        image_bytes=image_bytes,
        image=image_row,
        temperature_c=temperature_c,
        humidity_pct=humidity_pct,
        air_circulation=air_circulation,
        light_exposure=light_exposure,
        packaging_type=packaging_type,
        storage_duration_days_override=storage_duration_days,
        user=user,
        notes=notes,
        request_meta=meta,
    )

    # The overlay is stored by the analysis service from the same pipeline run.
    db.commit()
    db.refresh(assessment)
    db.refresh(batch)
    return _build_response(db, batch, assessment)


@router.post(
    "/analysis/run",
    response_model=AnalysisResponse,
    summary="Run analysis on an already-uploaded image (JSON body)",
)
def analyze_existing(
    payload: AnalysisRequest,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_CREATE))],
) -> AnalysisResponse:
    batch = BatchRepository(db).get_or_404(payload.batch_id, "Batch")
    inventory_service.assert_batch_access(user, batch, db)

    image_bytes = None
    image_row = None
    if payload.image_id is not None:
        image_row = ImageRepository(db).get_or_404(payload.image_id, "Image")
        image_bytes = get_storage().read(image_row.storage_key)

    assessment = freshness_service.analyze_batch(
        db,
        batch,
        image_bytes=image_bytes,
        image=image_row,
        temperature_c=payload.temperature_c,
        humidity_pct=payload.humidity_pct,
        air_circulation=str(payload.air_circulation) if payload.air_circulation else None,
        light_exposure=str(payload.light_exposure) if payload.light_exposure else None,
        packaging_type=str(payload.packaging_type) if payload.packaging_type else None,
        storage_duration_days_override=payload.storage_duration_days,
        user=user,
        notes=payload.notes,
        request_meta=meta,
    )
    db.commit()
    db.refresh(assessment)
    db.refresh(batch)
    return _build_response(db, batch, assessment)


@router.get(
    "/analysis/{assessment_id}",
    response_model=AssessmentOut,
    summary="Retrieve a stored analysis",
    description="Reads the persisted result - inference is never re-run.",
)
def get_analysis(
    assessment_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_READ))],
) -> AssessmentOut:
    assessment = db.get(FreshnessAssessment, assessment_id)
    if assessment is None:
        raise NotFoundError("Analysis not found.", code="ASSESSMENT_NOT_FOUND")
    inventory_service.assert_batch_access(user, assessment.batch, db)
    return AssessmentOut.model_validate(freshness_service.serialise_assessment(assessment))


@router.get(
    "/analysis",
    response_model=list[AssessmentOut],
    summary="Recent analyses",
)
def list_analyses(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_READ))],
    limit: int = Query(default=20, ge=1, le=100),
    batch_id: int | None = None,
) -> list[AssessmentOut]:
    from sqlalchemy import select

    stmt = select(FreshnessAssessment).order_by(FreshnessAssessment.created_at.desc()).limit(limit)
    if batch_id is not None:
        stmt = stmt.where(FreshnessAssessment.batch_id == batch_id)
    rows = db.scalars(stmt).unique().all()
    return [
        AssessmentOut.model_validate(
            freshness_service.serialise_assessment(a, include_explanation=False)
        )
        for a in rows
    ]


# ----------------------------------------------------------------- freshness
@router.get(
    "/freshness/{batch_id}",
    response_model=dict,
    summary="Latest freshness assessment for a batch",
)
def batch_freshness(
    batch_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_READ))],
) -> dict:
    batch = BatchRepository(db).get_or_404(batch_id, "Batch")
    inventory_service.assert_batch_access(user, batch, db)
    assessment = freshness_service.latest_for_batch(db, batch_id)
    if assessment is None:
        return {
            "batch_id": batch_id,
            "assessment": None,
            "message": (
                "No freshness assessment yet. Upload an image and run an analysis to "
                "generate one."
            ),
            "analysis_label": get_registry().analysis_label(),
        }
    return {
        "batch_id": batch_id,
        "assessment": freshness_service.serialise_assessment(assessment),
        "history": [
            {
                "id": a.id,
                "freshness_score": a.freshness_score,
                "freshness_category": a.freshness_category,
                "created_at": a.created_at,
            }
            for a in freshness_service.history_for_batch(db, batch_id, 20)
        ],
        "analysis_label": get_registry().analysis_label(),
        "disclaimer": DISCLAIMER,
    }


@router.get(
    "/freshness/{batch_id}/trend",
    response_model=dict,
    summary="Freshness trend for a batch",
)
def batch_freshness_trend(
    batch_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_READ))],
) -> dict:
    batch = BatchRepository(db).get_or_404(batch_id, "Batch")
    inventory_service.assert_batch_access(user, batch, db)
    history = list(reversed(freshness_service.history_for_batch(db, batch_id, 60)))
    points = [
        {
            "created_at": a.created_at,
            "freshness_score": a.freshness_score,
            "freshness_category": a.freshness_category,
            "visual_score": a.visual_score,
            "storage_score": a.storage_score,
            "shelf_life_score": a.shelf_life_score,
            "product_age_score": a.product_age_score,
            "spoilage_probability": a.spoilage_probability,
        }
        for a in history
    ]
    delta = None
    if len(points) >= 2:
        delta = round(points[-1]["freshness_score"] - points[0]["freshness_score"], 2)
    return {
        "batch_id": batch_id,
        "points": points,
        "assessment_count": len(points),
        "score_change": delta,
        "direction": (
            "improving" if delta and delta > 2
            else "declining" if delta and delta < -2
            else "stable" if delta is not None else None
        ),
    }


# ---------------------------------------------------------------- shelf life
@router.get(
    "/shelf-life/{batch_id}",
    response_model=dict,
    summary="Shelf-life prediction for a batch",
    description="Returns the stored prediction plus its factor breakdown. Baseline "
    "predictions are clearly labelled as such.",
)
def batch_shelf_life(
    batch_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_READ))],
    refresh: bool = Query(
        default=False, description="Recompute from the current storage state."
    ),
) -> dict:
    batch = BatchRepository(db).get_or_404(batch_id, "Batch")
    inventory_service.assert_batch_access(user, batch, db)

    if refresh:
        row = shelf_life_service.predict_and_store(db, batch, user=user)
        db.commit()
        db.refresh(row)
    else:
        row = shelf_life_service.latest_for_batch(db, batch_id)

    if row is None:
        result = shelf_life_service.predict(db, batch)
        return {
            "batch_id": batch_id,
            "prediction": result.as_dict(),
            "stored": False,
            "message": "Computed on the fly; run an analysis to store a prediction.",
        }

    return {
        "batch_id": batch_id,
        "prediction": shelf_life_service.serialise(row),
        "stored": True,
        "summary": shelf_life_service.risk_summary(
            row.remaining_shelf_life_days, row.risk_level
        ),
        "history": [
            {
                "id": p.id,
                "remaining_shelf_life_days": p.remaining_shelf_life_days,
                "predicted_expiry_date": p.predicted_expiry_date,
                "risk_level": p.risk_level,
                "created_at": p.created_at,
            }
            for p in shelf_life_service.history_for_batch(db, batch_id, 20)
        ],
    }


@router.get(
    "/shelf-life/{batch_id}/projection",
    response_model=dict,
    summary="Shelf-life forward projection for a batch",
    description="Projects remaining shelf life day by day over the requested "
    "horizon by re-running the active shelf-life model with advancing storage "
    "duration and product age. Storage conditions are held constant at the "
    "latest recorded state.",
)
def batch_shelf_life_projection(
    batch_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_READ))],
    days: int = Query(
        default=14, ge=1, le=90, description="Projection horizon in days."
    ),
) -> dict:
    batch = BatchRepository(db).get_or_404(batch_id, "Batch")
    inventory_service.assert_batch_access(user, batch, db)
    return {
        "batch_id": batch_id,
        "horizon_days": max(1, min(int(days), 90)),
        "assumption": (
            "Storage conditions held constant at the latest recorded state; "
            "only time advances."
        ),
        "points": shelf_life_service.project_shelf_life(db, batch, days=days),
    }
