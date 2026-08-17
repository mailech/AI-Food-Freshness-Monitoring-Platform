from datetime import datetime, timezone
from typing import Any, Dict, List
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.modules.inventory.models import InventoryItem, Batch
from app.modules.image_analysis.models import ImageAnalysis
from app.modules.storage.models import StorageReading
from app.modules.scoring.service import calculate_item_health_score
from app.modules.recommendation.schemas import RecommendationResponse, BatchRecommendationSummary, ItemRecommendationSummary
from app.modules.shelf_life.service import FOOD_CATEGORY_CONSTANTS, get_environmental_defaults_by_location

async def generate_item_recommendations(db: AsyncSession, item: InventoryItem) -> RecommendationResponse:
    """
    Evaluates scoring reports, visual analyses, and sensor telemetry to generate
    targeted storage, consumption, FEFO inventory rotation, waste, and quality advisories.
    """
    now = datetime.now(timezone.utc)
    
    # 1. Fetch multi-factor scoring metrics
    health_rep = await calculate_item_health_score(db, item)
    score = health_rep.combined_health_score
    sub_scores = health_rep.breakdown

    # 2. Fetch latest telemetry and visual logs
    latest_reading = await StorageReading.find(
        StorageReading.item_id == str(item.id)
    ).sort(-StorageReading.recorded_at).first()

    latest_analysis = await ImageAnalysis.find(
        ImageAnalysis.item_id == str(item.id)
    ).sort(-ImageAnalysis.analyzed_at).first()

    # 3. Load category guidelines
    consts = FOOD_CATEGORY_CONSTANTS.get(item.category, FOOD_CATEGORY_CONSTANTS["Fruits"])
    ideal_temp = consts["ideal_temp"]
    ideal_humidity = consts["ideal_humidity"]

    if latest_reading:
        temp = latest_reading.temperature
        hum = latest_reading.humidity
    else:
        temp, hum = get_environmental_defaults_by_location(item.storage_location)

    temp_diff = temp - ideal_temp
    hum_diff = hum - ideal_humidity

    # --- Rule 1: Storage advisories ---
    storage_advisories: List[str] = []
    if abs(temp_diff) > 2.0:
        if temp_diff > 0:
            storage_advisories.append(
                f"Decrease refrigeration temperature. Current temp ({temp:.1f}°C) is above ideal ({ideal_temp}°C)."
            )
        else:
            storage_advisories.append(
                f"Increase refrigeration temperature slightly. Current temp ({temp:.1f}°C) is below ideal ({ideal_temp}°C) to prevent superficial freezing."
            )
            
    if abs(hum_diff) > 10.0:
        if hum_diff > 0:
            storage_advisories.append(
                f"Dehumidify environment. Humidity ({hum:.1f}%) is higher than optimal ({ideal_humidity}%) for mold protection."
            )
        else:
            storage_advisories.append(
                f"Humidify environment. Humidity ({hum:.1f}%) is lower than optimal ({ideal_humidity}%) risking product weight shrinkage."
            )

    # Packaging Upgrades suggestions
    pkg = item.packaging_type or "None"
    if item.category in ("Meat & Poultry", "Seafood") and pkg != "Vacuum Sealed":
        storage_advisories.append(
            "Upgrade packaging structure to 'Vacuum Sealed' to retard bacterial growth and extend shelf life."
        )
    elif item.category in ("Fruits", "Vegetables") and pkg not in ("Modified Atmosphere Packaging (MAP)", "Vacuum Sealed"):
        storage_advisories.append(
            "Upgrade packaging structure to 'Modified Atmosphere Packaging (MAP)' to slow physiological respiration rate."
        )

    if not storage_advisories:
        storage_advisories.append("Storage parameters and packaging methods are optimal.")

    # --- Rule 2: Consumption urgency advisories ---
    consumption_advisories: List[str] = []
    priority = "LOW"
    
    # Calculate predicted remaining days (estimated from shelf life sub-score)
    # Total ideal life * ratio
    from app.modules.shelf_life.service import PACKAGING_MODIFIERS
    pkg_mod = PACKAGING_MODIFIERS.get(pkg, 1.0)
    total_ideal = consts["base_shelf_life"] * pkg_mod
    est_remaining = (sub_scores.shelflife_score / 100.0) * total_ideal

    if est_remaining < 2.0 or score < 50.0:
        priority = "HIGH"
        consumption_advisories.append("CRITICAL: Consume or distribute immediately. Item is near expiration threshold.")
    elif est_remaining < 5.0 or score < 70.0:
        priority = "MEDIUM"
        consumption_advisories.append("Schedule for distribution and consumption within 48 hours to prevent quality loss.")
    else:
        consumption_advisories.append("Quality is stable. Follow standard distribution schedules.")

    # --- Rule 3: Inventory rotation suggestions (FIFO/FEFO) ---
    rotation_advisories: List[str] = []
    rotation_advisories.append(
        f"Distribute according to First-Expired, First-Out (FEFO). Remaining shelf life: {est_remaining:.1f} days."
    )
    
    # Override check: if quality is decaying faster than calendar days
    expiry_date = item.expiry_date.replace(tzinfo=timezone.utc) if item.expiry_date.tzinfo is None else item.expiry_date
    calendar_days_left = (expiry_date - now).total_seconds() / (24 * 3600)
    
    if est_remaining < (calendar_days_left - 1.5) and priority != "LOW":
        rotation_advisories.append(
            "ALERT: Freshness decay rate is exceeding standard calendar expiration decay. "
            "Override standard FIFO lot queue and dispatch this item ahead of older stock to minimize waste."
        )

    # --- Rule 4: Waste reduction recommendations ---
    waste_advisories: List[str] = []
    if score < 30.0:
        waste_advisories.append(
            "Product has deteriorated below acceptable safety limits. Route to organic composting or dedicated waste bin."
        )
    elif score < 60.0:
        if item.category in ("Fruits", "Vegetables"):
            waste_advisories.append(
                "Near-expiry item: Repurpose immediately for pre-prepared foods (smoothies, purees, soups) or freeze-preserve."
            )
        elif item.category == "Dairy Products":
            waste_advisories.append(
                "Near-expiry item: Prioritize for hot baking or cooking applications to pasteurize."
            )
        elif item.category in ("Meat & Poultry", "Seafood"):
            waste_advisories.append(
                "Near-expiry item: Repurpose into cooked ready-to-eat meals or flash-freeze immediately."
            )
        else:
            waste_advisories.append(
                "Apply 50% discount to clear stock or donate to local charity food banks immediately."
            )
    else:
        waste_advisories.append("No waste mitigation needed. Product quality is compliant.")

    # --- Rule 5: Quality improvement suggestions ---
    quality_advisories: List[str] = []
    if latest_analysis:
        if latest_analysis.color_degradation > 0.3:
            quality_advisories.append(
                "Color degradation observed. Diminish light exposure or use nitrogen gas flushing to prevent browning oxidation."
            )
        if latest_analysis.texture_roughness > 0.3:
            quality_advisories.append(
                "Surface wrinkling indicates cell dehydration. Maintain storage relative humidity closer to optimal bounds."
            )
        if latest_analysis.bruising_detected or latest_analysis.damage_detected:
            quality_advisories.append(
                "Physical bruising/damage detected. Padded crates required. Train handlers to reduce stack loading heights."
            )
            
    if latest_reading:
        if item.category in ("Fruits", "Vegetables") and latest_reading.air_circulation == "Low":
            quality_advisories.append(
                "Air circulation is Low. Increase mechanical fan speeds to dilute ethylene pockets (ripening hormone)."
            )
        if item.category in ("Fruits", "Vegetables", "Dairy Products", "Meat & Poultry", "Seafood") and latest_reading.light_exposure in ("Medium", "High"):
            quality_advisories.append(
                f"Excessive light exposure ({latest_reading.light_exposure}). Photo-oxidation risks fat rancidity. Cover shelf units."
            )

    if not quality_advisories:
        quality_advisories.append("Product handles safely with no active quality warnings.")

    return RecommendationResponse(
        item_id=str(item.id),
        item_name=item.name,
        priority_level=priority,
        storage_advisories=storage_advisories,
        consumption_advisories=consumption_advisories,
        rotation_advisories=rotation_advisories,
        waste_reduction_advisories=waste_advisories,
        quality_improvement_advisories=quality_advisories
    )

async def generate_batch_recommendations(db: AsyncSession, batch_id: uuid.UUID) -> BatchRecommendationSummary:
    """
    Summarizes high priority warnings and rotation flags for an entire supply lot.
    """
    # 1. Fetch batch
    stmt_batch = select(Batch).where(Batch.id == batch_id)
    res_batch = await db.execute(stmt_batch)
    batch = res_batch.scalar_one_or_none()
    if not batch:
        raise ValueError("Batch not found")

    # 2. Fetch all items in batch
    stmt_items = select(InventoryItem).where(InventoryItem.batch_id == batch_id)
    res_items = await db.execute(stmt_items)
    items = res_items.scalars().all()

    if not items:
        return BatchRecommendationSummary(
            batch_id=str(batch.id),
            batch_number=batch.batch_number,
            item_count=0,
            high_priority_count=0,
            recommendations_summary=["No items logged in this batch. Storage holds are empty."],
            items=[]
        )

    item_summaries: List[ItemRecommendationSummary] = []
    high_priority_count = 0
    overrides_triggered = 0

    for item in items:
        recs = await generate_item_recommendations(db, item)
        item_summaries.append(ItemRecommendationSummary(
            item_id=str(item.id),
            item_name=item.name,
            priority_level=recs.priority_level
        ))
        if recs.priority_level == "HIGH":
            high_priority_count += 1
        
        # Check if FEFO overrides are active for this item
        if any("override" in adv.lower() for adv in recs.rotation_advisories):
            overrides_triggered += 1

    summary_statements: List[str] = []
    if high_priority_count > 0:
        summary_statements.append(
            f"CRITICAL ACTION REQUIRED: {high_priority_count} out of {len(items)} items in batch LOT {batch.batch_number} show near-spoilage risks."
        )
    else:
        summary_statements.append("Batch lot is in stable condition. Continue planned compliance monitoring.")

    if overrides_triggered > 0:
        summary_statements.append(
            f"FEFO OVERRIDES TRIGGERED: {overrides_triggered} items are decaying faster than calendar limits. Accelerate dispatch queues."
        )

    return BatchRecommendationSummary(
        batch_id=str(batch.id),
        batch_number=batch.batch_number,
        item_count=len(items),
        high_priority_count=high_priority_count,
        recommendations_summary=summary_statements,
        items=item_summaries
    )
