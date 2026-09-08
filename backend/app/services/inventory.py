"""Database operations for inventory items and batches."""

from datetime import date, timedelta

from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import FoodCategory
from app.models.food_batch import FoodBatch
from app.models.food_item import FoodItem
from app.schemas.inventory import ExpiryStatus, FoodBatchCreate, FoodBatchUpdate, FoodItemCreate, FoodItemUpdate


def get_food_item(db: Session, item_id: int) -> FoodItem | None:
    return db.get(FoodItem, item_id)


def list_food_items(db: Session, search: str | None, category: FoodCategory | None) -> list[FoodItem]:
    statement: Select[tuple[FoodItem]] = select(FoodItem).order_by(FoodItem.id)
    if search and (normalized_search := search.strip()):
        statement = statement.where(FoodItem.name.ilike(f"%{normalized_search}%"))
    if category is not None:
        statement = statement.where(FoodItem.category == category)
    return list(db.scalars(statement))


def create_food_item(db: Session, payload: FoodItemCreate) -> FoodItem:
    item = FoodItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_food_item(db: Session, item: FoodItem, payload: FoodItemUpdate) -> FoodItem:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


def delete_food_item(db: Session, item: FoodItem) -> None:
    db.delete(item)
    db.commit()


def get_food_batch(db: Session, batch_id: int) -> FoodBatch | None:
    statement = select(FoodBatch).options(selectinload(FoodBatch.food_item)).where(FoodBatch.id == batch_id)
    return db.scalar(statement)


def list_food_batches(db: Session, food_item_id: int | None, category: FoodCategory | None, search: str | None, storage_location: str | None, expiry_status: ExpiryStatus | None) -> list[FoodBatch]:
    statement: Select[tuple[FoodBatch]] = select(FoodBatch).options(selectinload(FoodBatch.food_item)).join(FoodBatch.food_item).order_by(FoodBatch.id)
    if food_item_id is not None:
        statement = statement.where(FoodBatch.food_item_id == food_item_id)
    if category is not None:
        statement = statement.where(FoodItem.category == category)
    if search and (normalized_search := search.strip()):
        pattern = f"%{normalized_search}%"
        statement = statement.where(or_(FoodBatch.batch_number.ilike(pattern), FoodItem.name.ilike(pattern)))
    if storage_location and (normalized_location := storage_location.strip()):
        statement = statement.where(FoodBatch.storage_location.ilike(f"%{normalized_location}%"))
    if expiry_status is not None:
        today = date.today()
        near_expiry_cutoff = today + timedelta(days=7)
        if expiry_status is ExpiryStatus.EXPIRED:
            statement = statement.where(FoodBatch.expiry_date < today)
        elif expiry_status is ExpiryStatus.NEAR_EXPIRY:
            statement = statement.where(FoodBatch.expiry_date >= today, FoodBatch.expiry_date <= near_expiry_cutoff)
        elif expiry_status is ExpiryStatus.FRESH:
            statement = statement.where(FoodBatch.expiry_date > near_expiry_cutoff)
        else:
            statement = statement.where(FoodBatch.expiry_date.is_(None))
    return list(db.scalars(statement))


def create_food_batch(db: Session, item: FoodItem, payload: FoodBatchCreate) -> FoodBatch:
    batch = FoodBatch(food_item_id=item.id, **payload.model_dump())
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return get_food_batch(db, batch.id) or batch


def update_food_batch(db: Session, batch: FoodBatch, payload: FoodBatchUpdate) -> FoodBatch:
    changes = payload.model_dump(exclude_unset=True)
    purchase_date = changes.get("purchase_date", batch.purchase_date)
    expiry_date = changes.get("expiry_date", batch.expiry_date)
    if purchase_date is not None and expiry_date is not None and expiry_date < purchase_date:
        raise ValueError("Expiry date cannot be before purchase date.")
    for field, value in changes.items():
        setattr(batch, field, value)
    db.commit()
    db.refresh(batch)
    return get_food_batch(db, batch.id) or batch


def delete_food_batch(db: Session, batch: FoodBatch) -> None:
    db.delete(batch)
    db.commit()
