"""Authenticated inventory-management endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import FoodCategory, UserRole
from app.models.food_batch import FoodBatch
from app.models.food_item import FoodItem
from app.models.user import User
from app.schemas.inventory import (
    ExpiryStatus,
    FoodBatchCreate,
    FoodBatchResponse,
    FoodBatchUpdate,
    FoodItemCreate,
    FoodItemResponse,
    FoodItemUpdate,
)
from app.services.inventory import (
    create_food_batch,
    create_food_item,
    delete_food_batch,
    delete_food_item,
    get_food_batch,
    get_food_item,
    list_food_batches,
    list_food_items,
    update_food_batch,
    update_food_item,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])

OperationalUser = Annotated[
    User,
    Depends(require_roles(UserRole.RETAIL_MANAGER, UserRole.WAREHOUSE_OPERATOR, UserRole.ADMINISTRATOR)),
]
AuthenticatedUser = Annotated[User, Depends(get_current_user)]


def _item_or_404(db: Session, item_id: int) -> FoodItem:
    item = get_food_item(db, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food item not found.")
    return item


def _batch_or_404(db: Session, batch_id: int) -> FoodBatch:
    batch = get_food_batch(db, batch_id)
    if batch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food batch not found.")
    return batch


@router.get("/health")
def inventory_health() -> dict[str, str]:
    """Return inventory module readiness without changing state."""
    return {"module": "inventory", "status": "ready"}


@router.post("/items", response_model=FoodItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(payload: FoodItemCreate, db: Annotated[Session, Depends(get_db)], _: OperationalUser) -> FoodItem:
    """Create a food item for inventory operations."""
    return create_food_item(db, payload)


@router.get("/items", response_model=list[FoodItemResponse])
def read_items(
    db: Annotated[Session, Depends(get_db)],
    _: AuthenticatedUser,
    search: str | None = None,
    category: FoodCategory | None = None,
) -> list[FoodItem]:
    """List food items, optionally filtered by name and category."""
    return list_food_items(db, search, category)


@router.get("/items/{item_id}", response_model=FoodItemResponse)
def read_item(item_id: int, db: Annotated[Session, Depends(get_db)], _: AuthenticatedUser) -> FoodItem:
    """Return a food item by identifier."""
    return _item_or_404(db, item_id)


@router.put("/items/{item_id}", response_model=FoodItemResponse)
def edit_item(item_id: int, payload: FoodItemUpdate, db: Annotated[Session, Depends(get_db)], _: OperationalUser) -> FoodItem:
    """Update a food item."""
    return update_food_item(db, _item_or_404(db, item_id), payload)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_item(item_id: int, db: Annotated[Session, Depends(get_db)], _: OperationalUser) -> Response:
    """Delete an item and let its configured cascade remove dependent batches."""
    delete_food_item(db, _item_or_404(db, item_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/items/{item_id}/batches", response_model=FoodBatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(item_id: int, payload: FoodBatchCreate, db: Annotated[Session, Depends(get_db)], _: OperationalUser) -> FoodBatch:
    """Create a batch under an existing food item."""
    try:
        return create_food_batch(db, _item_or_404(db, item_id), payload)
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A batch with this number already exists for this food item.") from None


@router.get("/batches", response_model=list[FoodBatchResponse])
def read_batches(
    db: Annotated[Session, Depends(get_db)],
    _: AuthenticatedUser,
    food_item_id: int | None = None,
    category: FoodCategory | None = None,
    search: str | None = None,
    storage_location: str | None = None,
    expiry_status: ExpiryStatus | None = None,
) -> list[FoodBatch]:
    """List batches with stored and date-derived filtering."""
    return list_food_batches(db, food_item_id, category, search, storage_location, expiry_status)


@router.get("/batches/{batch_id}", response_model=FoodBatchResponse)
def read_batch(batch_id: int, db: Annotated[Session, Depends(get_db)], _: AuthenticatedUser) -> FoodBatch:
    """Return one batch by identifier."""
    return _batch_or_404(db, batch_id)


@router.put("/batches/{batch_id}", response_model=FoodBatchResponse)
def edit_batch(batch_id: int, payload: FoodBatchUpdate, db: Annotated[Session, Depends(get_db)], _: OperationalUser) -> FoodBatch:
    """Update a batch while retaining valid date ordering."""
    try:
        return update_food_batch(db, _batch_or_404(db, batch_id), payload)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)) from None
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A batch with this number already exists for this food item.") from None


@router.delete("/batches/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_batch(batch_id: int, db: Annotated[Session, Depends(get_db)], _: OperationalUser) -> Response:
    """Delete a batch by identifier."""
    delete_food_batch(db, _batch_or_404(db, batch_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
