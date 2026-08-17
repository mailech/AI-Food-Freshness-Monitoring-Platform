import uuid
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.modules.user.models import User
from app.modules.inventory.service import get_item_by_id
from app.modules.freshness.service import calculate_item_freshness, get_item_freshness_trend

router = APIRouter()

@router.get("/item/{item_id}", response_model=Dict[str, Any])
async def get_item_freshness_report(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get full freshness diagnostic report for a food item,
    including the active score, quality classification, and historic trend list.
    """
    # 1. Fetch item from PostgreSQL
    item = await get_item_by_id(db, item_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food item not found"
        )

    # 2. Check consumer access restrictions
    if current_user.role == "CONSUMER" and item.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )

    # 3. Calculate current metrics & history trend
    current_status = await calculate_item_freshness(db, item=item)
    trend_history = await get_item_freshness_trend(db, item=item)

    return {
        "current": current_status,
        "trend": trend_history
    }
