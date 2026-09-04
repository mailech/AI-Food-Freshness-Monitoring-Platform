from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
import json
from app.database import get_db
from app.models.analysis import AnalysisResult
from app.ai.demo_predictor import DemoPredictor

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])
predictor = DemoPredictor()

@router.post("/upload")
async def analyze_food_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    image_bytes = await file.read()
    
    # 1. Run AI Inference
    ai_result = predictor.analyze_image(image_bytes)
    
    # 2. Save Result
    db_result = AnalysisResult(
        freshness_category=ai_result["freshness_category"],
        freshness_score=ai_result["freshness_score"],
        spoilage_probability=ai_result["spoilage_probability"],
        confidence_score=ai_result["confidence_score"],
        detected_indicators=ai_result["detected_indicators"],
        is_demo_prediction=ai_result["is_demo_prediction"]
    )
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    
    # Clean up for frontend
    response_data = ai_result.copy()
    response_data["detected_indicators"] = json.loads(ai_result["detected_indicators"])
    response_data["id"] = db_result.id
    
    return {"success": True, "data": response_data}