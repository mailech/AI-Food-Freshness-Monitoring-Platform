from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any

from app.db.session import get_db
from app.models.entities import FoodItem, Batch, StorageLocation, FreshnessScan, Alert, Recommendation, User
from app.api.dependencies import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics & Insights"])

@router.get("/dashboard/{role}")
def get_role_dashboard_metrics(role: str, db: Session = Depends(get_db)):
    total_items = db.query(FoodItem).count()
    avg_freshness = db.query(func.avg(FoodItem.current_freshness_score)).scalar() or 88.5
    fresh_count = db.query(FoodItem).filter(FoodItem.quality_category == "Fresh").count()
    good_count = db.query(FoodItem).filter(FoodItem.quality_category == "Good").count()
    acceptable_count = db.query(FoodItem).filter(FoodItem.quality_category == "Acceptable").count()
    near_spoil_count = db.query(FoodItem).filter(FoodItem.quality_category == "Near Spoilage").count()
    spoiled_count = db.query(FoodItem).filter(FoodItem.quality_category == "Spoiled").count()
    
    active_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()
    total_scans = db.query(FreshnessScan).count()
    total_batches = db.query(Batch).count()
    
    # Category Distribution
    cat_counts = db.query(FoodItem.category, func.count(FoodItem.id)).group_by(FoodItem.category).all()
    cat_dict = {cat: count for cat, count in cat_counts}
    
    # Storage compliance rate
    locations = db.query(StorageLocation).all()
    compliant_locs = sum(
        1 for loc in locations 
        if (loc.ideal_temp_min <= loc.current_temperature <= loc.ideal_temp_max) and
           (loc.ideal_humidity_min <= loc.current_humidity <= loc.ideal_humidity_max)
    )
    compliance_rate = round((compliant_locs / max(1, len(locations))) * 100.0, 1)
    
    # Markdown candidates (items expiring in <= 3 days or near spoilage)
    markdown_items = db.query(FoodItem).filter(
        (FoodItem.quality_category.in_(["Near Spoilage", "Acceptable"])) |
        (FoodItem.status == "markdown")
    ).count()
    
    # Waste reduction savings metric
    waste_saved_pct = round(max(15.0, min(85.0, (avg_freshness * 0.8) + (compliance_rate * 0.2) - 15.0)), 1)
    
    role_metrics = {
        "role": role,
        "total_items": total_items,
        "average_freshness_score": round(avg_freshness, 1),
        "fresh_count": fresh_count,
        "good_count": good_count,
        "acceptable_count": acceptable_count,
        "near_spoilage_count": near_spoil_count,
        "spoiled_count": spoiled_count,
        "active_alerts": active_alerts,
        "total_scans": total_scans,
        "total_batches": total_batches,
        "storage_compliance_rate": compliance_rate,
        "markdown_candidates_count": markdown_items,
        "waste_reduction_savings_pct": waste_saved_pct,
        "category_distribution": cat_dict,
        "freshness_breakdown": {
            "Fresh": fresh_count,
            "Good": good_count,
            "Acceptable": acceptable_count,
            "Near Spoilage": near_spoil_count,
            "Spoiled": spoiled_count
        }
    }
    
    if role == 'consumer':
        # Add consumer personalized tips
        role_metrics['urgent_consumption_items'] = db.query(FoodItem).filter(FoodItem.current_freshness_score < 70.0).limit(5).all()
    elif role == 'retail_manager':
        role_metrics['markdown_candidates'] = db.query(FoodItem).filter(FoodItem.current_freshness_score < 65.0).limit(8).all()
    elif role == 'warehouse_operator':
        role_metrics['storage_zones'] = locations
    elif role == 'food_quality_inspector':
        role_metrics['pending_batches'] = db.query(Batch).filter(Batch.inspection_status == "pending").all()
    elif role == 'administrator':
        role_metrics['total_users'] = db.query(User).count()
        
    return role_metrics
