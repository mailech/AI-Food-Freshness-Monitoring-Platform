"""Replaceable, non-ML freshness analysis and safe upload storage."""

from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.freshness_analysis import FreshnessAnalysis
from app.models.food_batch import FoodBatch

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
    """Persist a transparent placeholder until a model implementation is supplied."""
    analysis = FreshnessAnalysis(
        food_batch_id=food_batch_id,
        image_path=image_reference,
        analysis_result={
            "status": "pending_model_integration",
            "message": "Image stored; no trained freshness model is configured.",
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
