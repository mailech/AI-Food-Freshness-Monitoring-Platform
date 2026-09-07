from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from typing import Optional
from app.schemas.prediction import PredictionResponse
from app.inference.predictor import predictor_pipeline

router = APIRouter(prefix="", tags=["Inference"])

@router.post("/predict", response_model=PredictionResponse)
async def predict_freshness(
    image: UploadFile = File(...),
    food_type: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    temperature: Optional[float] = Form(None),
    humidity: Optional[float] = Form(None),
    packaging_type: Optional[str] = Form(None),
    storage_duration: Optional[int] = Form(0)
):
    """
    Real AI Model Inference Endpoint.
    Receives raw food image file, processes through EfficientNetB0 freshness classifier,
    and returns predictions, visual scores, spoilage probabilities, and calibrated assessments.
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file MIME type '{image.content_type}'. Must be an image file."
        )

    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty image payload received."
        )

    try:
        result = predictor_pipeline.predict(
            image_bytes=image_bytes,
            food_type=food_type,
            category=category,
            temperature=temperature,
            humidity=humidity,
            packaging_type=packaging_type,
            storage_duration=storage_duration
        )
        return PredictionResponse(**result)
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(re)
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(e)}"
        )
