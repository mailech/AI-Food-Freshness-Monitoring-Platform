from typing import Any, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, RoleChecker
from app.modules.user.models import User, UserRole
from app.modules.inventory.models import BatchStatus
from app.modules.inventory.schemas import (
    BatchCreate, BatchResponse,
    InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse
)
from app.modules.inventory.service import (
    create_batch, get_batch_by_id, get_batches, get_batch_by_number,
    create_item, get_item_by_id, get_items, update_item, delete_item
)

router = APIRouter()

# Role definitions for writes
WRITE_ROLES = [UserRole.RETAIL_MANAGER, UserRole.WAREHOUSE_OPERATOR, UserRole.ADMIN]

# --- Batch Endpoints ---

@router.post("/batches", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
async def create_new_batch(
    *,
    db: AsyncSession = Depends(get_db),
    batch_in: BatchCreate,
    current_user: User = Depends(RoleChecker(WRITE_ROLES))
) -> Any:
    """
    Create a new supply batch (Lot).
    Restricted to Retail Managers, Warehouse Operators, and Admins.
    """
    existing = await get_batch_by_number(db, batch_number=batch_in.batch_number)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch number '{batch_in.batch_number}' already exists."
        )
    batch = await create_batch(db, batch_in=batch_in)
    return batch

@router.get("/batches", response_model=List[BatchResponse])
async def list_all_batches(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List all supply batches (lots).
    """
    batches = await get_batches(db, skip=skip, limit=limit)
    return batches

# --- Inventory Item Endpoints ---

@router.post("/items", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_new_item(
    *,
    db: AsyncSession = Depends(get_db),
    item_in: InventoryItemCreate,
    current_user: User = Depends(RoleChecker(WRITE_ROLES))
) -> Any:
    """
    Register a new food item.
    Restricted to Retail Managers, Warehouse Operators, and Admins.
    """
    # Verify batch exists if batch_id is supplied
    if item_in.batch_id:
        batch = await get_batch_by_id(db, batch_id=item_in.batch_id)
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Batch (Lot) ID '{item_in.batch_id}' not found."
            )
    item = await create_item(db, item_in=item_in, user_id=current_user.id)
    return item

@router.get("/items", response_model=List[InventoryItemResponse])
async def list_all_items(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    status: Optional[BatchStatus] = None,
    search: Optional[str] = None,
    batch_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    List food inventory items with filters and search.
    Consumers see only their registered items; staff see all.
    """
    user_filter_id = current_user.id if current_user.role == UserRole.CONSUMER else None
    items = await get_items(
        db,
        skip=skip,
        limit=limit,
        category=category,
        status=status,
        search=search,
        batch_id=batch_id,
        user_id=user_filter_id
    )
    return items

@router.get("/items/{item_id}", response_model=InventoryItemResponse)
async def retrieve_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Retrieve details of a specific food item.
    """
    item = await get_item_by_id(db, item_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food inventory item not found"
        )
    
    # Restrict consumer access
    if current_user.role == UserRole.CONSUMER and item.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
    return item

@router.put("/items/{item_id}", response_model=InventoryItemResponse)
async def update_existing_item(
    item_id: uuid.UUID,
    item_in: InventoryItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(WRITE_ROLES))
) -> Any:
    """
    Update a food inventory item's parameters.
    Restricted to Retail Managers, Warehouse Operators, and Admins.
    """
    item = await get_item_by_id(db, item_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food inventory item not found"
        )
    
    # Check batch_id validity
    if item_in.batch_id:
        batch = await get_batch_by_id(db, batch_id=item_in.batch_id)
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Batch (Lot) ID '{item_in.batch_id}' not found."
            )
            
    updated_item = await update_item(db, db_item=item, item_in=item_in)
    return updated_item

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RoleChecker(WRITE_ROLES))
) -> None:
    """
    Delete a food inventory item.
    Restricted to Retail Managers, Warehouse Operators, and Admins.
    """
    item = await get_item_by_id(db, item_id=item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food inventory item not found"
        )
    await delete_item(db, db_item=item)
