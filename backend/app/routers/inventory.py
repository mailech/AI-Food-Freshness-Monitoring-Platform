"""Inventory item endpoints (a user's own holdings)."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status

from app.core.enums import InventoryStatus, Permission, RoleName
from app.core.errors import ConflictError, PermissionDeniedError
from app.deps import DbSession, Pagination, RequestMeta, require_permissions
from app.inventory import service as inventory_service
from app.models import InventoryItem
from app.repositories.food import BatchRepository, InventoryRepository
from app.schemas.common import Message, Page
from app.schemas.product import (
    BatchOut,
    InventoryItemCreate,
    InventoryItemOut,
    InventoryItemUpdate,
)
from app.services.audit import record_audit
from app.core.enums import AuditAction

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def _serialise(db, item: InventoryItem) -> dict[str, Any]:
    payload = {c.name: getattr(item, c.name) for c in item.__table__.columns}
    payload["quantity"] = float(item.quantity or 0)
    payload["batch"] = (
        BatchOut.model_validate(inventory_service.serialise_batch(db, item.batch)).model_dump()
        if item.batch
        else None
    )
    payload["days_until_expiry"] = inventory_service.days_until(item.expected_expiry_date)
    return payload


@router.get(
    "",
    response_model=Page[InventoryItemOut],
    summary="List my inventory",
    description="Search, category/status/location filters, expiry window, sorting and "
    "pagination. Privileged roles may pass `owner_id` to inspect another user's holdings.",
)
def list_inventory(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.INVENTORY_READ))],
    pagination: Pagination,
    q: str | None = Query(default=None),
    status_filter: list[str] | None = Query(default=None, alias="status"),
    category_slug: str | None = None,
    storage_location: str | None = None,
    expiring_within_days: int | None = Query(default=None, ge=0, le=365),
    include_consumed: bool = False,
    include_discarded: bool = False,
    owner_id: int | None = Query(default=None, description="Privileged roles only"),
    sort_by: str = Query(default="expected_expiry_date"),
    sort_dir: str = Query(default="asc", pattern="^(asc|desc)$"),
) -> Page[InventoryItemOut]:
    from app.deps import is_privileged

    scope_owner = user.id
    if owner_id is not None:
        if not is_privileged(user):
            raise PermissionDeniedError("You may only view your own inventory.")
        scope_owner = owner_id
    elif is_privileged(user):
        scope_owner = None  # managers see the whole tenant by default

    repo = InventoryRepository(db)
    stmt = repo.search(
        owner_id=scope_owner,
        query=q,
        status=status_filter,
        category_slug=category_slug,
        storage_location=storage_location,
        expiring_within_days=expiring_within_days,
        include_consumed=include_consumed,
        include_discarded=include_discarded,
    )
    stmt = repo.apply_sort(stmt, sort_by, sort_dir)
    rows, total = repo.paginate(stmt, page=pagination.page, page_size=pagination.page_size)
    items = [InventoryItemOut.model_validate(_serialise(db, item)) for item in rows]
    return Page.build(items, total=total, page=pagination.page, page_size=pagination.page_size)


@router.get("/locations", response_model=list[str], summary="Distinct storage locations")
def inventory_locations(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.INVENTORY_READ))],
) -> list[str]:
    from app.deps import is_privileged

    return InventoryRepository(db).locations(None if is_privileged(user) else user.id)


@router.get(
    "/summary",
    response_model=dict,
    summary="Inventory status counts and health index",
)
def inventory_summary(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.INVENTORY_READ))],
) -> dict:
    from app.analytics.service import inventory_health
    from app.deps import is_privileged

    return inventory_health(db, owner_id=None if is_privileged(user) else user.id)


@router.post(
    "",
    response_model=InventoryItemOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a batch to my inventory",
)
def create_inventory_item(
    payload: InventoryItemCreate,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.INVENTORY_WRITE))],
) -> InventoryItemOut:
    batch = BatchRepository(db).get_or_404(payload.batch_id, "Batch")
    repo = InventoryRepository(db)
    if repo.for_owner_and_batch(user.id, batch.id):
        raise ConflictError(
            "This batch is already in your inventory. Update the existing item instead.",
            code="INVENTORY_ITEM_EXISTS",
        )

    item = InventoryItem(
        owner_id=user.id,
        batch_id=batch.id,
        quantity=payload.quantity,
        unit=payload.unit or batch.unit,
        storage_location=payload.storage_location or batch.storage_location,
        purchase_date=payload.purchase_date or batch.purchase_date,
        storage_date=payload.storage_date or batch.storage_date,
        expected_expiry_date=payload.expected_expiry_date or batch.expected_expiry_date,
        status=batch.status,
        notes=payload.notes,
    )
    db.add(item)
    db.flush()

    from app.recommendations.rotation import refresh_rotation_priorities

    refresh_rotation_priorities(db, owner_id=user.id)
    record_audit(
        db,
        action=AuditAction.CREATE,
        user=user,
        entity_type="inventory_item",
        entity_id=str(item.id),
        description=f"Added batch {batch.batch_number} to inventory",
        request_meta=meta,
    )
    db.commit()
    db.refresh(item)
    return InventoryItemOut.model_validate(_serialise(db, item))


@router.get("/{item_id}", response_model=InventoryItemOut, summary="Get an inventory item")
def get_inventory_item(
    item_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.INVENTORY_READ))],
) -> InventoryItemOut:
    from app.deps import is_privileged

    item = InventoryRepository(db).get_or_404(item_id, "Inventory item")
    if item.owner_id != user.id and not is_privileged(user):
        raise PermissionDeniedError("This inventory item belongs to another user.")
    return InventoryItemOut.model_validate(_serialise(db, item))


@router.put("/{item_id}", response_model=InventoryItemOut, summary="Update an inventory item")
def update_inventory_item(
    item_id: int,
    payload: InventoryItemUpdate,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.INVENTORY_WRITE))],
) -> InventoryItemOut:
    from app.deps import is_privileged

    item = InventoryRepository(db).get_or_404(item_id, "Inventory item")
    if item.owner_id != user.id and not is_privileged(user):
        raise PermissionDeniedError("This inventory item belongs to another user.")

    data = payload.model_dump(exclude_unset=True)
    if data.get("status") is not None:
        data["status"] = str(data["status"])
    for field, value in data.items():
        if value is not None:
            setattr(item, field, value)
    db.flush()

    from app.recommendations.rotation import refresh_rotation_priorities

    refresh_rotation_priorities(db, owner_id=item.owner_id)
    record_audit(
        db,
        action=AuditAction.UPDATE,
        user=user,
        entity_type="inventory_item",
        entity_id=str(item.id),
        description="Updated inventory item",
        metadata={"fields": sorted(data)},
        request_meta=meta,
    )
    db.commit()
    db.refresh(item)
    return InventoryItemOut.model_validate(_serialise(db, item))


@router.post(
    "/{item_id}/consume",
    response_model=InventoryItemOut,
    summary="Mark an item consumed (fully or partially)",
)
def consume_item(
    item_id: int,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.INVENTORY_WRITE))],
    quantity: float | None = Query(default=None, ge=0, description="Omit to consume everything"),
) -> InventoryItemOut:
    item = InventoryRepository(db).get_or_404(item_id, "Inventory item")
    if item.owner_id != user.id:
        raise PermissionDeniedError("This inventory item belongs to another user.")

    used = float(item.quantity or 0) if quantity is None else min(float(quantity), float(item.quantity or 0))
    item.quantity = float(item.quantity or 0) - used
    if item.quantity <= 0:
        item.consumed = True
    if item.batch is not None:
        inventory_service.adjust_quantity(
            db, item.batch, -used, user, "consumed from inventory", meta
        )
    db.commit()
    db.refresh(item)
    return InventoryItemOut.model_validate(_serialise(db, item))


@router.post(
    "/{item_id}/discard",
    response_model=InventoryItemOut,
    summary="Mark an item discarded (waste tracking)",
)
def discard_item(
    item_id: int,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.INVENTORY_WRITE))],
    reason: str | None = Query(default=None, max_length=200),
) -> InventoryItemOut:
    item = InventoryRepository(db).get_or_404(item_id, "Inventory item")
    if item.owner_id != user.id:
        raise PermissionDeniedError("This inventory item belongs to another user.")

    discarded_quantity = float(item.quantity or 0)
    item.discarded = True
    item.status = InventoryStatus.SPOILED.value
    item.quantity = 0
    if item.batch is not None and discarded_quantity > 0:
        inventory_service.adjust_quantity(
            db, item.batch, -discarded_quantity, user, reason or "discarded", meta
        )
    record_audit(
        db,
        action=AuditAction.UPDATE,
        user=user,
        entity_type="inventory_item",
        entity_id=str(item.id),
        description=f"Discarded {discarded_quantity:g} {item.unit}"
        + (f" ({reason})" if reason else ""),
        request_meta=meta,
    )
    db.commit()
    db.refresh(item)
    return InventoryItemOut.model_validate(_serialise(db, item))


@router.delete("/{item_id}", response_model=Message, summary="Remove an inventory item")
def delete_inventory_item(
    item_id: int,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.INVENTORY_WRITE))],
) -> Message:
    from app.deps import is_privileged

    item = InventoryRepository(db).get_or_404(item_id, "Inventory item")
    if item.owner_id != user.id and not is_privileged(user):
        raise PermissionDeniedError("This inventory item belongs to another user.")
    record_audit(
        db,
        action=AuditAction.DELETE,
        user=user,
        entity_type="inventory_item",
        entity_id=str(item.id),
        description="Removed inventory item",
        request_meta=meta,
    )
    db.delete(item)
    db.commit()
    return Message(message="Inventory item removed.")
