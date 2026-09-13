from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.models.entities import Recommendation, FoodItem
from app.schemas.all_schemas import ShelfLifePredictionInput, ShelfLifePredictionOut, RecommendationOut
from app.ml.shelf_life_engine import KineticShelfLifeEngine

router_shelf = APIRouter(prefix="/shelf-life", tags=["Shelf Life Prediction"])

@router_shelf.post("/predict", response_model=ShelfLifePredictionOut)
def predict_shelf_life(data: ShelfLifePredictionInput):
    pred = KineticShelfLifeEngine.predict_shelf_life(
        category=data.category,
        current_freshness_score=data.current_freshness_score,
        storage_temperature=data.storage_temperature,
        storage_humidity=data.storage_humidity,
        packaging_type=data.packaging_type,
        days_stored=data.days_stored
    )
    return pred

router_rec = APIRouter(prefix="/recommendations", tags=["Recommendation Engine"])

@router_rec.get("/", response_model=List[RecommendationOut])
def list_recommendations(
    rec_type: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Recommendation)
    if rec_type:
        query = query.filter(Recommendation.recommendation_type == rec_type)
    if priority:
        query = query.filter(Recommendation.priority == priority)
    return query.order_by(Recommendation.action_taken.asc(), Recommendation.created_at.desc()).all()

@router_rec.post("/{rec_id}/action")
def mark_recommendation_actioned(rec_id: int, db: Session = Depends(get_db)):
    rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.action_taken = True
    db.commit()
    return {"status": "success", "message": "Recommendation marked as applied"}
