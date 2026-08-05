from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta

from ..database import get_db
from ..models.sql_models import InventoryItem, FoodCategory, Batch, User, StorageLog
from ..schemas.pydantic_schemas import InventoryResponse, InventoryCreate, InventoryUpdate, StorageLogCreate, StorageLogResponse
from ..utils.security import get_current_user, RoleChecker
from ..mongodb import get_mongo_db
from ..services.recommendation import RecommendationEngine

router = APIRouter(prefix="/api/inventory", tags=["Inventory Management"])

@router.get("", response_model=List[InventoryResponse])
def get_inventory(
    category_id: Optional[UUID] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InventoryItem)
    
    # Non-admins and non-operators only see their own items (e.g. Consumer role)
    if current_user.role not in ["admin", "retail_manager", "warehouse_operator", "food_inspector"]:
        query = query.filter(InventoryItem.user_id == current_user.id)
        
    if category_id:
        query = query.filter(InventoryItem.category_id == category_id)
        
    if status:
        query = query.filter(InventoryItem.status == status)
        
    if search:
        query = query.filter(InventoryItem.name.ilike(f"%{search}%"))
        
    return query.order_by(InventoryItem.expiry_date.asc()).all()

@router.get("/{item_id}", response_model=InventoryResponse)
def get_inventory_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(InventoryItem).filter(InventoryItem.id == str(item_id)).first()
    if not item:
        item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found."
        )
        
    # Check access rights for Consumer role
    if current_user.role not in ["admin", "retail_manager", "warehouse_operator", "food_inspector"]:
        if str(item.user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this item."
            )
    # Inject recommendations
    item.recommendations = RecommendationEngine.generate_recommendations(item)
    return item

@router.post("", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_item(
    item_in: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify category
    category = db.query(FoodCategory).filter(str(FoodCategory.id) == str(item_in.category_id)).first()
    if not category:
        # Fallback check for SQLite native string matching
        category = db.query(FoodCategory).filter(FoodCategory.id == str(item_in.category_id)).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found."
        )
        
    # Verify batch if provided
    if item_in.batch_id:
        batch = db.query(Batch).filter(str(Batch.id) == str(item_in.batch_id)).first()
        if not batch:
            batch = db.query(Batch).filter(Batch.id == str(item_in.batch_id)).first()
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found."
            )
            
    # Calculate expiry if not supplied, or if we want base baseline
    # Add category's base_shelf_life_days from added date
    added_date = datetime.now()
    # item_in.expiry_date is required in schema, so we accept the user's date,
    # but verify it's in the future
    if item_in.expiry_date.tzinfo is not None:
        expiry_naive = item_in.expiry_date.replace(tzinfo=None)
    else:
        expiry_naive = item_in.expiry_date
        
    if expiry_naive < datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiry date must be in the future."
        )
        
    item = InventoryItem(
        name=item_in.name,
        category_id=str(item_in.category_id),
        user_id=str(current_user.id) if current_user.id else None,
        batch_id=str(item_in.batch_id) if item_in.batch_id else None,
        quantity=item_in.quantity,
        unit=item_in.unit,
        added_at=added_date,
        expiry_date=item_in.expiry_date,
        storage_temp=item_in.storage_temp,
        storage_humidity=item_in.storage_humidity,
        status="Fresh",
        freshness_score=100
    )
    
    db.add(item)
    db.commit()
    db.refresh(item)
    
    # MongoDB Log creation
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        try:
            mongo_db.activity_logs.insert_one({
                "user_id": str(current_user.id),
                "action": "INVENTORY_CREATED",
                "details": f"Added inventory item {item.name} ({item.quantity} {item.unit}).",
                "timestamp": datetime.utcnow()
            })
        except Exception as e:
            pass
            
    return item

@router.put("/{item_id}", response_model=InventoryResponse)
def update_inventory_item(
    item_id: UUID,
    item_in: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(InventoryItem).filter(InventoryItem.id == str(item_id)).first()
    if not item:
        item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found."
        )
        
    # Check authorization
    if current_user.role not in ["admin", "retail_manager", "warehouse_operator"]:
        if str(item.user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to edit this item."
            )
            
    # Apply updates
    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
        
    # If freshness score changes, update status accordingly
    if "freshness_score" in update_data:
        score = update_data["freshness_score"]
        if score >= 70:
            item.status = "Fresh"
        elif score >= 40:
            item.status = "Decaying"
        else:
            item.status = "Spoiled"
            
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(InventoryItem).filter(InventoryItem.id == str(item_id)).first()
    if not item:
        item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found."
        )
        
    if current_user.role not in ["admin", "retail_manager"]:
        if str(item.user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this item."
            )
            
    db.delete(item)
    db.commit()
    
    # MongoDB Log deletion
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        try:
            mongo_db.activity_logs.insert_one({
                "user_id": str(current_user.id),
                "action": "INVENTORY_DELETED",
                "details": f"Deleted item {item.name}.",
                "timestamp": datetime.utcnow()
            })
        except Exception as e:
            pass
            
    return None


# ==========================================
# ENVIRONMENTAL STORAGE LOGS
# ==========================================

@router.post("/{item_id}/logs", response_model=StorageLogResponse, status_code=status.HTTP_201_CREATED)
def record_storage_log(
    item_id: UUID,
    log_in: StorageLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found."
        )
        
    log = StorageLog(
        inventory_item_id=item_id,
        temperature=log_in.temperature,
        humidity=log_in.humidity
    )
    
    # Also update item's current ambient values
    item.storage_temp = log_in.temperature
    item.storage_humidity = log_in.humidity
    
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
