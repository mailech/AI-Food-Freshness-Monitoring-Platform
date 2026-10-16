from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user, require_roles
from app.database import get_db
from app.models.food_item import FoodItem
from app.models.user import User, UserRole
from app.schemas.inventory import FoodItemCreate, FoodItemResponse, FoodItemUpdate, InventoryListResponse

from datetime import datetime, timezone
from app.services.shelflife_service import calculate_shelf_life_days

router = APIRouter(prefix="/inventory", tags=["Inventory"])

MANAGEMENT_ROLES = [UserRole.WAREHOUSE_OPERATOR, UserRole.RETAIL_MANAGER, UserRole.ADMIN]


def compute_dynamic_shelf_life(item: FoodItem) -> FoodItemResponse:
    """
    Computes dynamic remaining expiry days and freshness status based on elapsed days since item creation,
    ensuring that even after days or weeks, the item remains preserved in storage while accurately
    reflecting its current freshness status.
    """
    res = FoodItemResponse.model_validate(item)
    if item.created_at and item.estimated_expiry_days is not None:
        now = datetime.now(timezone.utc)
        created = item.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        elapsed_days = max(0, (now - created).days)
        remaining = max(0, item.estimated_expiry_days - elapsed_days)
        res.estimated_expiry_days = remaining

        # Update freshness status and score if days have elapsed
        if elapsed_days > 0 and item.freshness_score is not None:
            total_days = max(1, item.estimated_expiry_days)
            ratio = remaining / total_days
            new_score = round(max(10.0, item.freshness_score * ratio), 1)
            res.freshness_score = new_score
            if remaining == 0:
                res.freshness_status = "Spoiled"
                res.spoilage_risk = "High"
            elif remaining <= 2:
                res.freshness_status = "Near Spoilage"
                res.spoilage_risk = "High"
            elif remaining <= 4:
                res.freshness_status = "Acceptable"
                res.spoilage_risk = "Medium"
            elif ratio >= 0.8:
                res.freshness_status = "Fresh"
                res.spoilage_risk = "Low"
            else:
                res.freshness_status = "Good"
                res.spoilage_risk = "Low"
    return res


@router.get("", response_model=InventoryListResponse)
@router.get("/", response_model=InventoryListResponse)
def get_inventory(
    category: Optional[str] = Query(None, description="Filter by product category"),
    freshness_status: Optional[str] = Query(None, description="Filter by freshness status"),
    search: Optional[str] = Query(None, description="Search by name or batch ID"),
    scope: Optional[str] = Query("shared", description="Filter by 'shared' (system inventory), 'personal' (user's personal storage), or 'all'"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves list of inventory items with optional category, status, search, and scope filters. Open to all authenticated roles."""
    query = db.query(FoodItem)

    if current_user.role == UserRole.CONSUMER:
        if scope == "personal":
            query = query.filter(FoodItem.is_personal == True, FoodItem.user_id == current_user.id)
        elif scope == "all":
            query = query.filter(or_(FoodItem.is_personal == False, FoodItem.user_id == current_user.id))
        else:
            query = query.filter(FoodItem.is_personal == False)
    else:
        # Staff roles (retail_manager, warehouse_operator, admin, food_quality_inspector)
        # are strictly isolated from consumer-created items (is_personal == False unconditionally)
        query = query.filter(FoodItem.is_personal == False)

    if category and category.lower() != "all":
        query = query.filter(FoodItem.category.ilike(f"%{category.strip()}%"))

    if freshness_status and freshness_status.lower() != "all":
        query = query.filter(FoodItem.freshness_status.ilike(f"%{freshness_status.strip()}%"))

    if search and search.strip():
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
        items=[compute_dynamic_shelf_life(item) for item in items],
        total=total,
        page=page,
        limit=limit
    )


@router.get("/storage", response_model=InventoryListResponse)
def get_personal_storage(
    category: Optional[str] = Query(None, description="Filter by product category"),
    freshness_status: Optional[str] = Query(None, description="Filter by freshness status"),
    search: Optional[str] = Query(None, description="Search by name or batch ID"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.CONSUMER]))
):
    """Retrieves food items in the current user's personal storage. Restricted to consumer accounts."""
    query = db.query(FoodItem).filter(FoodItem.user_id == current_user.id, FoodItem.is_personal == True)

    if category and category.lower() != "all":
        query = query.filter(FoodItem.category.ilike(f"%{category.strip()}%"))

    if freshness_status and freshness_status.lower() != "all":
        query = query.filter(FoodItem.freshness_status.ilike(f"%{freshness_status.strip()}%"))

    if search and search.strip():
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
        items=[compute_dynamic_shelf_life(item) for item in items],
        total=total,
        page=page,
        limit=limit
    )


@router.post("/storage", response_model=FoodItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_personal_storage(
    item_in: FoodItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.CONSUMER]))
):
    """Adds a scanned food item to personal storage. Restricted strictly to consumer accounts."""
    est_days = item_in.estimated_expiry_days
    if est_days is None:
        est_days = calculate_shelf_life_days(
            category=item_in.category,
            temp=item_in.storage_temperature or 4.0,
            humidity=item_in.humidity or 85.0
        )

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
        estimated_expiry_days=est_days,
        expiry_date=item_in.expiry_date,
        origin_location=item_in.origin_location,
        image_url=item_in.image_url,
        storage_tip=item_in.storage_tip,
        consumption_suggestion=item_in.consumption_suggestion,
        is_sample_data=False,
        is_personal=True,
        user_id=current_user.id
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return FoodItemResponse.model_validate(item)


@router.put("/storage/{item_id}", response_model=FoodItemResponse)
def update_personal_storage_item(
    item_id: int,
    item_in: FoodItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.CONSUMER]))
):
    """Updates a personal storage item belonging to current user. Restricted to consumers."""
    item = db.query(FoodItem).filter(
        FoodItem.id == item_id,
        FoodItem.user_id == current_user.id,
        FoodItem.is_personal == True
    ).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Personal food item with ID {item_id} not found"
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


@router.delete("/storage/{item_id}", status_code=status.HTTP_200_OK)
def delete_personal_storage_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.CONSUMER]))
):
    """Deletes/consumes an item from the user's personal storage. Restricted to consumers."""
    item = db.query(FoodItem).filter(
        FoodItem.id == item_id,
        FoodItem.user_id == current_user.id,
        FoodItem.is_personal == True
    ).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Personal food item with ID {item_id} not found"
        )

    db.delete(item)
    db.commit()
    return {"message": f"Personal food item {item_id} successfully deleted", "id": item_id}


@router.get("/{item_id}", response_model=FoodItemResponse)
def get_inventory_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves detailed information for a single food item. Personal items are isolated to their owner."""
    item = db.query(FoodItem).filter(FoodItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory item with ID {item_id} not found"
        )

    # Consumers can only view their own personal items; staff roles cannot view consumer-created personal items
    if item.is_personal and (current_user.role != UserRole.CONSUMER or item.user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory item with ID {item_id} not found"
        )

    return compute_dynamic_shelf_life(item)


@router.post("", response_model=FoodItemResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=FoodItemResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_item(
    item_in: FoodItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(MANAGEMENT_ROLES))
):
    """Creates a new common food item in inventory. Restricted to warehouse_operator, retail_manager, and admin."""
    est_days = item_in.estimated_expiry_days
    if est_days is None:
        est_days = calculate_shelf_life_days(
            category=item_in.category,
            temp=item_in.storage_temperature or 4.0,
            humidity=item_in.humidity or 85.0
        )

    item = FoodItem(
        name=item_in.name.strip(),
        category=item_in.category.strip(),
        batch_id=item_in.batch_id.strip(),
        quantity=item_in.quantity,
        unit=item_in.unit.strip(),
        freshness_score=item_in.freshness_score if item_in.freshness_score is not None else 95.0,
        freshness_status=item_in.freshness_status or "Fresh",
        spoilage_risk=item_in.spoilage_risk or "Low",
        storage_temperature=item_in.storage_temperature if item_in.storage_temperature is not None else 4.0,
        humidity=item_in.humidity if item_in.humidity is not None else 85.0,
        estimated_expiry_days=est_days,
        expiry_date=item_in.expiry_date,
        origin_location=item_in.origin_location or "Central Warehouse",
        image_url=item_in.image_url,
        storage_tip=item_in.storage_tip,
        consumption_suggestion=item_in.consumption_suggestion,
        is_sample_data=False,
        is_personal=False,
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
    """Updates an existing common inventory item. Restricted to warehouse_operator, retail_manager, and admin."""
    item = db.query(FoodItem).filter(FoodItem.id == item_id, FoodItem.is_personal == False).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Common inventory item with ID {item_id} not found"
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
    """Deletes a common inventory item. Restricted to warehouse_operator, retail_manager, and admin."""
    item = db.query(FoodItem).filter(FoodItem.id == item_id, FoodItem.is_personal == False).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Common inventory item with ID {item_id} not found"
        )

    db.delete(item)
    db.commit()
    return {"message": f"Common inventory item {item_id} successfully deleted", "id": item_id}
