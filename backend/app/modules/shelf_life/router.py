import uuid
from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.modules.user.models import User
from app.modules.inventory.service import get_item_by_id
from app.modules.image_analysis.models import ImageAnalysis
from app.modules.shelf_life.schemas import ShelfLifePredictionRequest, ShelfLifePredictionResponse
from app.modules.shelf_life.service import (
    predict_shelf_life_kinetics,
    get_environmental_defaults_by_location
)

router = APIRouter()

@router.post("/predict", response_model=ShelfLifePredictionResponse)
async def predict_shelf_life(
    req: ShelfLifePredictionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Predict remaining shelf-life and expiry date for an item dynamically.
    If item_id is provided, automatically pulls its category, packaging,
    storage duration, and latest image analysis metrics.
    """
    if req.item_id:
        item = await get_item_by_id(db, item_id=req.item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found"
            )

        category = item.category
        packaging = item.packaging_type or "None"
        
        # Calculate duration since entry
        now = datetime.now(timezone.utc)
        entry_date = item.entry_date
        if entry_date.tzinfo is None:
            entry_date = entry_date.replace(tzinfo=timezone.utc)
            
        elapsed_days = (now - entry_date).total_seconds() / 86450.0
        duration_days = max(0.0, elapsed_days)

        # Lookup location default telemetry if not overridden in request
        temp_def, hum_def = get_environmental_defaults_by_location(item.storage_location)
        temp_val = req.temperature if req.temperature is not None else temp_def
        hum_val = req.humidity if req.humidity is not None else hum_def

        # Fetch latest image analysis score
        latest = await ImageAnalysis.find(
            ImageAnalysis.item_id == str(item.id)
        ).sort(-ImageAnalysis.analyzed_at).first()
        visual_score = latest.freshness_score if latest else 100.0

    else:
        if not req.category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category is required when item_id is not specified"
            )
        category = req.category
        packaging = req.packaging_type or "None"
        temp_val = req.temperature if req.temperature is not None else 20.0
        hum_val = req.humidity if req.humidity is not None else 50.0
        duration_days = req.storage_duration_days
        visual_score = 100.0

    prediction = predict_shelf_life_kinetics(
        category=category,
        packaging=packaging,
        temperature=temp_val,
        humidity=hum_val,
        storage_duration_days=duration_days,
        visual_freshness_score=visual_score
    )
    return prediction

@router.get("/item/{item_id}", response_model=ShelfLifePredictionResponse)
async def get_item_shelf_life_prediction(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Fetch shelf life estimation for a registered inventory item under its current storage settings.
    """
    item = await get_item_by_id(db, item_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found"
        )

    # Resolve defaults based on storage location label
    temp_def, hum_def = get_environmental_defaults_by_location(item.storage_location)

    # Resolve elapsed storage time
    now = datetime.now(timezone.utc)
    entry_date = item.entry_date
    if entry_date.tzinfo is None:
        entry_date = entry_date.replace(tzinfo=timezone.utc)
        
    duration_days = max(0.0, (now - entry_date).total_seconds() / 86400.0)

    # Fetch latest visual analysis score
    latest = await ImageAnalysis.find(
        ImageAnalysis.item_id == str(item.id)
    ).sort(-ImageAnalysis.analyzed_at).first()
    visual_score = latest.freshness_score if latest else 100.0

    prediction = predict_shelf_life_kinetics(
        category=item.category,
        packaging=item.packaging_type or "None",
        temperature=temp_def,
        humidity=hum_def,
        storage_duration_days=duration_days,
        visual_freshness_score=visual_score
    )
    return prediction
