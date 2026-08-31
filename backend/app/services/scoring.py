"""Shared per-item state gathering used by scoring and recommendation flows."""

from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.ml.freshness_score import compute_composite_score, storage_subscore
from app.ml.shelf_life import IDEAL_STORAGE, predict_shelf_life
from app.ml.storage import evaluate_reading
from app.models.images import Assessment
from app.models.inventory import Batch, FoodItem
from app.models.storage import StorageReading


def gather_item_state(db: Session, item: FoodItem) -> dict:
    """Load latest signals for an item and derive scores/predictions."""
    assessment = (
        db.query(Assessment)
        .filter(Assessment.item_id == item.id)
        .order_by(Assessment.assessed_at.desc())
        .first()
    )
    reading = (
        db.query(StorageReading)
        .filter(StorageReading.item_id == item.id)
        .order_by(StorageReading.recorded_at.desc())
        .first()
    )
    batches = (
        db.query(Batch)
        .filter(Batch.item_id == item.id)
        .order_by(Batch.received_date.asc())
        .all()
    )

    storage_score = None
    compliance = None
    flags = {
        "temperature_violation": False,
        "humidity_violation": False,
        "light_exposure": None,
        "air_circulation": None,
    }
    if reading is not None:
        ideal = IDEAL_STORAGE.get(item.category.name)
        flags["temperature_violation"] = (
            ideal is not None
            and reading.temperature_c is not None
            and not (ideal[0] <= reading.temperature_c <= ideal[1])
        )
        flags["humidity_violation"] = (
            ideal is not None
            and reading.humidity_pct is not None
            and not (ideal[2] <= reading.humidity_pct <= ideal[3])
        )
        flags["light_exposure"] = reading.light_exposure
        flags["air_circulation"] = reading.air_circulation
        storage_score, _ = storage_subscore(**flags)
        compliant, violations, recommendations = evaluate_reading(item.category.name, reading)
        compliance = {
            "compliant": compliant,
            "violations": violations,
            "recommendations": recommendations,
        }

    prediction = predict_shelf_life(
        item.category.name,
        freshness_score=assessment.freshness_score if assessment else None,
        assessed_at=assessment.assessed_at if assessment else None,
        packaging_type=item.packaging_type,
        temperature_c=reading.temperature_c if reading else None,
        humidity_pct=reading.humidity_pct if reading else None,
    )

    first_batch = batches[0] if batches else None
    age_days = None
    if first_batch is not None:
        age_days = max(0, (date.today() - first_batch.received_date).days)
    elif item.created_at is not None:
        start = item.created_at if item.created_at.tzinfo else item.created_at.replace(tzinfo=timezone.utc)
        age_days = max(0, (datetime.now(timezone.utc) - start).days)

    remaining_ratio = (
        prediction.remaining_days / prediction.base_shelf_life_days
        if prediction.base_shelf_life_days
        else 0.0
    )
    age_ratio = age_days / prediction.base_shelf_life_days if prediction.base_shelf_life_days else 0.0

    composite = compute_composite_score(
        visual_score=assessment.freshness_score if assessment else None,
        cnn_confidence=assessment.confidence if assessment else None,
        storage_score=storage_score,
        remaining_ratio=max(0.0, remaining_ratio),
        age_ratio=age_ratio,
    )

    return {
        "item": item,
        "assessment": assessment,
        "reading": reading,
        "batches": batches,
        "storage_score": storage_score,
        "flags": flags,
        "compliance": compliance,
        "prediction": prediction,
        "age_days": age_days,
        "composite": composite,
    }
