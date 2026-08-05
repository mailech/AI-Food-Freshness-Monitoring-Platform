from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List
import datetime
from uuid import UUID

from ..database import get_db
from ..models.sql_models import InventoryItem, FoodCategory, StorageLog, AnalysisResult, User
from ..utils.security import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Dashboard & Analytics"])

@router.get("/kpis")
def get_dashboard_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InventoryItem)
    if current_user.role not in ["admin", "retail_manager", "warehouse_operator", "food_inspector"]:
        query = query.filter(InventoryItem.user_id == current_user.id)
        
    total_items = query.count()
    fresh_items = query.filter(InventoryItem.status == "Fresh").count()
    decaying_items = query.filter(InventoryItem.status == "Decaying").count()
    spoiled_items = query.filter(InventoryItem.status == "Spoiled").count()
    expired_items = query.filter(InventoryItem.status == "Expired").count()
    
    # Average freshness
    avg_freshness = query.with_entities(func.avg(InventoryItem.freshness_score)).scalar() or 100.0
    
    # Simulated metrics
    total_waste_saved_kg = float(db.query(func.sum(InventoryItem.quantity))
                                 .filter(InventoryItem.status == "Fresh")
                                 .scalar() or 0.0) * 0.45 # coefficient for waste savings
                                 
    return {
        "total_items": total_items,
        "fresh_items": fresh_items,
        "decaying_items": decaying_items,
        "spoiled_items": spoiled_items,
        "expired_items": expired_items,
        "average_freshness": round(float(avg_freshness), 1),
        "total_waste_saved_kg": round(total_waste_saved_kg, 2)
    }

@router.get("/category-distribution")
def get_category_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Counts of items grouped by category name
    query = db.query(FoodCategory.name, func.count(InventoryItem.id), func.avg(InventoryItem.freshness_score)) \
              .join(InventoryItem, InventoryItem.category_id == FoodCategory.id)
              
    if current_user.role not in ["admin", "retail_manager", "warehouse_operator", "food_inspector"]:
        query = query.filter(InventoryItem.user_id == current_user.id)
        
    results = query.group_by(FoodCategory.name).all()
    
    return [
        {
            "category": r[0],
            "count": r[1],
            "avg_freshness": round(float(r[2]), 1) if r[2] else 100.0
        }
        for r in results
    ]

@router.get("/environmental-trends/{item_id}")
def get_environmental_trends(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Retrieve recent storage logs for a specific item to build time series charts
    logs = db.query(StorageLog) \
             .filter(StorageLog.inventory_item_id == item_id) \
             .order_by(StorageLog.recorded_at.asc()) \
             .limit(100) \
             .all()
             
    return [
        {
            "recorded_at": log.recorded_at.isoformat(),
            "temperature": float(log.temperature),
            "humidity": float(log.humidity)
        }
        for log in logs
    ]

@router.get("/decay-rates")
def get_decay_rates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Simulated timeline rates of decay for line chart visualization (days vs freshness)
    # Categorized by Fruits, Vegetables, Meat, Seafood
    # In production, this would query historical analysis results.
    timeline = []
    today = datetime.date.today()
    
    for i in range(7):
        date_str = (today - datetime.timedelta(days=6-i)).strftime("%Y-%m-%d")
        timeline.append({
            "date": date_str,
            "Fruits": round(90.0 - i * 3.5, 1),
            "Vegetables": round(88.0 - i * 4.0, 1),
            "Meat": round(95.0 - i * 8.0, 1),
            "Seafood": round(92.0 - i * 11.5, 1)
        })
        
    return timeline
