from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
import os
import shutil
from datetime import datetime

from ..database import get_db
from ..models.sql_models import InventoryItem, AnalysisResult, FoodCategory, User
from ..schemas.pydantic_schemas import AnalysisResultResponse
from ..utils.security import get_current_user
from ..mongodb import get_mongo_db
from ..config import settings

# Import the inference pipeline
from ai.inference import AIInferencePipeline

router = APIRouter(prefix="/api/predict", tags=["AI Image Analysis"])

# Instantiate the pipeline
# Note: AIInferencePipeline handles checking for weights and falling back to uninitialized state
pipeline = AIInferencePipeline()

@router.post("/upload", response_model=dict)
async def upload_food_image(
    file: UploadFile = File(...),
    inventory_item_id: Optional[str] = Form(None),
    category_id: Optional[str] = Form(None),
    temp: float = Form(20.0),
    humidity: float = Form(60.0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify file is an image
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File uploaded must be an image."
        )
        
    # Read image bytes
    image_bytes = await file.read()
    
    # Check category name
    category_name = "Fruits" # Default fallback
    item = None
    
    if inventory_item_id:
        try:
            item_uuid = UUID(inventory_item_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid inventory_item_id UUID format.")
            
        item = db.query(InventoryItem).filter(InventoryItem.id == item_uuid).first()
        if not item:
            raise HTTPException(status_code=404, detail="Inventory item not found.")
        category_name = item.category.name
    elif category_id:
        try:
            cat_uuid = UUID(category_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid category_id UUID format.")
            
        category = db.query(FoodCategory).filter(FoodCategory.id == cat_uuid).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found.")
        category_name = category.name
        
    # 1. Run full PyTorch + OpenCV inference
    try:
        results = pipeline.run_inference(image_bytes, temp=temp, humidity=humidity)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI model inference failed: {str(e)}"
        )
        
    # Save the file to disk
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"{current_user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    
    # Write image to disk
    with open(file_path, "wb") as buffer:
        buffer.write(image_bytes)
        
    image_url = f"/uploads/{filename}"
    
    # 2. Save AnalysisResult to DB if it is associated with an inventory item
    analysis_record = None
    if item:
        analysis_record = AnalysisResult(
            inventory_item_id=item.id,
            image_url=image_url,
            color_score=results["cv_metrics"]["color_score"],
            texture_score=results["cv_metrics"]["texture_score"],
            mold_detected=results["cv_metrics"]["mold_detected"],
            bruise_detected=results["cv_metrics"]["bruise_detected"],
            damage_detected=False, # default placeholder for complex shapes
            freshness_score=results["freshness_score"],
            spoilage_probability=results["spoilage_probability"],
            remaining_shelf_life_days=results["remaining_shelf_life_days"]
        )
        db.add(analysis_record)
        # Note: Database triggers will automatically update inventory_item's freshness_score and status.
        db.commit()
        db.refresh(analysis_record)
        
        # Trigger Notification alerts in MongoDB if spoiled or decaying
        mongo_db = get_mongo_db()
        if mongo_db is not None:
            try:
                if results["status"] in ["Spoiled", "Decaying"]:
                    mongo_db.notifications.insert_one({
                        "user_id": str(current_user.id),
                        "title": f"Freshness Alert: {item.name}",
                        "message": f"Inventory item '{item.name}' is flagged as {results['status']} with freshness score of {results['freshness_score']}%.",
                        "channel": "Spoilage Alert",
                        "is_read": False,
                        "created_at": datetime.utcnow()
                    })
            except Exception as e:
                pass
                
    # 3. Log Performance to MongoDB for AI Model Dashboard
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        try:
            mongo_db.model_performance.insert_one({
                "model_name": "FoodFreshnessCNN",
                "predicted_category": results["category"],
                "freshness_score": results["freshness_score"],
                "spoilage_probability": results["spoilage_probability"],
                "remaining_shelf_life_days": results["remaining_shelf_life_days"],
                "timestamp": datetime.utcnow()
            })
        except Exception as e:
            pass
            
    # Return formatted result
    return {
        "analysis_id": str(analysis_record.id) if analysis_record else None,
        "image_url": image_url,
        "predicted_category": results["category"],
        "status": results["status"],
        "freshness_score": results["freshness_score"],
        "spoilage_probability": results["spoilage_probability"],
        "remaining_shelf_life_days": results["remaining_shelf_life_days"],
        "cv_metrics": results["cv_metrics"]
    }
