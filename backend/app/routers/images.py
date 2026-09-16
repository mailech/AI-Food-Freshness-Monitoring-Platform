"""Food image upload and retrieval."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile, status

from app.core.enums import AuditAction, Permission
from app.core.errors import InvalidImageError, NotFoundError
from app.deps import CurrentUser, DbSession, Pagination, RequestMeta, require_permissions
from app.inventory import service as inventory_service
from app.ml.preprocessing.image_ops import decode, validate_image_bytes
from app.models import FoodImage
from app.repositories.food import BatchRepository, ImageRepository
from app.schemas.common import Message, Page
from app.schemas.product import ImageOut, ImageUploadResponse
from app.services.audit import record_audit
from app.services.storage_backend import build_storage_key, get_storage, storage_info

router = APIRouter(prefix="/images", tags=["Images"])


def _serialise(image: FoodImage) -> dict[str, Any]:
    storage = get_storage()
    payload = {c.name: getattr(image, c.name) for c in image.__table__.columns}
    payload["url"] = storage.url_for(image.storage_key)
    payload["overlay_url"] = (
        storage.url_for(image.overlay_storage_key) if image.overlay_storage_key else None
    )
    return payload


@router.get("/config", response_model=dict, summary="Upload constraints for this deployment")
def upload_config(user: CurrentUser) -> dict:
    return storage_info()


@router.post(
    "",
    response_model=ImageUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a food image",
    description=(
        "Accepts JPG/JPEG/PNG only. Validation checks the declared MIME type, the file "
        "extension **and** the actual magic bytes, so a renamed executable is rejected. "
        "Filenames are sanitised and the stored key is generated server-side."
    ),
)
async def upload_image(
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_CREATE))],
    file: Annotated[UploadFile, File(description="JPG/JPEG/PNG image")],
    batch_id: Annotated[int | None, Form()] = None,
    caption: Annotated[str | None, Form(max_length=255)] = None,
) -> ImageUploadResponse:
    data = await file.read()
    validate_image_bytes(data, file.content_type, file.filename)

    batch = None
    if batch_id is not None:
        batch = BatchRepository(db).get_or_404(batch_id, "Batch")
        inventory_service.assert_batch_access(user, batch, db)

    storage = get_storage()
    checksum = storage.checksum(data)

    # Identical re-upload for the same batch: reuse the existing record.
    existing = ImageRepository(db).by_checksum(checksum, batch_id)
    if existing is not None:
        return ImageUploadResponse(
            image=ImageOut.model_validate(_serialise(existing)),
            message="This image was already uploaded; reusing the existing record.",
        )

    bgr, (width, height) = decode(data)
    key = build_storage_key(file.filename or "upload.jpg", owner_id=user.id)
    storage.save(key, data, file.content_type or "image/jpeg")

    image = FoodImage(
        batch_id=batch.id if batch else None,
        uploaded_by_id=user.id,
        storage_key=key,
        storage_backend=storage.name,
        original_filename=(file.filename or "upload.jpg")[:255],
        content_type=file.content_type or "image/jpeg",
        size_bytes=len(data),
        width=width,
        height=height,
        checksum_sha256=checksum,
        caption=caption,
    )
    db.add(image)
    db.flush()

    record_audit(
        db,
        action=AuditAction.IMAGE_UPLOAD,
        user=user,
        entity_type="food_image",
        entity_id=str(image.id),
        description=f"Uploaded {image.original_filename} ({len(data)} bytes)"
        + (f" for batch {batch.batch_number}" if batch else ""),
        metadata={"batch_id": batch.id if batch else None, "checksum": checksum[:16]},
        request_meta=meta,
    )
    db.commit()
    db.refresh(image)
    return ImageUploadResponse(image=ImageOut.model_validate(_serialise(image)))


@router.get("", response_model=Page[ImageOut], summary="List images")
def list_images(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_READ))],
    pagination: Pagination,
    batch_id: int | None = None,
    analyzed: bool | None = None,
    mine: bool = Query(default=False, description="Only images I uploaded"),
) -> Page[ImageOut]:
    repo = ImageRepository(db)
    stmt = repo.search(
        batch_id=batch_id,
        uploaded_by_id=user.id if mine else None,
        analyzed=analyzed,
    )
    stmt = repo.apply_sort(stmt, "created_at", "desc")
    rows, total = repo.paginate(stmt, page=pagination.page, page_size=pagination.page_size)
    return Page.build(
        [ImageOut.model_validate(_serialise(image)) for image in rows],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/{image_id}", response_model=ImageOut, summary="Get image metadata")
def get_image(
    image_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_READ))],
) -> ImageOut:
    image = ImageRepository(db).get_or_404(image_id, "Image")
    return ImageOut.model_validate(_serialise(image))


@router.get(
    "/file/{storage_key:path}",
    summary="Download an image file",
    description="Serves the stored bytes. Requires authentication so uploads are not "
    "publicly enumerable.",
    response_class=Response,
)
def download_image(
    storage_key: str,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_READ))],
) -> Response:
    from sqlalchemy import or_, select

    image = db.scalar(
        select(FoodImage).where(
            or_(
                FoodImage.storage_key == storage_key,
                FoodImage.overlay_storage_key == storage_key,
            )
        )
    )
    if image is None:
        raise NotFoundError("Image not found.", code="IMAGE_NOT_FOUND")

    storage = get_storage()
    data = storage.read(storage_key)
    media_type = (
        image.content_type
        if storage_key == image.storage_key
        else "image/jpeg"
    )
    return Response(
        content=data,
        media_type=media_type,
        headers={
            "Cache-Control": "private, max-age=86400",
            "Content-Disposition": f'inline; filename="{image.original_filename}"',
            # Defence in depth: never let a stored file execute in the browser.
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete("/{image_id}", response_model=Message, summary="Delete an image")
def delete_image(
    image_id: int,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_CREATE))],
) -> Message:
    from app.deps import is_privileged

    image = ImageRepository(db).get_or_404(image_id, "Image")
    if image.uploaded_by_id != user.id and not is_privileged(user):
        raise InvalidImageError(
            "You may only delete images you uploaded.",
            code="PERMISSION_DENIED",
            status_code=403,
        )

    storage = get_storage()
    storage.delete(image.storage_key)
    if image.overlay_storage_key:
        storage.delete(image.overlay_storage_key)

    record_audit(
        db,
        action=AuditAction.DELETE,
        user=user,
        entity_type="food_image",
        entity_id=str(image.id),
        description=f"Deleted image {image.original_filename}",
        request_meta=meta,
    )
    db.delete(image)
    db.commit()
    return Message(message="Image deleted.")
