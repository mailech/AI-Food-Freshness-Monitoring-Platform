"""Product, batch and inventory-item services."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.category_rules import get_profile
from app.core.enums import AuditAction, InventoryStatus, RoleName
from app.core.errors import BusinessRuleError, ConflictError, NotFoundError, PermissionDeniedError
from app.inventory.categories import base_shelf_life_days, resolve_category
from app.models import (
    Alert,
    FoodBatch,
    FoodImage,
    FoodProduct,
    FreshnessAssessment,
    InventoryItem,
    User,
)
from app.repositories.food import BatchRepository, ProductRepository
from app.services.audit import record_audit


# ------------------------------------------------------------------ helpers
def days_until(target: date | None) -> int | None:
    if target is None:
        return None
    return (target - date.today()).days


def age_in_days(batch: FoodBatch) -> float | None:
    """Product age: from production, else purchase, else storage, else creation."""
    reference = (
        batch.production_date
        or batch.purchase_date
        or batch.storage_date
        or (batch.created_at.date() if batch.created_at else None)
    )
    if reference is None:
        return None
    return max(0.0, float((date.today() - reference).days))


def storage_duration_days(batch: FoodBatch) -> float:
    reference = batch.storage_date or batch.purchase_date or (
        batch.created_at.date() if batch.created_at else date.today()
    )
    return max(0.0, float((date.today() - reference).days))


def can_access_batch(user: User, batch: FoodBatch, db: Session) -> bool:
    """Consumers only see their own batches; other roles see the whole tenant."""
    if user.role_name != RoleName.CONSUMER.value:
        return True
    if batch.created_by_id == user.id:
        return True
    owned = db.scalar(
        select(func.count(InventoryItem.id)).where(
            InventoryItem.owner_id == user.id, InventoryItem.batch_id == batch.id
        )
    )
    return bool(owned)


def assert_batch_access(user: User, batch: FoodBatch, db: Session) -> None:
    if not can_access_batch(user, batch, db):
        raise PermissionDeniedError(
            "This batch belongs to another user.", code="BATCH_FORBIDDEN"
        )


# ----------------------------------------------------------------- products
def create_product(
    db: Session, payload: dict[str, Any], user: User, request_meta: dict | None = None
) -> FoodProduct:
    repo = ProductRepository(db)
    category = resolve_category(
        db, category_id=payload.pop("category_id", None), category_slug=payload.pop("category_slug", None)
    )
    sku = payload.get("sku")
    if sku and repo.by_sku(sku):
        raise ConflictError(f"A product with SKU '{sku}' already exists.", code="SKU_EXISTS")

    packaging = payload.pop("default_packaging", None)
    profile = get_profile(category.slug)

    product = FoodProduct(
        **payload,
        category_id=category.id,
        default_packaging=str(packaging) if packaging else None,
        created_by_id=user.id,
    )
    if not product.default_unit:
        product.default_unit = profile.default_unit
    db.add(product)
    db.flush()

    record_audit(
        db,
        action=AuditAction.CREATE,
        user=user,
        entity_type="food_product",
        entity_id=str(product.id),
        description=f"Created product '{product.name}' in {category.name}",
        request_meta=request_meta,
    )
    return product


def update_product(
    db: Session, product: FoodProduct, payload: dict[str, Any], user: User,
    request_meta: dict | None = None,
) -> FoodProduct:
    if "category_id" in payload and payload["category_id"] is not None:
        resolve_category(db, category_id=payload["category_id"])
    if "sku" in payload and payload["sku"]:
        existing = ProductRepository(db).by_sku(payload["sku"])
        if existing and existing.id != product.id:
            raise ConflictError("Another product already uses this SKU.", code="SKU_EXISTS")
    if "default_packaging" in payload and payload["default_packaging"] is not None:
        payload["default_packaging"] = str(payload["default_packaging"])

    for key, value in payload.items():
        if value is not None or key in {"description", "storage_instructions"}:
            setattr(product, key, value)
    db.flush()

    record_audit(
        db,
        action=AuditAction.UPDATE,
        user=user,
        entity_type="food_product",
        entity_id=str(product.id),
        description=f"Updated product '{product.name}'",
        metadata={"fields": sorted(payload)},
        request_meta=request_meta,
    )
    return product


def delete_product(
    db: Session, product: FoodProduct, user: User, request_meta: dict | None = None
) -> None:
    """Soft-delete when batches exist (preserves analysis history), else hard-delete."""
    batch_count = db.scalar(
        select(func.count(FoodBatch.id)).where(FoodBatch.product_id == product.id)
    ) or 0

    record_audit(
        db,
        action=AuditAction.DELETE,
        user=user,
        entity_type="food_product",
        entity_id=str(product.id),
        description=(
            f"Deactivated product '{product.name}' ({batch_count} batch(es) retained)"
            if batch_count
            else f"Deleted product '{product.name}'"
        ),
        request_meta=request_meta,
    )

    if batch_count:
        product.is_active = False
        db.flush()
        return
    db.delete(product)
    db.flush()


def serialise_product(db: Session, product: FoodProduct) -> dict[str, Any]:
    from app.inventory.categories import serialise_category

    batch_count = db.scalar(
        select(func.count(FoodBatch.id)).where(FoodBatch.product_id == product.id)
    ) or 0
    return {
        **{c.name: getattr(product, c.name) for c in product.__table__.columns},
        "category": serialise_category(product.category) if product.category else None,
        "batch_count": int(batch_count),
    }


# ------------------------------------------------------------------ batches
def create_batch(
    db: Session, payload: dict[str, Any], user: User, request_meta: dict | None = None
) -> FoodBatch:
    repo = BatchRepository(db)
    product = db.get(FoodProduct, payload["product_id"])
    if product is None:
        raise NotFoundError(f"Product {payload['product_id']} was not found.", code="PRODUCT_NOT_FOUND")

    batch_number = payload.get("batch_number") or repo.next_batch_number()
    if repo.by_number(batch_number):
        raise ConflictError(f"Batch '{batch_number}' already exists.", code="BATCH_EXISTS")

    packaging = payload.get("packaging_type") or product.default_packaging
    unit = payload.get("unit") or product.default_unit
    purchase_date = payload.get("purchase_date") or date.today()
    storage_date = payload.get("storage_date") or purchase_date

    expected_expiry = payload.get("expected_expiry_date")
    if expected_expiry is None:
        # Derive a provisional best-before from the product/category shelf life.
        base_days = base_shelf_life_days(product.category, product.shelf_life_days)
        from datetime import timedelta

        expected_expiry = (payload.get("production_date") or purchase_date) + timedelta(
            days=int(round(base_days))
        )

    batch = FoodBatch(
        batch_number=batch_number,
        product_id=product.id,
        quantity=payload.get("quantity") or 0,
        unit=unit,
        production_date=payload.get("production_date"),
        purchase_date=purchase_date,
        storage_date=storage_date,
        expected_expiry_date=expected_expiry,
        packaging_type=str(packaging) if packaging else None,
        storage_location=payload.get("storage_location"),
        supplier=payload.get("supplier"),
        cost_per_unit=payload.get("cost_per_unit"),
        notes=payload.get("notes"),
        status=InventoryStatus.FRESH.value,
        created_by_id=user.id,
    )
    db.add(batch)
    db.flush()

    # Optional initial storage environment.
    if any(payload.get(k) is not None for k in ("temperature_c", "humidity_pct", "air_circulation", "light_exposure")):
        from app.storage.service import upsert_storage_condition

        upsert_storage_condition(
            db,
            batch,
            temperature_c=payload.get("temperature_c"),
            humidity_pct=payload.get("humidity_pct"),
            air_circulation=payload.get("air_circulation"),
            light_exposure=payload.get("light_exposure"),
            location_name=payload.get("storage_location"),
        )

    if payload.get("add_to_my_inventory", True):
        db.add(
            InventoryItem(
                owner_id=user.id,
                batch_id=batch.id,
                quantity=batch.quantity,
                unit=batch.unit,
                storage_location=batch.storage_location,
                purchase_date=batch.purchase_date,
                storage_date=batch.storage_date,
                expected_expiry_date=batch.expected_expiry_date,
                status=batch.status,
            )
        )
        db.flush()

    record_audit(
        db,
        action=AuditAction.CREATE,
        user=user,
        entity_type="food_batch",
        entity_id=str(batch.id),
        description=f"Created batch {batch.batch_number} of '{product.name}'",
        metadata={"quantity": float(batch.quantity), "unit": batch.unit},
        request_meta=request_meta,
    )
    return batch


def update_batch(
    db: Session, batch: FoodBatch, payload: dict[str, Any], user: User,
    request_meta: dict | None = None,
) -> FoodBatch:
    if "packaging_type" in payload and payload["packaging_type"] is not None:
        payload["packaging_type"] = str(payload["packaging_type"])
    if "status" in payload and payload["status"] is not None:
        payload["status"] = str(payload["status"])

    changed = {}
    for key, value in payload.items():
        if value is None:
            continue
        if getattr(batch, key, None) != value:
            changed[key] = value
            setattr(batch, key, value)
    db.flush()

    # Keep the owner's inventory rows consistent with the batch.
    if {"expected_expiry_date", "status", "storage_location"} & set(changed):
        for item in batch.inventory_items:
            if "expected_expiry_date" in changed:
                item.expected_expiry_date = batch.expected_expiry_date
            if "status" in changed:
                item.status = batch.status
            if "storage_location" in changed:
                item.storage_location = batch.storage_location
        db.flush()

    record_audit(
        db,
        action=AuditAction.UPDATE,
        user=user,
        entity_type="food_batch",
        entity_id=str(batch.id),
        description=f"Updated batch {batch.batch_number}",
        metadata={"fields": sorted(changed)},
        request_meta=request_meta,
    )
    return batch


def delete_batch(
    db: Session, batch: FoodBatch, user: User, *, hard: bool = False,
    request_meta: dict | None = None,
) -> None:
    """Archive by default so assessments and audit history stay intact."""
    record_audit(
        db,
        action=AuditAction.DELETE,
        user=user,
        entity_type="food_batch",
        entity_id=str(batch.id),
        description=("Deleted" if hard else "Archived") + f" batch {batch.batch_number}",
        request_meta=request_meta,
    )
    if hard:
        db.delete(batch)
    else:
        batch.is_archived = True
    db.flush()


def adjust_quantity(
    db: Session, batch: FoodBatch, delta: float, user: User, reason: str | None = None,
    request_meta: dict | None = None,
) -> FoodBatch:
    new_quantity = float(batch.quantity or 0) + float(delta)
    if new_quantity < 0:
        raise BusinessRuleError(
            f"Cannot remove {abs(delta)} {batch.unit}: only {float(batch.quantity or 0)} available.",
            code="INSUFFICIENT_QUANTITY",
        )
    batch.quantity = new_quantity
    db.flush()
    record_audit(
        db,
        action=AuditAction.UPDATE,
        user=user,
        entity_type="food_batch",
        entity_id=str(batch.id),
        description=f"Adjusted quantity by {delta:+g} {batch.unit}"
        + (f" ({reason})" if reason else ""),
        metadata={"delta": delta, "new_quantity": new_quantity, "reason": reason},
        request_meta=request_meta,
    )
    return batch


def refresh_batch_status(db: Session, batch: FoodBatch) -> str:
    """Derive the inventory status from expiry and the latest freshness class."""
    today = date.today()
    expiry = batch.expected_expiry_date
    if expiry and expiry < today:
        batch.status = InventoryStatus.EXPIRED.value
    elif batch.current_freshness_category:
        status = InventoryStatus.parse(batch.current_freshness_category, InventoryStatus.GOOD)
        batch.status = str(status)
    for item in batch.inventory_items:
        item.status = batch.status
    db.flush()
    return batch.status


def serialise_batch(db: Session, batch: FoodBatch) -> dict[str, Any]:
    product = batch.product
    category = product.category if product else None
    image_count = db.scalar(
        select(func.count(FoodImage.id)).where(FoodImage.batch_id == batch.id)
    ) or 0
    assessment_count = db.scalar(
        select(func.count(FreshnessAssessment.id)).where(
            FreshnessAssessment.batch_id == batch.id
        )
    ) or 0
    open_alerts = db.scalar(
        select(func.count(Alert.id)).where(
            Alert.batch_id == batch.id, Alert.resolved.is_(False)
        )
    ) or 0

    return {
        **{c.name: getattr(batch, c.name) for c in batch.__table__.columns},
        "quantity": float(batch.quantity or 0),
        "cost_per_unit": float(batch.cost_per_unit) if batch.cost_per_unit is not None else None,
        "product": {
            "id": product.id,
            "name": product.name,
            "brand": product.brand,
            "sku": product.sku,
            "category_slug": category.slug if category else None,
            "category_name": category.name if category else None,
            "default_unit": product.default_unit,
        }
        if product
        else None,
        "days_until_expiry": days_until(batch.expected_expiry_date),
        "age_days": age_in_days(batch),
        "image_count": int(image_count),
        "assessment_count": int(assessment_count),
        "open_alert_count": int(open_alerts),
    }


def touch_assessment_summary(
    db: Session,
    batch: FoodBatch,
    *,
    freshness_score: float,
    freshness_category: str,
    remaining_days: float | None,
    predicted_expiry: date | None,
) -> None:
    """Denormalise the latest analysis onto the batch for fast dashboards."""
    batch.current_freshness_score = float(freshness_score)
    batch.current_freshness_category = str(freshness_category)
    batch.remaining_shelf_life_days = (
        float(remaining_days) if remaining_days is not None else None
    )
    batch.predicted_expiry_date = predicted_expiry
    batch.last_assessed_at = datetime.now(UTC)
    refresh_batch_status(db, batch)
