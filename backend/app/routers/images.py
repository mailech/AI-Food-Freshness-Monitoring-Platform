import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db import get_db
from app.ml.inference import assess_image
from app.models import User
from app.models.images import Assessment, ImageUpload
from app.models.inventory import FoodItem
from app.routers.auth import get_current_user
from app.routers.inventory import _get_owned_item
from app.schemas.images import AssessmentOut, ImageUploadOut

router = APIRouter(prefix="/inventory", tags=["images"])

settings = get_settings()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_BYTES = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024


def _save_file(item_id: int, content: bytes) -> tuple[str, str]:
    upload_root = Path(settings.UPLOAD_DIR) / str(item_id)
    upload_root.mkdir(parents=True, exist_ok=True)
    ext = ".jpg"
    name = f"{uuid.uuid4().hex}{ext}"
    path = upload_root / name
    path.write_bytes(content)
    return str(path), f"/uploads/{item_id}/{name}"


@router.post(
    "/items/{item_id}/images",
    response_model=ImageUploadOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_image(
    item_id: int,
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _get_owned_item(item_id, user, db)

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_TYPES))}",
        )
    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File exceeds {settings.MAX_IMAGE_SIZE_MB} MB limit",
        )

    stored_path, public_path = _save_file(item_id, content)
    upload = ImageUpload(item_id=item_id, file_path=stored_path, uploaded_by=user.id)
    db.add(upload)
    db.flush()

    result = assess_image(content, item_name=item.name if item else "")
    assessment = Assessment(
        item_id=item_id,
        image_id=upload.id,
        predicted_class=result["predicted_class"],
        is_fresh=result["is_fresh"],
        confidence=result["confidence"],
        spoilage_probability=result["spoilage_probability"],
        freshness_score=result["freshness_score"],
        freshness_category=result["category"],
    )
    db.add(assessment)
    db.commit()
    db.refresh(upload)
    db.refresh(assessment)

    out = ImageUploadOut.model_validate(upload)
    out.assessment = AssessmentOut.model_validate(assessment)
    return out


@router.get("/items/{item_id}/images", response_model=list[ImageUploadOut])
def list_images(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_item(item_id, user, db)
    uploads = (
        db.query(ImageUpload)
        .filter(ImageUpload.item_id == item_id)
        .order_by(ImageUpload.uploaded_at.desc())
        .all()
    )
    assessments = {
        a.image_id: a
        for a in db.query(Assessment).filter(Assessment.item_id == item_id).all()
    }
    out = []
    for u in uploads:
        dto = ImageUploadOut.model_validate(u)
        if u.id in assessments:
            dto.assessment = AssessmentOut.model_validate(assessments[u.id])
        out.append(dto)
    return out


@router.get("/items/{item_id}/assessments/latest", response_model=AssessmentOut)
def latest_assessment(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_item(item_id, user, db)
    assessment = (
        db.query(Assessment)
        .filter(Assessment.item_id == item_id)
        .order_by(Assessment.assessed_at.desc())
        .first()
    )
    if assessment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No assessments for this item")
    return assessment


@router.delete("/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image(
    image_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    upload = db.get(ImageUpload, image_id)
    if upload is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    _get_owned_item(upload.item_id, user, db)
    db.query(Assessment).filter(Assessment.image_id == image_id).delete()
    Path(upload.file_path).unlink(missing_ok=True)
    db.delete(upload)
    db.commit()
