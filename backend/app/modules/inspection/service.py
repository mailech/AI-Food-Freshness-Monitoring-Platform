import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.modules.inspection.models import QualityInspection, InspectionStatus
from app.modules.inspection.schemas import InspectionCreate, InspectionUpdate, InspectorDashboardSummary, InspectionResponse
from app.modules.user.models import User
from app.modules.inventory.models import InventoryItem, Batch
from app.modules.shelf_life.service import predict_shelf_life_kinetics, FOOD_CATEGORY_CONSTANTS, PACKAGING_MODIFIERS

async def create_quality_inspection(
    db: AsyncSession,
    inspector_id: uuid.UUID,
    payload: InspectionCreate,
    image_url: Optional[str] = None,
    ai_analysis_data: Optional[Dict[str, Any]] = None
) -> QualityInspection:
    """
    Executes a quality inspection by fusing image analysis results, storage parameters,
    shelf-life estimations, and inspector feedback into a QualityInspection record.
    """
    # 1. Process AI Image Analysis if provided
    ai_class = "FRESH"
    ai_conf = 0.90
    visual_score = 95.0
    mold = False
    bruising = False
    damage = False
    color_deg = 0.0
    texture_rough = 0.0

    if ai_analysis_data:
        ai_class = ai_analysis_data.get("classification_label", "FRESH")
        ai_conf = ai_analysis_data.get("confidence", 0.90)
        visual_score = ai_analysis_data.get("freshness_score", 95.0)
        mold = ai_analysis_data.get("mold_detected", False)
        bruising = ai_analysis_data.get("bruising_detected", False)
        damage = ai_analysis_data.get("damage_detected", False)
        color_deg = ai_analysis_data.get("color_degradation", 0.0)
        texture_rough = ai_analysis_data.get("texture_roughness", 0.0)

    # 2. Predict shelf-life using the 6 mandatory inputs
    pred = predict_shelf_life_kinetics(
        category=payload.category,
        packaging=payload.packaging_type,
        temperature=payload.storage_temperature,
        humidity=payload.humidity,
        storage_duration_days=payload.storage_duration_days,
        visual_freshness_score=visual_score
    )

    remaining_days = pred["predicted_remaining_shelf_life_days"]

    # 3. Compute combined freshness score & 5 quality categories
    consts = FOOD_CATEGORY_CONSTANTS.get(payload.category, FOOD_CATEGORY_CONSTANTS["Fruits"])
    pkg_mod = PACKAGING_MODIFIERS.get(payload.packaging_type, 1.0)
    total_ideal = consts["base_shelf_life"] * pkg_mod

    shelflife_score = max(0.0, min(100.0, (remaining_days / max(1.0, total_ideal)) * 100.0))
    
    t_dev = abs(payload.storage_temperature - consts["ideal_temp"])
    rh_dev = abs(payload.humidity - consts["ideal_humidity"])
    storage_score = max(0.0, 100.0 - min(50.0, t_dev * 10.0) - min(30.0, rh_dev * 1.5))
    
    age_score = max(0.0, 100.0 - (payload.storage_duration_days / max(1.0, total_ideal)) * 100.0)

    if mold:
        combined_score = 0.0
    else:
        combined_score = (0.40 * visual_score) + (0.25 * storage_score) + (0.20 * shelflife_score) + (0.15 * age_score)
        combined_score = max(0.0, min(100.0, combined_score))

    # Quality classification mapping
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

    # 4. Auto-determine action if not explicitly given
    action = payload.action_taken
    if not action:
        if payload.status == InspectionStatus.PASSED:
            action = "APPROVED FOR RETAIL & STORAGE"
        elif payload.status == InspectionStatus.QUARANTINED:
            action = "QUARANTINED FOR MOLD/DAMAGE"
        elif payload.status == InspectionStatus.WARNING:
            action = "APPLY 50% MARKDOWN & FAST DISPATCH"
        elif payload.status == InspectionStatus.REJECTED:
            action = "ROUTE TO COMPOSTING / DISPOSAL"
        else:
            action = "PENDING REVIEW"

    inspection = QualityInspection(
        item_id=payload.item_id,
        batch_id=payload.batch_id,
        inspector_id=inspector_id,
        product_name=payload.product_name,
        category=payload.category,
        packaging_type=payload.packaging_type,
        storage_location=payload.storage_location,
        storage_temperature=payload.storage_temperature,
        humidity=payload.humidity,
        air_circulation=payload.air_circulation,
        light_exposure=payload.light_exposure,
        storage_duration_days=payload.storage_duration_days,
        image_url=image_url,
        ai_predicted_class=ai_class,
        ai_confidence=ai_conf,
        freshness_score=round(combined_score, 1),
        predicted_shelf_life_days=round(remaining_days, 1),
        quality_classification=classification,
        mold_detected=mold,
        bruising_detected=bruising,
        damage_detected=damage,
        color_degradation=color_deg,
        texture_roughness=texture_rough,
        status=payload.status,
        remarks=payload.remarks or f"Inspection complete. Status: {payload.status.value}",
        action_taken=action
    )

    db.add(inspection)
    await db.commit()
    await db.refresh(inspection)
    return inspection

async def get_inspection_by_id(db: AsyncSession, inspection_id: uuid.UUID) -> Optional[QualityInspection]:
    stmt = select(QualityInspection).where(QualityInspection.id == inspection_id)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()

async def list_inspections(
    db: AsyncSession,
    status: Optional[InspectionStatus] = None,
    category: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> List[QualityInspection]:
    stmt = select(QualityInspection)
    if status:
        stmt = stmt.where(QualityInspection.status == status)
    if category:
        stmt = stmt.where(QualityInspection.category == category)
    stmt = stmt.order_by(QualityInspection.inspected_at.desc()).limit(limit).offset(offset)
    res = await db.execute(stmt)
    return list(res.scalars().all())

async def update_quality_inspection(
    db: AsyncSession,
    inspection_id: uuid.UUID,
    payload: InspectionUpdate
) -> Optional[QualityInspection]:
    inspection = await get_inspection_by_id(db, inspection_id)
    if not inspection:
        return None
    
    if payload.status:
        inspection.status = payload.status
    if payload.remarks:
        inspection.remarks = payload.remarks
    if payload.action_taken:
        inspection.action_taken = payload.action_taken

    await db.commit()
    await db.refresh(inspection)
    return inspection

async def get_inspector_dashboard_summary(db: AsyncSession) -> InspectorDashboardSummary:
    stmt = select(QualityInspection).order_by(QualityInspection.inspected_at.desc())
    res = await db.execute(stmt)
    all_inspections = list(res.scalars().all())

    total = len(all_inspections)
    pending = sum(1 for i in all_inspections if i.status == InspectionStatus.PENDING)
    passed = sum(1 for i in all_inspections if i.status == InspectionStatus.PASSED)
    warning = sum(1 for i in all_inspections if i.status == InspectionStatus.WARNING)
    quarantined = sum(1 for i in all_inspections if i.status in (InspectionStatus.QUARANTINED, InspectionStatus.REJECTED))

    fresh = sum(1 for i in all_inspections if i.quality_classification == "Fresh")
    good = sum(1 for i in all_inspections if i.quality_classification == "Good")
    acceptable = sum(1 for i in all_inspections if i.quality_classification == "Acceptable")
    near_spoilage = sum(1 for i in all_inspections if i.quality_classification == "Near Spoilage")
    spoiled = sum(1 for i in all_inspections if i.quality_classification == "Spoiled")

    # Fetch inspector names for recent inspections
    recent_responses: List[InspectionResponse] = []
    for ins in all_inspections[:10]:
        resp = InspectionResponse.model_validate(ins)
        stmt_u = select(User).where(User.id == ins.inspector_id)
        u_res = await db.execute(stmt_u)
        user = u_res.scalar_one_or_none()
        if user:
            resp.inspector_name = user.full_name or user.email
        recent_responses.append(resp)

    return InspectorDashboardSummary(
        total_inspections=total,
        pending_inspections=pending,
        passed_inspections=passed,
        warning_inspections=warning,
        quarantined_inspections=quarantined,
        fresh_count=fresh,
        good_count=good,
        acceptable_count=acceptable,
        near_spoilage_count=near_spoilage,
        spoiled_count=spoiled,
        recent_inspections=recent_responses
    )
