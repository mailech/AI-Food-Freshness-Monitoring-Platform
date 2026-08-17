import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.modules.user.models import User
from app.modules.inventory.service import get_item_by_id
from app.modules.scoring.schemas import ItemHealthScoreResponse, BatchHealthScoreResponse
from app.modules.scoring.service import calculate_item_health_score, calculate_batch_health_score

router = APIRouter()

@router.get("/item/{item_id}", response_model=ItemHealthScoreResponse)
async def get_item_health_score(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get the weighted freshness and health score breakdown for an inventory item.
    """
    item = await get_item_by_id(db, item_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )
        
    return await calculate_item_health_score(db, item)

@router.get("/batch/{batch_id}", response_model=BatchHealthScoreResponse)
async def get_batch_health_score(
    batch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get aggregated freshness and average health score metrics for a supply lot/batch.
    """
    try:
        return await calculate_batch_health_score(db, batch_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
