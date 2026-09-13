from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.models.entities import Recommendation
from app.schemas.all_schemas import RecommendationOut

router = APIRouter(prefix="/recommendations", tags=["Recommendation Engine"])

@router.get("/", response_model=List[RecommendationOut])
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

@router.post("/{rec_id}/action")
def mark_recommendation_actioned(rec_id: int, db: Session = Depends(get_db)):
    rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.action_taken = True
    db.commit()
    return {"status": "success", "message": "Recommendation marked as applied"}
