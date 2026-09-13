from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models.entities import FoodItem, Batch, StorageLocation, FreshnessScan, Alert, Recommendation, AuditLog, User
from app.schemas.all_schemas import FoodItemCreate, FoodItemUpdate, FoodItemOut, BatchCreate, BatchUpdate, BatchOut
from app.api.dependencies import get_current_user, require_role
from app.ml.scoring_engine import CATEGORY_STORAGE_STANDARDS
from app.ml.shelf_life_engine import KineticShelfLifeEngine

router = APIRouter(prefix="/inventory", tags=["Inventory Management"])

@router.get("/categories")
def get_categories():
    return [
        {
            "name": name,
            "ideal_temp_min": data["temp_min"],
            "ideal_temp_max": data["temp_max"],
            "ideal_humidity_min": data["humidity_min"],
            "ideal_humidity_max": data["humidity_max"],
            "base_shelf_life_days": data["base_shelf_life"]
        }
        for name, data in CATEGORY_STORAGE_STANDARDS.items()
    ]

@router.get("/items", response_model=List[FoodItemOut])
def list_food_items(
    category: Optional[str] = None,
    storage_location_id: Optional[int] = None,
    quality_category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(FoodItem)
    
    if current_user.role == "consumer":
        # Consumer sees their own items or general household items
        query = query.filter((FoodItem.user_id == current_user.id) | (FoodItem.user_id == None))
        
    if category:
        query = query.filter(FoodItem.category == category)
    if storage_location_id:
        query = query.filter(FoodItem.storage_location_id == storage_location_id)
    if quality_category:
        query = query.filter(FoodItem.quality_category == quality_category)
    if status_filter:
        query = query.filter(FoodItem.status == status_filter)
    if search:
        query = query.filter(FoodItem.name.ilike(f"%{search}%"))
        
    items = query.order_by(FoodItem.current_freshness_score.asc()).offset(skip).limit(limit).all()
    
    # Enrich with dynamic shelf life and relations
    results = []
    for item in items:
        loc_name = item.storage_location.name if item.storage_location else "Unassigned"
        batch_no = item.batch.batch_number if item.batch else None
        
        # Calculate dynamic remaining days
        remaining = 7.0
        if item.estimated_expiry_date:
            delta = item.estimated_expiry_date - datetime.utcnow()
            remaining = max(0.0, round(delta.total_seconds() / 86400.0, 1))
            
        out = FoodItemOut(
            id=item.id,
            name=item.name,
            category=item.category,
            batch_id=item.batch_id,
            storage_location_id=item.storage_location_id,
            quantity=item.quantity,
            unit=item.unit,
            packaging_type=item.packaging_type,
            initial_freshness_score=item.initial_freshness_score,
            current_freshness_score=item.current_freshness_score,
            quality_category=item.quality_category,
            harvest_date=item.harvest_date,
            purchase_date=item.purchase_date,
            estimated_expiry_date=item.estimated_expiry_date,
            days_stored=item.days_stored,
            status=item.status,
            image_url=item.image_url,
            created_at=item.created_at,
            updated_at=item.updated_at,
            remaining_shelf_life_days=remaining,
            storage_location_name=loc_name,
            batch_number=batch_no
        )
        results.append(out)
    return results

@router.post("/items", response_model=FoodItemOut, status_code=status.HTTP_201_CREATED)
def create_food_item(
    item_in: FoodItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Calculate initial expiry forecast
    std = CATEGORY_STORAGE_STANDARDS.get(item_in.category, CATEGORY_STORAGE_STANDARDS['Fruits'])
    pred = KineticShelfLifeEngine.predict_shelf_life(
        category=item_in.category,
        current_freshness_score=item_in.initial_freshness_score,
        storage_temperature=3.0,
        storage_humidity=90.0,
        packaging_type=item_in.packaging_type,
        days_stored=item_in.days_stored
    )
    
    expiry = item_in.estimated_expiry_date or pred['predicted_expiry_date']
    
    item = FoodItem(
        name=item_in.name,
        category=item_in.category,
        batch_id=item_in.batch_id,
        storage_location_id=item_in.storage_location_id,
        user_id=current_user.id,
        quantity=item_in.quantity,
        unit=item_in.unit,
        packaging_type=item_in.packaging_type,
        initial_freshness_score=item_in.initial_freshness_score,
        current_freshness_score=item_in.current_freshness_score,
        quality_category=item_in.quality_category,
        harvest_date=item_in.harvest_date or datetime.utcnow(),
        purchase_date=item_in.purchase_date or datetime.utcnow(),
        estimated_expiry_date=expiry,
        days_stored=item_in.days_stored,
        status=item_in.status or "active",
        image_url=item_in.image_url
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="ITEM_CREATED",
        entity_type="FoodItem",
        entity_id=item.id,
        details=f"Added {item.name} ({item.category}, {item.quantity} {item.unit})"
    )
    db.add(audit)
    db.commit()
    
    return FoodItemOut(
        id=item.id,
        name=item.name,
        category=item.category,
        batch_id=item.batch_id,
        storage_location_id=item.storage_location_id,
        quantity=item.quantity,
        unit=item.unit,
        packaging_type=item.packaging_type,
        initial_freshness_score=item.initial_freshness_score,
        current_freshness_score=item.current_freshness_score,
        quality_category=item.quality_category,
        harvest_date=item.harvest_date,
        purchase_date=item.purchase_date,
        estimated_expiry_date=item.estimated_expiry_date,
        days_stored=item.days_stored,
        status=item.status,
        image_url=item.image_url,
        created_at=item.created_at,
        updated_at=item.updated_at,
        remaining_shelf_life_days=pred['adjusted_shelf_life_days']
    )

@router.get("/items/{item_id}")
def get_food_item_detail(item_id: int, db: Session = Depends(get_db)):
    item = db.query(FoodItem).filter(FoodItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        
    scans = db.query(FreshnessScan).filter(FreshnessScan.food_item_id == item_id).order_by(FreshnessScan.scan_timestamp.desc()).all()
    alerts = db.query(Alert).filter(Alert.food_item_id == item_id).all()
    recommendations = db.query(Recommendation).filter(Recommendation.food_item_id == item_id).all()
    
    return {
        "item": item,
        "scans": scans,
        "alerts": alerts,
        "recommendations": recommendations,
        "storage_location": item.storage_location,
        "batch": item.batch
    }

@router.put("/items/{item_id}", response_model=FoodItemOut)
def update_food_item(
    item_id: int,
    update_in: FoodItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(FoodItem).filter(FoodItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        
    for k, v in update_in.dict(exclude_unset=True).items():
        setattr(item, k, v)
        
    db.commit()
    db.refresh(item)
    return item

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_food_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(FoodItem).filter(FoodItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    db.delete(item)
    db.commit()
    return None

# --- Batches ---
@router.get("/batches", response_model=List[BatchOut])
def list_batches(
    inspection_status: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Batch)
    if inspection_status:
        query = query.filter(Batch.inspection_status == inspection_status)
    if category:
        query = query.filter(Batch.category == category)
    return query.order_by(Batch.arrival_date.desc()).all()

@router.post("/batches", response_model=BatchOut, status_code=status.HTTP_201_CREATED)
def create_batch(
    batch_in: BatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["warehouse_operator", "food_quality_inspector", "administrator"]))
):
    batch = Batch(**batch_in.dict())
    db.add(batch)
    db.commit()
    db.refresh(batch)
    
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="BATCH_REGISTERED",
        entity_type="Batch",
        entity_id=batch.id,
        details=f"Registered Batch {batch.batch_number} from {batch.supplier_name} ({batch.total_quantity} {batch.unit})"
    )
    db.add(audit)
    db.commit()
    return batch

@router.put("/batches/{batch_id}", response_model=BatchOut)
def update_batch_inspection(
    batch_id: int,
    update_in: BatchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["food_quality_inspector", "warehouse_operator", "administrator"]))
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")
        
    for k, v in update_in.dict(exclude_unset=True).items():
        setattr(batch, k, v)
        
    db.commit()
    db.refresh(batch)
    
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="BATCH_INSPECTED",
        entity_type="Batch",
        entity_id=batch.id,
        details=f"Batch {batch.batch_number} updated to status '{batch.inspection_status}', Grade: '{batch.initial_quality_grade}' by Inspector {current_user.full_name}"
    )
    db.add(audit)
    db.commit()
    return batch
