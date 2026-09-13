from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models.entities import FoodItem, FreshnessScan, StorageLocation
from app.schemas.all_schemas import FreshnessAssessmentInput, WeightedScoreBreakdown
from app.ml.scoring_engine import FreshnessScoringEngine

router = APIRouter(prefix="/freshness", tags=["Freshness Assessment"])

@router.post("/assess", response_model=WeightedScoreBreakdown)
def assess_freshness_manual(input_data: FreshnessAssessmentInput, db: Session = Depends(get_db)):
    temp = input_data.current_temperature
    hum = input_data.current_humidity
    
    if input_data.storage_location_id:
        loc = db.query(StorageLocation).filter(StorageLocation.id == input_data.storage_location_id).first()
        if loc:
            temp = loc.current_temperature
            hum = loc.current_humidity
            
    res = FreshnessScoringEngine.compute_weighted_freshness_score(
        visual_score=input_data.visual_score,
        category=input_data.category,
        temperature=temp,
        humidity=hum,
        days_stored=input_data.days_stored
    )
    return res

@router.get("/trends/{item_id}")
def get_freshness_trend(item_id: int, db: Session = Depends(get_db)):
    item = db.query(FoodItem).filter(FoodItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    scans = db.query(FreshnessScan).filter(FreshnessScan.food_item_id == item_id).order_by(FreshnessScan.scan_timestamp.asc()).all()
    
    points = []
    for s in scans:
        points.append({
            "timestamp": s.scan_timestamp,
            "freshness_score": s.freshness_score,
            "visual_condition_score": s.visual_condition_score,
            "spoilage_probability": s.spoilage_probability
        })
        
    if not points:
        # Synthetic historical curve from creation date to current date
        created = item.created_at or datetime.utcnow()
        days = max(1, item.days_stored or 1)
        for d in range(days + 1):
            t = created + timedelta(days=d)
            decay = (item.initial_freshness_score - item.current_freshness_score) * (d / days)
            points.append({
                "timestamp": t,
                "freshness_score": round(item.initial_freshness_score - decay, 1),
                "visual_condition_score": round(item.initial_freshness_score - decay * 0.9, 1),
                "spoilage_probability": round(0.05 + (0.95 - (item.initial_freshness_score - decay)/100.0) * 0.6, 2)
            })
            
    return {
        "item_id": item.id,
        "item_name": item.name,
        "initial_score": item.initial_freshness_score,
        "current_score": item.current_freshness_score,
        "category": item.category,
        "trend_points": points
    }
