from fastapi import APIRouter, Query
from typing import List, Optional
from app.models.schemas import Recommendation
from app.services.recommendation_service import recommendation_service

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("", response_model=List[Recommendation])
def get_recommendations(
    category: Optional[str] = Query(None),
    rec_type: Optional[str] = Query(None)
):
    return recommendation_service.get_all(category=category, rec_type=rec_type)
