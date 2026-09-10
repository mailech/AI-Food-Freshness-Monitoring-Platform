"""Freshness-analysis persistence and safe upload storage."""

from pathlib import Path
import sys
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.freshness_analysis import FreshnessAnalysis
from app.models.food_batch import FoodBatch

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.src.freshness_inference import predict_freshness

SUPPORTED_FRUIT_NAMES = ("apple", "banana", "orange")

_FORMATS = {
    "jpeg": {"extensions": {".jpg", ".jpeg"}, "content_types": {"image/jpeg"}},
    "png": {"extensions": {".png"}, "content_types": {"image/png"}},
    "webp": {"extensions": {".webp"}, "content_types": {"image/webp"}},
}


def upload_directory() -> Path:
    """Resolve and create the configured application-managed upload directory."""
    directory = Path(settings.freshness_upload_dir).expanduser().resolve()
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def _image_format(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


async def store_uploaded_image(image: UploadFile) -> str:
    """Validate image metadata and content, then store it under a generated name."""
    filename = image.filename or ""
    extension = Path(filename).suffix.lower()
    data = await image.read(settings.freshness_max_upload_bytes + 1)
    await image.close()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded image is empty.")
    if len(data) > settings.freshness_max_upload_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Uploaded image exceeds the size limit.")
    detected_format = _image_format(data)
    if detected_format is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded content is not a supported image.")
    allowed = _FORMATS[detected_format]
    if extension not in allowed["extensions"] or image.content_type not in allowed["content_types"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image filename or media type does not match its content.")
    safe_name = f"{uuid4().hex}{next(iter(allowed['extensions']))}"
    (upload_directory() / safe_name).write_bytes(data)
    return f"freshness/{safe_name}"


def get_batch(db: Session, food_batch_id: int) -> FoodBatch | None:
    return db.get(FoodBatch, food_batch_id)


def get_analysis(db: Session, analysis_id: int) -> FreshnessAnalysis | None:
    return db.get(FreshnessAnalysis, analysis_id)


def list_analyses(db: Session, food_batch_id: int) -> list[FreshnessAnalysis]:
    return list(db.scalars(select(FreshnessAnalysis).where(FreshnessAnalysis.food_batch_id == food_batch_id).order_by(FreshnessAnalysis.analyzed_at.desc(), FreshnessAnalysis.id.desc())))


def analyze_freshness(db: Session, food_batch_id: int, image_reference: str) -> FreshnessAnalysis:
    """Run the trained image classifier and persist its raw prediction."""
    prediction = predict_freshness(upload_directory() / Path(image_reference).name)
    batch = get_batch(db, food_batch_id)
    product_name = batch.food_item.name if batch and batch.food_item else ""
    is_supported_product = any(name in product_name.lower() for name in SUPPORTED_FRUIT_NAMES)
    analysis = FreshnessAnalysis(
        food_batch_id=food_batch_id,
        image_path=image_reference,
        analysis_result={
            "status": "complete",
            "model_status": "complete",
            "model": "final_food_freshness_model.keras",
            "prediction_source": "trained_ml_model",
            "model_scope": {
                "supported": is_supported_product,
                "supported_products": ["apples", "bananas", "oranges"],
                "message": (
                    "The selected inventory product is within the model's supported fruit classes."
                    if is_supported_product
                    else "This model supports apples, bananas, and oranges only. The raw class output must not be interpreted as a reliable freshness assessment for this selected product."
                ),
            },
            **prediction,
        },
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


def delete_analysis(db: Session, analysis: FreshnessAnalysis) -> None:
    """Delete its record and only a generated file inside the configured directory."""
    reference = analysis.image_path or ""
    db.delete(analysis)
    db.commit()
    if reference.startswith("freshness/"):
        candidate = upload_directory() / Path(reference).name
        if candidate.parent == upload_directory() and candidate.is_file():
            candidate.unlink()
