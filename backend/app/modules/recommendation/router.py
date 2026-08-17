import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.modules.user.models import User
from app.modules.inventory.service import get_item_by_id
from app.modules.recommendation.schemas import RecommendationResponse, BatchRecommendationSummary
from app.modules.recommendation.service import generate_item_recommendations, generate_batch_recommendations

router = APIRouter()

@router.get("/item/{item_id}", response_model=RecommendationResponse)
async def get_item_recommendations(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get dynamic storage, FEFO rotation queue, and handling recommendations for an inventory item.
    """
    item = await get_item_by_id(db, item_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )
        
    return await generate_item_recommendations(db, item)

@router.get("/batch/{batch_id}", response_model=BatchRecommendationSummary)
async def get_batch_recommendations_summary(
    batch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get aggregated high-priority alerts and dispatch overrides summary for a supply batch.
    """
    try:
        return await generate_batch_recommendations(db, batch_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
