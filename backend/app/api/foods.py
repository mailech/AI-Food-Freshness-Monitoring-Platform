from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.models.schemas import FoodItem, FoodItemCreate, FoodItemUpdate, ShelfLifeResponse
from app.services.food_service import food_service
from datetime import datetime, timedelta

router = APIRouter(prefix="/foods", tags=["Food Inventory"])

@router.get("", response_model=List[FoodItem])
def list_foods(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("expiry_date")
):
    return food_service.get_all(category=category, status=status, search=search, sort_by=sort_by)

@router.get("/{food_id}", response_model=FoodItem)
def get_food(food_id: str):
    item = food_service.get_by_id(food_id)
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    return item

@router.post("", response_model=FoodItem)
def create_food(payload: FoodItemCreate):
    return food_service.create(payload.model_dump())

@router.put("/{food_id}", response_model=FoodItem)
def update_food(food_id: str, payload: FoodItemUpdate):
    item = food_service.update(food_id, payload.model_dump(exclude_unset=True))
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    return item

@router.delete("/{food_id}")
def delete_food(food_id: str):
    success = food_service.delete(food_id)
    if not success:
        raise HTTPException(status_code=404, detail="Food item not found")
    return {"message": "Food item deleted successfully", "success": True}

@router.get("/{food_id}/freshness")
def get_food_freshness(food_id: str):
    item = food_service.get_by_id(food_id)
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    return {
        "food_id": item["id"],
        "food_name": item["name"],
        "freshness_score": item["freshness_score"],
        "freshness_status": item["freshness_status"],
        "spoilage_probability": item["spoilage_probability"],
        "confidence": item["confidence"],
        "detected_issues": item["detected_issues"],
        "history": item.get("freshness_history", [])
    }

@router.get("/{food_id}/shelf-life", response_model=ShelfLifeResponse)
def get_food_shelf_life(food_id: str):
    item = food_service.get_by_id(food_id)
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    
    risk = "Low"
    if item["freshness_score"] < 50 or item["estimated_shelf_life_days"] <= 1:
        risk = "High"
    elif item["freshness_score"] < 75 or item["estimated_shelf_life_days"] <= 3:
        risk = "Medium"

    return ShelfLifeResponse(
        food_id=item["id"],
        food_name=item["name"],
        estimated_remaining_days=item["estimated_shelf_life_days"],
        expected_expiry_date=item["expiry_date"],
        current_storage_duration_days=item.get("storage_duration_days", 2),
        storage_temp=item["storage_temp"],
        humidity=item["humidity"],
        risk_level=risk,
        prediction_confidence=item.get("confidence", 0.91),
        factors=[
            {"name": "Temperature Stability", "impact": "High Positive" if item["storage_temp"] < 5 else "Moderate"},
            {"name": "Humidity Regulation", "impact": "Positive" if item["humidity"] > 70 else "Neutral"},
            {"name": "Atmospheric Packaging", "impact": "High Positive"}
        ]
    )
