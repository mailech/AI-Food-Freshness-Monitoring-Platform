from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import FoodItem, AnalysisRecord, StorageCondition, User
from auth.dependencies import get_current_user
from recommendations.engine import generate_recommendations, get_waste_reduction_tips

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("/{item_id}")
def get_recommendations(item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(FoodItem).filter(FoodItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")

    latest_analysis = db.query(AnalysisRecord).filter(AnalysisRecord.food_item_id == item_id).order_by(AnalysisRecord.created_at.desc()).first()
    latest_storage = db.query(StorageCondition).filter(StorageCondition.food_item_id == item_id).order_by(StorageCondition.recorded_at.desc()).first()

    freshness = latest_analysis.freshness_score if latest_analysis else 75.0
    quality = latest_analysis.quality_class if latest_analysis else "Good"
    shelf = latest_analysis.shelf_life_days if latest_analysis else 7.0

    storage_data = None
    if latest_storage:
        storage_data = {"temperature": latest_storage.temperature, "humidity": latest_storage.humidity, "packaging_type": latest_storage.packaging_type}

    return generate_recommendations(item.name, freshness, quality, shelf, storage_data)

@router.get("/waste-reduction/tips")
def waste_reduction(user: User = Depends(get_current_user)):
    return {"tips": get_waste_reduction_tips()}
