"""Food batch endpoints."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status

from app.core.enums import Permission, RoleName
from app.deps import CurrentUser, DbSession, Pagination, RequestMeta, require_permissions
from app.freshness import service as freshness_service
from app.inventory import service as inventory_service
from app.recommendations.engine import active_for_batch, serialise_recommendation
from app.repositories.food import BatchRepository, ImageRepository
from app.schemas.common import Message, Page
from app.schemas.product import (
    BatchCreate,
    BatchDetailOut,
    BatchOut,
    BatchQuantityAdjust,
    BatchUpdate,
    RotationPlanOut,
)
from app.services.storage_backend import get_storage
from app.shelf_life import service as shelf_life_service
from app.storage.service import batch_storage_snapshot

router = APIRouter(prefix="/batches", tags=["Batches"])


@router.get(
    "",
    response_model=Page[BatchOut],
    summary="List / search batches",
    description=(
        "Full search surface: free text, category, status, freshness band, storage "
        "location, batch number, expiry window and purchase-date range, with sorting "
        "and pagination. Consumers only ever see their own batches."
    ),
)
def list_batches(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.BATCH_READ))],
    pagination: Pagination,
    q: str | None = Query(default=None, description="Free-text search"),
    product_id: int | None = None,
    category_slug: str | None = None,
    status_filter: list[str] | None = Query(default=None, alias="status"),
    freshness_category: list[str] | None = Query(default=None),
    storage_location: str | None = None,
    batch_number: str | None = None,
    expiring_within_days: int | None = Query(default=None, ge=0, le=365),
    expired: bool | None = None,
    purchased_from: date | None = None,
    purchased_to: date | None = None,
    min_freshness: float | None = Query(default=None, ge=0, le=100),
    max_freshness: float | None = Query(default=None, ge=0, le=100),
    include_archived: bool = False,
    sort_by: str = Query(default="created_at"),
    sort_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
) -> Page[BatchOut]:
    repo = BatchRepository(db)
    stmt = repo.search(
        query=q,
        product_id=product_id,
        category_slug=category_slug,
        status=status_filter,
        freshness_category=freshness_category,
        storage_location=storage_location,
        batch_number=batch_number,
        expiring_within_days=expiring_within_days,
        expired=expired,
        purchased_from=purchased_from,
        purchased_to=purchased_to,
        min_freshness=min_freshness,
        max_freshness=max_freshness,
        include_archived=include_archived,
        # Consumers are scoped to their own data at the query level.
        created_by_id=user.id if user.role_name == RoleName.CONSUMER.value else None,
    )
    stmt = repo.apply_sort(stmt, sort_by, sort_dir)
    rows, total = repo.paginate(stmt, page=pagination.page, page_size=pagination.page_size)
    items = [
        BatchOut.model_validate(inventory_service.serialise_batch(db, batch)) for batch in rows
    ]
    return Page.build(items, total=total, page=pagination.page, page_size=pagination.page_size)


@router.get(
    "/rotation",
    response_model=RotationPlanOut,
    summary="FIFO / FEFO rotation plan",
    description="Ranked pick list. Higher rotation priority means the batch should be "
    "used or sold sooner.",
)
def rotation_plan(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.INVENTORY_READ))],
    strategy: str = Query(default="FEFO", pattern="^(FIFO|FEFO|fifo|fefo)$"),
    storage_location: str | None = None,
    category_slug: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
) -> RotationPlanOut:
    from app.recommendations.rotation import build_rotation_plan

    plan = build_rotation_plan(
        db,
        strategy=strategy.upper(),
        owner_id=user.id if user.role_name == RoleName.CONSUMER.value else None,
        storage_location=storage_location,
        category_slug=category_slug,
        limit=limit,
    )
    return RotationPlanOut.model_validate(plan)


@router.get(
    "/{batch_id}",
    response_model=BatchDetailOut,
    summary="Batch detail with latest analysis and recommendations",
)
def get_batch(
    batch_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.BATCH_READ))],
) -> BatchDetailOut:
    repo = BatchRepository(db)
    batch = repo.get_or_404(batch_id, "Batch")
    inventory_service.assert_batch_access(user, batch, db)

    payload = inventory_service.serialise_batch(db, batch)
    assessment = freshness_service.latest_for_batch(db, batch.id)
    shelf_life = shelf_life_service.latest_for_batch(db, batch.id)
    storage = get_storage()

    payload["latest_assessment"] = (
        freshness_service.serialise_assessment(assessment) if assessment else None
    )
    payload["latest_shelf_life"] = (
        shelf_life_service.serialise(shelf_life) if shelf_life else None
    )
    payload["storage_condition"] = batch_storage_snapshot(db, batch)
    payload["recommendations"] = [
        serialise_recommendation(r) for r in active_for_batch(db, batch.id)
    ]
    payload["images"] = [
        {
            "id": image.id,
            "url": storage.url_for(image.storage_key),
            "overlay_url": (
                storage.url_for(image.overlay_storage_key) if image.overlay_storage_key else None
            ),
            "original_filename": image.original_filename,
            "size_bytes": image.size_bytes,
            "width": image.width,
            "height": image.height,
            "is_analyzed": image.is_analyzed,
            "created_at": image.created_at,
        }
        for image in ImageRepository(db).for_batch(batch.id, limit=12)
    ]
    return BatchDetailOut.model_validate(payload)


@router.post(
    "",
    response_model=BatchOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a batch",
    description="Auto-generates a batch number and a provisional expiry date when they "
    "are not supplied, and can add the batch to your inventory in one step.",
)
def create_batch(
    payload: BatchCreate,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.BATCH_WRITE))],
) -> BatchOut:
    data = payload.model_dump()
    for key in ("packaging_type", "air_circulation", "light_exposure"):
        if data.get(key) is not None:
            data[key] = str(data[key])
    batch = inventory_service.create_batch(db, data, user, meta)
    db.commit()
    db.refresh(batch)
    return BatchOut.model_validate(inventory_service.serialise_batch(db, batch))


@router.put("/{batch_id}", response_model=BatchOut, summary="Update a batch")
def update_batch(
    batch_id: int,
    payload: BatchUpdate,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.BATCH_WRITE))],
) -> BatchOut:
    batch = BatchRepository(db).get_or_404(batch_id, "Batch")
    inventory_service.assert_batch_access(user, batch, db)
    inventory_service.update_batch(
        db, batch, payload.model_dump(exclude_unset=True), user, meta
    )
    db.commit()
    db.refresh(batch)
    return BatchOut.model_validate(inventory_service.serialise_batch(db, batch))


@router.patch(
    "/{batch_id}/quantity",
    response_model=BatchOut,
    summary="Adjust batch quantity",
)
def adjust_quantity(
    batch_id: int,
    payload: BatchQuantityAdjust,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.BATCH_WRITE))],
) -> BatchOut:
    batch = BatchRepository(db).get_or_404(batch_id, "Batch")
    inventory_service.assert_batch_access(user, batch, db)
    inventory_service.adjust_quantity(db, batch, payload.delta, user, payload.reason, meta)
    db.commit()
    db.refresh(batch)
    return BatchOut.model_validate(inventory_service.serialise_batch(db, batch))


@router.delete(
    "/{batch_id}",
    response_model=Message,
    summary="Archive (or permanently delete) a batch",
)
def delete_batch(
    batch_id: int,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.BATCH_WRITE))],
    hard: bool = Query(
        default=False, description="Admins only: permanently delete instead of archiving."
    ),
) -> Message:
    batch = BatchRepository(db).get_or_404(batch_id, "Batch")
    inventory_service.assert_batch_access(user, batch, db)
    permanent = hard and user.role_name == RoleName.ADMIN.value
    number = batch.batch_number
    inventory_service.delete_batch(db, batch, user, hard=permanent, request_meta=meta)
    db.commit()
    return Message(
        message=f"Batch {number} {'deleted' if permanent else 'archived'}."
    )


@router.get(
    "/{batch_id}/assessments",
    response_model=list[dict],
    summary="Freshness assessment history for a batch",
)
def batch_assessments(
    batch_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_READ))],
    limit: int = Query(default=30, ge=1, le=200),
) -> list[dict]:
    batch = BatchRepository(db).get_or_404(batch_id, "Batch")
    inventory_service.assert_batch_access(user, batch, db)
    return [
        freshness_service.serialise_assessment(a, include_explanation=False)
        for a in freshness_service.history_for_batch(db, batch_id, limit)
    ]
