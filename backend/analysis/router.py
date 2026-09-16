import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from database import get_db
from models import AnalysisRecord, FoodItem, User, StorageCondition
from schemas import AnalysisOut
from auth.dependencies import get_current_user
from analysis.image_analyzer import analyze_image
from analysis.freshness_engine import calculate_freshness_score
from analysis.shelf_life import predict_shelf_life
from analysis.food_info import get_food_info, get_all_food_names
from config import UPLOAD_DIR
from typing import List, Optional

router = APIRouter(prefix="/analysis", tags=["Analysis"])

@router.post("/upload", response_model=AnalysisOut)
async def upload_and_analyze(
    file: UploadFile = File(...),
    food_name: str = Form("Unknown"),
    food_item_id: Optional[int] = Form(None),
    product_age_days: float = Form(0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    try:
        image_analysis = analyze_image(filepath)
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {str(e)}")

    storage_data = None
    if food_item_id:
        latest_storage = db.query(StorageCondition).filter(
            StorageCondition.food_item_id == food_item_id
        ).order_by(StorageCondition.recorded_at.desc()).first()
        if latest_storage:
            storage_data = {
                "temperature": latest_storage.temperature,
                "humidity": latest_storage.humidity,
                "packaging_type": latest_storage.packaging_type
            }

    freshness = calculate_freshness_score(image_analysis, storage_data, product_age_days, food_name)
    shelf_life = predict_shelf_life(food_name, freshness["freshness_score"], storage_data)
    food_info = get_food_info(food_name)

    is_fresh = freshness["quality_class"] in ["Fresh", "Good"]
    recommendation = food_info["fresh_recommendation"] if is_fresh else food_info["spoiled_recommendation"]

    record = AnalysisRecord(
        food_item_id=food_item_id,
        user_id=user.id,
        image_path=f"/uploads/{filename}",
        food_name=food_name,
        food_category=food_info["category"],
        freshness_score=freshness["freshness_score"],
        quality_class=freshness["quality_class"],
        confidence=freshness["confidence"],
        color_score=image_analysis["color_score"],
        texture_score=image_analysis["texture_score"],
        spoilage_probability=freshness["spoilage_probability"],
        mold_detected=image_analysis["mold_detected"],
        bruising_detected=image_analysis["bruising_detected"],
        damage_detected=image_analysis["damage_detected"],
        shelf_life_days=shelf_life["remaining_days"],
        shelf_life_text=shelf_life["shelf_life_text"],
        storage_recommendation=food_info["storage"],
        consumption_recommendation=recommendation,
        risk_level=freshness["risk_level"]
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("/history", response_model=List[AnalysisOut])
def get_history(limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(AnalysisRecord)
    if user.role == "Consumer":
        query = query.filter(AnalysisRecord.user_id == user.id)
    return query.order_by(AnalysisRecord.created_at.desc()).limit(limit).all()

@router.get("/history/{record_id}", response_model=AnalysisOut)
def get_analysis_detail(record_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found")
    return record

@router.get("/food-names")
def get_food_names():
    return {"food_names": get_all_food_names()}
