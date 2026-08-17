import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from app.modules.inventory.models import Batch, InventoryItem, BatchStatus
from app.modules.inventory.schemas import BatchCreate, InventoryItemCreate, InventoryItemUpdate

# Dynamic Expiry Evaluator
def evaluate_expiry_status(expiry_date: datetime) -> BatchStatus:
    now = datetime.now()
    if expiry_date.tzinfo is not None:
        now = datetime.now(timezone.utc)
    
    if now > expiry_date:
        return BatchStatus.SPOILED
    elif expiry_date - now <= timedelta(days=3):
        return BatchStatus.WARNING
    else:
        return BatchStatus.FRESH

async def check_and_update_item_status(db: AsyncSession, item: InventoryItem) -> InventoryItem:
    new_status = evaluate_expiry_status(item.expiry_date)
    if item.status != new_status:
        item.status = new_status
        db.add(item)
        await db.flush()
    return item

# --- Batch (Lot) Services ---

async def create_batch(db: AsyncSession, batch_in: BatchCreate) -> Batch:
    received = batch_in.received_date or datetime.now(timezone.utc)
    db_batch = Batch(
        batch_number=batch_in.batch_number,
        supplier_name=batch_in.supplier_name,
        received_date=received
    )
    db.add(db_batch)
    await db.flush()
    return db_batch

async def get_batch_by_id(db: AsyncSession, batch_id: uuid.UUID) -> Optional[Batch]:
    result = await db.execute(select(Batch).filter(Batch.id == batch_id))
    return result.scalars().first()

async def get_batch_by_number(db: AsyncSession, batch_number: str) -> Optional[Batch]:
    result = await db.execute(select(Batch).filter(Batch.batch_number == batch_number))
    return result.scalars().first()

async def get_batches(db: AsyncSession, skip: int = 0, limit: int = 100) -> Sequence[Batch]:
    result = await db.execute(select(Batch).offset(skip).limit(limit))
    return result.scalars().all()

# --- Inventory Item Services ---

async def create_item(
    db: AsyncSession, item_in: InventoryItemCreate, user_id: uuid.UUID
) -> InventoryItem:
    entry = item_in.entry_date or datetime.now(timezone.utc)
    # Evaluate initial status
    initial_status = evaluate_expiry_status(item_in.expiry_date)
    
    db_item = InventoryItem(
        name=item_in.name,
        category=item_in.category,
        batch_id=item_in.batch_id,
        quantity=item_in.quantity,
        unit=item_in.unit,
        packaging_type=item_in.packaging_type,
        entry_date=entry,
        expiry_date=item_in.expiry_date,
        status=initial_status,
        storage_location=item_in.storage_location,
        created_by_id=user_id
    )
    db.add(db_item)
    await db.flush()
    
    # Eagerly load batch relationship if batch_id is set
    if db_item.batch_id:
        result = await db.execute(
            select(InventoryItem)
            .options(joinedload(InventoryItem.batch))
            .filter(InventoryItem.id == db_item.id)
        )
        return result.scalars().first() or db_item
        
    return db_item

async def get_item_by_id(db: AsyncSession, item_id: uuid.UUID) -> Optional[InventoryItem]:
    result = await db.execute(
        select(InventoryItem)
        .options(joinedload(InventoryItem.batch))
        .filter(InventoryItem.id == item_id)
    )
    item = result.scalars().first()
    if item:
        await check_and_update_item_status(db, item)
    return item

async def get_items(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    status: Optional[BatchStatus] = None,
    search: Optional[str] = None,
    batch_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None
) -> Sequence[InventoryItem]:
    query = select(InventoryItem).options(joinedload(InventoryItem.batch))
    
    if category:
        query = query.filter(InventoryItem.category == category)
    if status:
        query = query.filter(InventoryItem.status == status)
    if search:
        query = query.filter(InventoryItem.name.ilike(f"%{search}%"))
    if batch_id:
        query = query.filter(InventoryItem.batch_id == batch_id)
    if user_id:
        query = query.filter(InventoryItem.created_by_id == user_id)
        
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    
    # Live eval expiries
    for item in items:
        await check_and_update_item_status(db, item)
        
    return items

async def update_item(
    db: AsyncSession, db_item: InventoryItem, item_in: InventoryItemUpdate
) -> InventoryItem:
    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)
    
    # Recalculate status if expiry_date changed
    if "expiry_date" in update_data:
        db_item.status = evaluate_expiry_status(db_item.expiry_date)
        
    db.add(db_item)
    await db.flush()
    
    # Refresh relationship
    result = await db.execute(
        select(InventoryItem)
        .options(joinedload(InventoryItem.batch))
        .filter(InventoryItem.id == db_item.id)
    )
    return result.scalars().first() or db_item

async def delete_item(db: AsyncSession, db_item: InventoryItem) -> None:
    await db.delete(db_item)
    await db.flush()
