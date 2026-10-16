import os
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.ml.inference import CLASS_NAMES
from app.ml.model import resolve_model_path, get_freshness_model
from app.ml.preprocessing import ImageValidationError
from app.services.scan_service import analyze_food_scan

router = APIRouter(prefix="/scan", tags=["Scan"])

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
    "application/octet-stream",  # Fallback for some clients
}


@router.get("/model-status")
def get_model_status():
    """Returns the operational status of the food freshness CNN model."""
    try:
        model_path = resolve_model_path()
        file_exists = model_path.exists()
        model = get_freshness_model()
        return {
            "status": "ready",
            "model_file": str(model_path.name),
            "model_path": str(model_path),
            "layers_count": len(model.layers),
            "classes_count": len(CLASS_NAMES),
            "supported_classes": CLASS_NAMES,
            "supported_foods": ["Apple", "Banana", "Orange"],
        }
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model file missing: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model not initialized: {str(e)}"
        )


@router.get("/supported-foods")
def get_supported_foods():
    """Returns the food items and classes visually recognizable by the CNN model."""
    return {
        "supported_foods": ["Apple", "Banana", "Orange"],
        "classes": CLASS_NAMES,
        "note": "Visual CNN scan recognizes Apple, Banana, and Orange. General inventory supports all food items."
    }


@router.post("/analyze")
async def analyze_scan(
    image: UploadFile = File(..., description="Uploaded food image file (JPEG, PNG, WebP)"),
    storage_temperature: Optional[float] = Form(default=4.0, description="Storage temperature in Celsius"),
    humidity: Optional[float] = Form(default=85.0, description="Ambient humidity percentage"),
    selected_food: Optional[str] = Form(default=None, description="Optional target food category (Apple, Banana, Orange)")
):
    """Performs real CNN vision inference on the uploaded image and returns freshness classification,

    confidence score, spoilage risk, and shelf-life prediction.
    """
    if not image or not image.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An image file is required for scan analysis."
        )

    # Basic MIME check (lenient on application/octet-stream if filename indicates an image)
    content_type = (image.content_type or "").lower()
    valid_ext = any(image.filename.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp"])
    if content_type not in ALLOWED_CONTENT_TYPES and not valid_ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{content_type or 'unknown'}'. Please upload a JPG, PNG, WebP, or BMP image."
        )

    try:
        image_bytes = await image.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read image upload: {str(e)}"
        )

    if not image_bytes or len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image file is empty."
        )

    # Limit file size to 15MB to prevent abuse/OOM
    if len(image_bytes) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image file size exceeds maximum limit of 15MB."
        )

    try:
        result = analyze_food_scan(
            image_input=image_bytes,
            storage_temperature=storage_temperature,
            humidity=humidity,
            selected_food=selected_food
        )
        return result
    except ImageValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"CNN model unavailable: {str(e)}"
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected scan analysis error: {str(e)}"
        )
