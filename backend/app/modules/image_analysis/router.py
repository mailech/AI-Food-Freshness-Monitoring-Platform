import os
import uuid
import shutil
from typing import Any, List
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.modules.user.models import User
from app.modules.inventory.service import get_item_by_id
from app.modules.inventory.models import BatchStatus
from app.modules.image_analysis.models import ImageAnalysis
from app.modules.image_analysis.cv_pipeline import FoodFreshnessModel
from app.modules.image_analysis.utils import validate_image_file
from ml.inference import ModelUnavailableError

router = APIRouter()

UPLOAD_DIR = "static/uploads"
model_pipeline = FoodFreshnessModel()

from app.core.rate_limit import upload_rate_limiter

@router.post("/upload", response_model=ImageAnalysis, status_code=status.HTTP_201_CREATED, dependencies=[Depends(upload_rate_limiter)])
async def upload_food_image(
    *,
    db: AsyncSession = Depends(get_db),
    item_id: str = Form(..., description="UUID of the relational inventory item"),
    file: UploadFile = File(..., description="Food item image file"),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Upload a food item image, execute OpenCV + ML freshness extraction,
    update the item's relational status, and save metrics in MongoDB.
    """
    # 1. Verify item exists in PostgreSQL
    try:
        item_uuid = uuid.UUID(item_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid item ID UUID format."
        )

    item = await get_item_by_id(db, item_id=item_uuid)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory item ID '{item_id}' not found."
        )

    # Validate image file properties
    validate_image_file(file)

    # 2. Save file to static/uploads
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_extension = os.path.splitext(file.filename or "")[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write image file to disk: {str(e)}"
        )

    # 3. Analyze Image
    try:
        analysis_results = model_pipeline.analyze_image(file_path)
    except ModelUnavailableError as e:
        # Clean up file on failure
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        # Clean up file on failure
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Computer Vision pipeline analysis failed: {str(e)}"
        )

    # 4. Update PostgreSQL Item Status based on visual freshness
    score = analysis_results.get("freshness_score", 100.0)
    is_moldy = analysis_results.get("mold_detected", False)
    
    new_status = BatchStatus.FRESH
    if is_moldy or score < 45.0:
        new_status = BatchStatus.SPOILED
    elif score < 75.0:
        new_status = BatchStatus.WARNING

    if item.status != new_status:
        item.status = new_status
        db.add(item)
        await db.flush()

    # 5. Save reference & analytics metrics in MongoDB via Beanie Document
    analysis_doc = ImageAnalysis(
        item_id=str(item.id),
        filename=file.filename or "unknown",
        file_url=f"/static/uploads/{unique_filename}",
        freshness_score=score,
        color_degradation=analysis_results.get("color_degradation", 0.0),
        texture_roughness=analysis_results.get("texture_roughness", 0.0),
        mold_detected=is_moldy,
        mold_confidence=analysis_results.get("mold_confidence", 0.0),
        bruising_detected=analysis_results.get("bruising_detected", False),
        bruising_confidence=analysis_results.get("bruising_confidence", 0.0),
        damage_detected=analysis_results.get("damage_detected", False),
        damage_confidence=analysis_results.get("damage_confidence", 0.0),
        classification_label=analysis_results.get("classification_label", "unknown/uncertain"),
        status_message=analysis_results.get("status_message", "Normal classification")
    )
    await analysis_doc.insert()

    # Auto-generate freshness alert if score is low or mold is detected
    if is_moldy or score < 60.0:
        from app.modules.notification.service import NotificationService
        from app.modules.notification.schemas import NotificationCreate
        
        title = "Spoilage Alarm!" if is_moldy else "Freshness Decay Warning"
        msg = f"Visual analysis detected mold on '{item.name}'!" if is_moldy else f"'{item.name}' freshness score dropped to {score}%."
        
        # Dispatch to RETAIL_MANAGER
        await NotificationService.create_notification(NotificationCreate(
            role="RETAIL_MANAGER",
            title=title,
            message=msg,
            type="spoilage" if is_moldy else "freshness"
        ))

    return analysis_doc

from pydantic import BaseModel

class ImageScanResponse(BaseModel):
    filename: str
    freshness_score: float
    color_degradation: float
    texture_roughness: float
    mold_detected: bool
    mold_confidence: float
    bruising_detected: bool
    bruising_confidence: float
    damage_detected: bool
    damage_confidence: float
    classification_label: str
    status_message: str

@router.post("/scan", response_model=ImageScanResponse, status_code=status.HTTP_200_OK, dependencies=[Depends(upload_rate_limiter)])
async def scan_food_image(
    *,
    file: UploadFile = File(..., description="Food item image file"),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Scan a food item image dynamically using CV/ML pipeline, returning predictions
    without linking to an inventory item.
    """
    # 1. Validate image file properties
    validate_image_file(file)

    # 2. Save temporary file to static/uploads for processing
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_extension = os.path.splitext(file.filename or "")[1]
    unique_filename = f"scan_{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write image file to disk: {str(e)}"
        )

    # 3. Analyze Image
    try:
        analysis_results = model_pipeline.analyze_image(file_path)
    except ModelUnavailableError as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Computer Vision pipeline analysis failed: {str(e)}"
        )
    finally:
        # Clean up temporary scan files
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

    return ImageScanResponse(
        filename=file.filename or "unknown",
        freshness_score=analysis_results.get("freshness_score", 100.0),
        color_degradation=analysis_results.get("color_degradation", 0.0),
        texture_roughness=analysis_results.get("texture_roughness", 0.0),
        mold_detected=analysis_results.get("mold_detected", False),
        mold_confidence=analysis_results.get("mold_confidence", 0.0),
        bruising_detected=analysis_results.get("bruising_detected", False),
        bruising_confidence=analysis_results.get("bruising_confidence", 0.0),
        damage_detected=analysis_results.get("damage_detected", False),
        damage_confidence=analysis_results.get("damage_confidence", 0.0),
        classification_label=analysis_results.get("classification_label", "unknown/uncertain"),
        status_message=analysis_results.get("status_message", "Normal classification")
    )

@router.get("/item/{item_id}", response_model=List[ImageAnalysis])
async def get_item_analyses(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Retrieve all computer vision image reports for an inventory item from MongoDB.
    """
    # Verify item exists first
    try:
        item_uuid = uuid.UUID(item_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid item ID UUID format."
        )

    item = await get_item_by_id(db, item_id=item_uuid)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory item ID '{item_id}' not found."
        )

    # Query Beanie model
    analyses = await ImageAnalysis.find(ImageAnalysis.item_id == str(item_uuid)).to_list()
    return analyses
