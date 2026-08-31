from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.ml.shelf_life import predict_shelf_life
from app.models import User
from app.models.images import Assessment
from app.models.inventory import Batch, FoodCategory, FoodItem
from app.models.storage import StorageReading
from app.routers.auth import get_current_user
from app.schemas.inventory import (
    BatchCreate,
    BatchOut,
    CategoryOut,
    FoodItemCreate,
    FoodItemOut,
    Page,
)
from app.schemas.freshness_score import FreshnessScoreOut, ScoreComponentsOut
from app.schemas.shelf_life import ShelfLifeOut
from app.services.scoring import gather_item_state

router = APIRouter(prefix="/inventory", tags=["inventory"])


def _get_owned_item(item_id: int, user: User, db: Session) -> FoodItem:
    item = (
        db.query(FoodItem)
        .options(joinedload(FoodItem.category))
        .filter(FoodItem.id == item_id)
        .first()
    )
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    if item.owner_id != user.id and user.role.value != "Administrator":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your item")
    return item


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(FoodCategory).order_by(FoodCategory.id).all()


# ---- Food items ----

@router.get("/items", response_model=Page)
def list_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: int | None = None,
    search: str | None = None,
    expiring_within_days: int | None = Query(None, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(FoodItem)
        .options(joinedload(FoodItem.category))
        .filter(FoodItem.owner_id == user.id)
    )
    if category_id is not None:
        query = query.filter(FoodItem.category_id == category_id)
    if search:
        query = query.filter(FoodItem.name.ilike(f"%{search}%"))
    if expiring_within_days is not None:
        cutoff = date.today() + timedelta(days=expiring_within_days)
        query = query.join(Batch).filter(Batch.expiry_date <= cutoff)

    total = query.count()
    items = (
        query.order_by(FoodItem.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Page(total=total, page=page, page_size=page_size, items=items)


@router.post("/items", response_model=FoodItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    body: FoodItemCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = db.get(FoodCategory, body.category_id)
    if category is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown category")
    item = FoodItem(owner_id=user.id, **body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/items/{item_id}", response_model=FoodItemOut)
def get_item(item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_owned_item(item_id, user, db)


@router.put("/items/{item_id}", response_model=FoodItemOut)
def update_item(
    item_id: int,
    body: FoodItemCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _get_owned_item(item_id, user, db)
    category = db.get(FoodCategory, body.category_id)
    if category is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown category")
    for field, value in body.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = _get_owned_item(item_id, user, db)
    db.query(Batch).filter(Batch.item_id == item.id).delete()
    db.delete(item)
    db.commit()


# ---- Shelf-life prediction (SRS Module 5) ----

@router.get("/items/{item_id}/shelf-life", response_model=ShelfLifeOut)
def shelf_life(
    item_id: int,
    temperature_c: float | None = Query(None, ge=-30, le=60),
    humidity_pct: float | None = Query(None, ge=0, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _get_owned_item(item_id, user, db)
    latest = (
        db.query(Assessment)
        .filter(Assessment.item_id == item.id)
        .order_by(Assessment.assessed_at.desc())
        .first()
    )
    if temperature_c is None or humidity_pct is None:
        reading = (
            db.query(StorageReading)
            .filter(StorageReading.item_id == item.id)
            .order_by(StorageReading.recorded_at.desc())
            .first()
        )
        if temperature_c is None:
            temperature_c = reading.temperature_c if reading else None
        if humidity_pct is None:
            humidity_pct = reading.humidity_pct if reading else None
    prediction = predict_shelf_life(
        item.category.name,
        freshness_score=latest.freshness_score if latest else None,
        assessed_at=latest.assessed_at if latest else None,
        packaging_type=item.packaging_type,
        temperature_c=temperature_c,
        humidity_pct=humidity_pct,
    )
    return ShelfLifeOut(item_id=item.id, **prediction.as_dict())


# ---- Composite freshness score (SRS Module 7) ----

@router.get("/items/{item_id}/freshness-score", response_model=FreshnessScoreOut)
def freshness_score(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _get_owned_item(item_id, user, db)
    state = gather_item_state(db, item)
    result = state["composite"]
    return FreshnessScoreOut(
        item_id=item.id,
        overall_score=result.overall_score,
        health_category=result.health_category,
        confidence=result.confidence,
        weights=result.weights,
        components=ScoreComponentsOut(**result.components.__dict__),
        notes=result.notes,
    )

# ---- Batches ----

@router.get("/items/{item_id}/batches", response_model=list[BatchOut])
def list_batches(item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_owned_item(item_id, user, db)
    return db.query(Batch).filter(Batch.item_id == item_id).order_by(Batch.expiry_date).all()


@router.post(
    "/items/{item_id}/batches", response_model=BatchOut, status_code=status.HTTP_201_CREATED
)
def create_batch(
    item_id: int,
    body: BatchCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_item(item_id, user, db)
    data = body.model_dump(exclude={"item_id"})
    batch = Batch(item_id=item_id, **data)
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.delete("/batches/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_batch(batch_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    batch = db.get(Batch, batch_id)
    if batch is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found")
    _get_owned_item(batch.item_id, user, db)
    db.delete(batch)
    db.commit()
