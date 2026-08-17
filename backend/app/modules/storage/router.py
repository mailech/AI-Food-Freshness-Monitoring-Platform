import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.modules.user.models import User
from app.modules.inventory.service import get_item_by_id
from app.modules.storage.models import StorageReading
from app.modules.storage.schemas import StorageReadingCreate, StorageComplianceReport
from app.modules.storage.service import evaluate_storage_compliance

router = APIRouter()

@router.post("/reading", response_model=StorageComplianceReport, status_code=status.HTTP_201_CREATED)
async def record_storage_reading(
    req: StorageReadingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Ingest a new storage environment telemetry reading.
    Validates compliance against food category guidelines and returns advisories.
    """
    # 1. Verify item exists in database
    item_id = uuid.UUID(req.item_id)
    item = await get_item_by_id(db, item_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )

    # 2. Check Role-based authorization
    if current_user.role not in ("RETAIL_MANAGER", "WAREHOUSE_OPERATOR", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to warehouse managers or admins."
        )

    # 3. Create Beanie Document log
    reading = StorageReading(
        item_id=str(item.id),
        warehouse_zone=item.storage_location or "Warehouse Zone Alpha",
        temperature=req.temperature,
        humidity=req.humidity,
        air_circulation=req.air_circulation,
        light_exposure=req.light_exposure,
        recorded_at=datetime.now(timezone.utc)
    )
    await reading.insert()

    # 4. Generate Compliance report
    report = evaluate_storage_compliance(item, reading)

    if report.compliance_status in ("WARNING", "CRITICAL"):
        from app.modules.notification.service import NotificationService
        from app.modules.notification.schemas import NotificationCreate
        
        # Dispatch to WAREHOUSE_OPERATOR and RETAIL_MANAGER
        await NotificationService.create_notification(NotificationCreate(
            role="WAREHOUSE_OPERATOR",
            title=f"Climate Deviation Alert: {report.compliance_status}",
            message=f"Zone '{reading.warehouse_zone}' for item '{item.name}' reports temp={reading.temperature}°C, hum={reading.humidity}% RH.",
            type="storage"
        ))
        await NotificationService.create_notification(NotificationCreate(
            role="RETAIL_MANAGER",
            title=f"Climate Deviation Alert: {report.compliance_status}",
            message=f"Item '{item.name}' in zone '{reading.warehouse_zone}' has non-compliant storage metrics.",
            type="storage"
        ))

    return report

@router.get("/item/{item_id}", response_model=StorageComplianceReport)
async def get_item_storage_report(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get the latest telemetry reading and compliance report for an inventory item.
    """
    item = await get_item_by_id(db, item_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )

    # Fetch latest Beanie reading
    latest = await StorageReading.find(
        StorageReading.item_id == str(item.id)
    ).sort(-StorageReading.recorded_at).first()

    if not latest:
        # Generate default compliant report if no manual logs registered yet
        from app.modules.shelf_life.service import FOOD_CATEGORY_CONSTANTS, get_environmental_defaults_by_location
        consts = FOOD_CATEGORY_CONSTANTS.get(item.category, FOOD_CATEGORY_CONSTANTS["Fruits"])
        t_def, h_def = get_environmental_defaults_by_location(item.storage_location)
        
        latest = StorageReading(
            item_id=str(item.id),
            warehouse_zone=item.storage_location or "General Zone",
            temperature=t_def,
            humidity=h_def,
            air_circulation="Medium",
            light_exposure="Low",
            recorded_at=datetime.now(timezone.utc)
        )

    report = evaluate_storage_compliance(item, latest)
    return report

@router.get("/item/{item_id}/history", response_model=List[Dict[str, Any]])
async def get_item_storage_history(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get the past 10 telemetry readings recorded for this inventory item.
    """
    item = await get_item_by_id(db, item_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )

    readings = await StorageReading.find(
        StorageReading.item_id == str(item.id)
    ).sort(-StorageReading.recorded_at).limit(10).to_list()

    return [
        {
            "id": str(r.id),
            "temperature": r.temperature,
            "humidity": r.humidity,
            "air_circulation": r.air_circulation,
            "light_exposure": r.light_exposure,
            "recorded_at": r.recorded_at
        }
        for r in readings
    ]
