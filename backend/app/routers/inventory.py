from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.food_item import FoodItem
from app.models.user import User, UserRole
from app.schemas.inventory import FoodItemCreate, FoodItemResponse, FoodItemUpdate, InventoryListResponse

router = APIRouter(prefix="/inventory", tags=["Inventory"])

MANAGEMENT_ROLES = [UserRole.WAREHOUSE_OPERATOR, UserRole.RETAIL_MANAGER, UserRole.ADMIN]


@router.get("", response_model=InventoryListResponse)
@router.get("/", response_model=InventoryListResponse)
def get_inventory(
    category: Optional[str] = Query(None, description="Filter by product category"),
    freshness_status: Optional[str] = Query(None, description="Filter by freshness status"),
    search: Optional[str] = Query(None, description="Search by name or batch ID"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves list of inventory items with optional category, status, and search filters. Open to all authenticated roles."""
    query = db.query(FoodItem)

    if category and category.lower() != "all":
        query = query.filter(FoodItem.category.ilike(f"%{category.strip()}%"))

    if freshness_status and freshness_status.lower() != "all":
        query = query.filter(FoodItem.freshness_status.ilike(f"%{freshness_status.strip()}%"))

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                FoodItem.name.ilike(search_term),
                FoodItem.batch_id.ilike(search_term)
            )
        )

    total = query.count()
    offset = (page - 1) * limit
    items = query.order_by(FoodItem.id.desc()).offset(offset).limit(limit).all()

    return InventoryListResponse(
        items=[FoodItemResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        limit=limit
    )


@router.get("/{item_id}", response_model=FoodItemResponse)
def get_inventory_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves detailed information for a single food item. Open to all authenticated roles."""
    item = db.query(FoodItem).filter(FoodItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory item with ID {item_id} not found"
        )
    return FoodItemResponse.model_validate(item)


@router.post("", response_model=FoodItemResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=FoodItemResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_item(
    item_in: FoodItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(MANAGEMENT_ROLES))
):
    """Creates a new food item in inventory. Restricted to warehouse_operator, retail_manager, and admin."""
    item = FoodItem(
        name=item_in.name.strip(),
        category=item_in.category.strip(),
        batch_id=item_in.batch_id.strip(),
        quantity=item_in.quantity,
        unit=item_in.unit.strip(),
        freshness_score=item_in.freshness_score,
        freshness_status=item_in.freshness_status,
        spoilage_risk=item_in.spoilage_risk,
        storage_temperature=item_in.storage_temperature,
        humidity=item_in.humidity,
        estimated_expiry_days=item_in.estimated_expiry_days,
        expiry_date=item_in.expiry_date,
        origin_location=item_in.origin_location,
        image_url=item_in.image_url,
        storage_tip=item_in.storage_tip,
        consumption_suggestion=item_in.consumption_suggestion,
        user_id=current_user.id
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return FoodItemResponse.model_validate(item)


@router.put("/{item_id}", response_model=FoodItemResponse)
def update_inventory_item(
    item_id: int,
    item_in: FoodItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(MANAGEMENT_ROLES))
):
    """Updates an existing inventory item. Restricted to warehouse_operator, retail_manager, and admin."""
    item = db.query(FoodItem).filter(FoodItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory item with ID {item_id} not found"
        )

    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            if isinstance(value, str):
                value = value.strip()
            setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return FoodItemResponse.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_200_OK)
def delete_inventory_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(MANAGEMENT_ROLES))
):
    """Deletes an inventory item. Restricted to warehouse_operator, retail_manager, and admin."""
    item = db.query(FoodItem).filter(FoodItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory item with ID {item_id} not found"
        )

    db.delete(item)
    db.commit()
    return {"message": f"Inventory item {item_id} successfully deleted", "id": item_id}
