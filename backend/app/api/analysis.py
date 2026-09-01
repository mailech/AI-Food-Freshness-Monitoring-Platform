from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional
from app.models.schemas import FoodAnalysisResponse
from app.services.ai_service import ai_service
from app.services.db import db
import uuid

router = APIRouter(prefix="/food", tags=["AI Food Freshness Analysis"])

@router.post("/analyze", response_model=FoodAnalysisResponse)
async def analyze_food(
    file: Optional[UploadFile] = File(None),
    food_type: Optional[str] = Form(None),
    category: Optional[str] = Form(None)
):
    image_bytes = None
    if file:
        image_bytes = await file.read()
        # Fallback food type extraction from filename if not explicitly supplied
        if not food_type and file.filename:
            raw_fn = file.filename.split(".")[0].replace("_", " ").replace("-", " ")
            food_type = raw_fn

    if not food_type:
        food_type = "Apple"

    result = ai_service.analyze_food(
        food_type=food_type,
        category=category or "Fruits",
        image_bytes=image_bytes
    )

    # Log to recent analyses
    db.recent_analyses.insert(0, {
        "id": f"ana-{uuid.uuid4().hex[:6]}",
        "food_name": result["food_type"],
        "timestamp": "Just now",
        "score": result["freshness_score"],
        "status": result["freshness_category"],
        "confidence": result["confidence"],
        "image_url": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80"
    })

    return FoodAnalysisResponse(**result)
