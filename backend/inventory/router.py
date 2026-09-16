from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import FoodItem, Batch, User
from schemas import FoodItemCreate, FoodItemUpdate, FoodItemOut, BatchCreate, BatchOut
from auth.dependencies import get_current_user
from inventory.service import get_inventory_stats, get_expiring_items
from typing import List, Optional

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.post("/items", response_model=FoodItemOut)
def create_item(data: FoodItemCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = FoodItem(**data.model_dump(), added_by=user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.get("/items", response_model=List[FoodItemOut])
def list_items(category: Optional[str] = None, search: Optional[str] = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(FoodItem)
    if user.role == "Consumer":
        query = query.filter(FoodItem.added_by == user.id)
    if category:
        query = query.filter(FoodItem.category == category)
    if search:
        query = query.filter(FoodItem.name.ilike(f"%{search}%"))
    return query.order_by(FoodItem.created_at.desc()).all()

@router.get("/items/{item_id}", response_model=FoodItemOut)
def get_item(item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(FoodItem).filter(FoodItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.put("/items/{item_id}", response_model=FoodItemOut)
def update_item(item_id: int, data: FoodItemUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(FoodItem).filter(FoodItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/items/{item_id}")
def delete_item(item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(FoodItem).filter(FoodItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"detail": "Item deleted"}

@router.post("/batches", response_model=BatchOut)
def create_batch(data: BatchCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    batch = Batch(**data.model_dump())
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch

@router.get("/batches", response_model=List[BatchOut])
def list_batches(food_item_id: Optional[int] = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Batch)
    if food_item_id:
        query = query.filter(Batch.food_item_id == food_item_id)
    return query.order_by(Batch.created_at.desc()).all()

@router.get("/stats")
def inventory_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = user.id if user.role == "Consumer" else None
    return get_inventory_stats(db, uid)

@router.get("/expiring")
def expiring_items(days: int = 7, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = user.id if user.role == "Consumer" else None
    items = get_expiring_items(db, days, uid)
    return [{"food_item_name": i["food_item"].name, "batch_label": i["batch"].label, "days_until_expiry": i["days_until_expiry"], "expiry_date": str(i["batch"].expiry_date)} for i in items]
