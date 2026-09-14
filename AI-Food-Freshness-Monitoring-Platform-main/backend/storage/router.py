from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import StorageCondition, FoodItem, User
from schemas import StorageConditionCreate, StorageConditionOut
from auth.dependencies import get_current_user
from storage.monitor import check_compliance, get_storage_recommendations
from typing import List

router = APIRouter(prefix="/storage", tags=["Storage"])

@router.post("/conditions", response_model=StorageConditionOut)
def log_condition(data: StorageConditionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(FoodItem).filter(FoodItem.id == data.food_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")

    compliance = check_compliance(item.name, data.temperature, data.humidity)
    condition = StorageCondition(**data.model_dump(), is_compliant=compliance["is_compliant"])
    db.add(condition)
    db.commit()
    db.refresh(condition)
    return condition

@router.get("/conditions/{item_id}", response_model=List[StorageConditionOut])
def get_conditions(item_id: int, limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(StorageCondition).filter(StorageCondition.food_item_id == item_id).order_by(StorageCondition.recorded_at.desc()).limit(limit).all()

@router.get("/compliance/{item_id}")
def check_item_compliance(item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(FoodItem).filter(FoodItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    latest = db.query(StorageCondition).filter(StorageCondition.food_item_id == item_id).order_by(StorageCondition.recorded_at.desc()).first()
    if not latest:
        return {"message": "No storage data recorded yet"}
    return check_compliance(item.name, latest.temperature, latest.humidity)

@router.get("/recommendations/{item_id}")
def storage_recommendations(item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(FoodItem).filter(FoodItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    latest = db.query(StorageCondition).filter(StorageCondition.food_item_id == item_id).order_by(StorageCondition.recorded_at.desc()).first()
    temp = latest.temperature if latest else 4.0
    hum = latest.humidity if latest else 60.0
    pkg = latest.packaging_type if latest else "Open"
    return get_storage_recommendations(item.name, temp, hum, pkg)
