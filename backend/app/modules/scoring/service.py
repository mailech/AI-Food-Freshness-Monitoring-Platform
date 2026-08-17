from datetime import datetime, timezone
from typing import Any, Dict, List
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.modules.inventory.models import InventoryItem, Batch
from app.modules.image_analysis.models import ImageAnalysis
from app.modules.storage.models import StorageReading
from app.modules.scoring.schemas import ScoreBreakdown, ItemHealthScoreResponse, BatchHealthScoreResponse, BatchItemHealth
from app.modules.shelf_life.service import (
    FOOD_CATEGORY_CONSTANTS,
    PACKAGING_MODIFIERS,
    get_environmental_defaults_by_location,
    predict_shelf_life_kinetics
)

async def calculate_item_health_score(db: AsyncSession, item: InventoryItem) -> ItemHealthScoreResponse:
    """
    Computes visual, storage compliance, shelf life, and age sub-scores.
    Blends them into an overall health rating with mold overriding.
    """
    now = datetime.now(timezone.utc)
    entry = item.entry_date.replace(tzinfo=timezone.utc) if item.entry_date.tzinfo is None else item.entry_date
    expiry = item.expiry_date.replace(tzinfo=timezone.utc) if item.expiry_date.tzinfo is None else item.expiry_date

    # 1. Fetch latest image analysis for Visual Score
    latest_analysis = await ImageAnalysis.find(
        ImageAnalysis.item_id == str(item.id)
    ).sort(-ImageAnalysis.analyzed_at).first()

    mold_detected = False
    if latest_analysis:
        VS = latest_analysis.freshness_score
        B = latest_analysis.color_degradation
        R = latest_analysis.texture_roughness
        Br = 1.0 if latest_analysis.bruising_detected else 0.0
        D = 1.0 if latest_analysis.damage_detected else 0.0
        M = 1.0 if latest_analysis.mold_detected else 0.0
        
        visual_score = (1.0 - M) * (VS - B * 20.0 - R * 15.0 - Br * 10.0 - D * 10.0)
        visual_score = max(0.0, min(100.0, visual_score))
        mold_detected = latest_analysis.mold_detected
    else:
        visual_score = 100.0

    # 2. Fetch latest storage reading for Storage Score
    latest_reading = await StorageReading.find(
        StorageReading.item_id == str(item.id)
    ).sort(-StorageReading.recorded_at).first()

    if latest_reading:
        consts = FOOD_CATEGORY_CONSTANTS.get(item.category, FOOD_CATEGORY_CONSTANTS["Fruits"])
        t_dev = abs(latest_reading.temperature - consts["ideal_temp"])
        rh_dev = abs(latest_reading.humidity - consts["ideal_humidity"])
        
        temp_penalty = min(50.0, t_dev * 10.0)
        hum_penalty = min(30.0, rh_dev * 1.5)
        
        circ_penalty = 10.0 if (item.category in ("Fruits", "Vegetables") and latest_reading.air_circulation == "Low") else 0.0
        light_penalty = 10.0 if (item.category in ("Fruits", "Vegetables", "Dairy Products", "Meat & Poultry", "Seafood") and latest_reading.light_exposure in ("Medium", "High")) else 0.0
        
        storage_score = max(0.0, 100.0 - temp_penalty - hum_penalty - circ_penalty - light_penalty)
    else:
        storage_score = 100.0

    # 3. Predict shelf life dynamically for Shelf Life Score
    if latest_reading:
        temp = latest_reading.temperature
        hum = latest_reading.humidity
    else:
        temp, hum = get_environmental_defaults_by_location(item.storage_location)

    elapsed_days = max(0.0, (now - entry).total_seconds() / (24 * 3600))
    pred = predict_shelf_life_kinetics(
        item.category,
        item.packaging_type or "None",
        temp,
        hum,
        elapsed_days,
        visual_score
    )

    consts = FOOD_CATEGORY_CONSTANTS.get(item.category, FOOD_CATEGORY_CONSTANTS["Fruits"])
    pkg_mod = PACKAGING_MODIFIERS.get(item.packaging_type or "None", 1.0)
    total_ideal = consts["base_shelf_life"] * pkg_mod
    
    remaining_days = pred["predicted_remaining_shelf_life_days"]
    shelflife_score = max(0.0, min(100.0, (remaining_days / total_ideal) * 100.0))

    # 4. Product Age Score (representing pure age decay progress)
    total_allotted = (expiry - entry).total_seconds() / (24 * 3600)
    if total_allotted <= 0:
        age_score = 0.0
    else:
        remaining_days_allotted = (expiry - now).total_seconds() / (24 * 3600)
        age_score = max(0.0, min(100.0, (remaining_days_allotted / total_allotted) * 100.0))

    # 5. Combined Score calculation with Safety overrides (Mold yields 0.0)
    from app.core.config import settings
    if mold_detected:
        combined_score = 0.0
    else:
        combined_score = (
            settings.FRESHNESS_VISUAL_WEIGHT * visual_score +
            settings.FRESHNESS_STORAGE_WEIGHT * storage_score +
            settings.FRESHNESS_SHELF_WEIGHT * shelflife_score +
            settings.FRESHNESS_AGE_WEIGHT * age_score
        )
        combined_score = max(0.0, min(100.0, combined_score))

    # 6. Quality Status classification
    if combined_score >= 85.0:
        classification = "Fresh"
    elif combined_score >= 70.0:
        classification = "Good"
    elif combined_score >= 50.0:
        classification = "Acceptable"
    elif combined_score >= 30.0:
        classification = "Near Spoilage"
    else:
        classification = "Spoiled"

    # 7. Confidence score
    confidence_score = 50.0
    if latest_analysis:
        confidence_score += 30.0
    if latest_reading:
        confidence_score += 20.0

    return ItemHealthScoreResponse(
        item_id=str(item.id),
        item_name=item.name,
        combined_health_score=round(combined_score, 1),
        quality_classification=classification,
        confidence_score=confidence_score,
        breakdown=ScoreBreakdown(
            visual_score=round(visual_score, 1),
            storage_score=round(storage_score, 1),
            shelflife_score=round(shelflife_score, 1),
            age_score=round(age_score, 1)
        ),
        recorded_at=now
    )

async def calculate_batch_health_score(db: AsyncSession, batch_id: uuid.UUID) -> BatchHealthScoreResponse:
    """
    Retrieves all items belonging to a supply batch.
    Computes mean average scores and returns details.
    """
    # 1. Fetch batch info
    stmt_batch = select(Batch).where(Batch.id == batch_id)
    res_batch = await db.execute(stmt_batch)
    batch = res_batch.scalar_one_or_none()
    if not batch:
        raise ValueError("Batch not found")

    # 2. Fetch all inventory items inside batch
    stmt_items = select(InventoryItem).where(InventoryItem.batch_id == batch_id)
    res_items = await db.execute(stmt_items)
    items = res_items.scalars().all()

    if not items:
        return BatchHealthScoreResponse(
            batch_id=str(batch.id),
            batch_number=batch.batch_number,
            item_count=0,
            average_health_score=100.0,
            quality_classification="Fresh",
            items=[]
        )

    batch_items_health: List[BatchItemHealth] = []
    total_score = 0.0

    for item in items:
        item_rep = await calculate_item_health_score(db, item)
        total_score += item_rep.combined_health_score
        batch_items_health.append(BatchItemHealth(
            item_id=str(item.id),
            item_name=item.name,
            combined_health_score=item_rep.combined_health_score,
            quality_classification=item_rep.quality_classification
        ))

    avg_score = total_score / len(items)

    if avg_score >= 85.0:
        classification = "Fresh"
    elif avg_score >= 70.0:
        classification = "Good"
    elif avg_score >= 50.0:
        classification = "Acceptable"
    elif avg_score >= 30.0:
        classification = "Near Spoilage"
    else:
        classification = "Spoiled"

    return BatchHealthScoreResponse(
        batch_id=str(batch.id),
        batch_number=batch.batch_number,
        item_count=len(items),
        average_health_score=round(avg_score, 1),
        quality_classification=classification,
        items=batch_items_health
    )
