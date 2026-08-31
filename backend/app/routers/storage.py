from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.ml.storage import evaluate_reading
from app.models import User
from app.models.storage import StorageReading
from app.routers.auth import get_current_user
from app.routers.inventory import _get_owned_item
from app.schemas.storage import ComplianceOut, StorageReadingIn, StorageReadingOut

router = APIRouter(prefix="/inventory", tags=["storage"])

MAX_READINGS = 200


@router.post(
    "/items/{item_id}/storage-readings",
    response_model=StorageReadingOut,
    status_code=status.HTTP_201_CREATED,
)
def record_reading(
    item_id: int,
    body: StorageReadingIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_item(item_id, user, db)
    reading = StorageReading(item_id=item_id, **body.model_dump())
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


@router.get("/items/{item_id}/storage-readings", response_model=list[StorageReadingOut])
def list_readings(
    item_id: int,
    limit: int = Query(50, ge=1, le=MAX_READINGS),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_item(item_id, user, db)
    return (
        db.query(StorageReading)
        .filter(StorageReading.item_id == item_id)
        .order_by(StorageReading.recorded_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/items/{item_id}/storage-readings/latest", response_model=StorageReadingOut | None)
def latest_reading(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned_item(item_id, user, db)
    return (
        db.query(StorageReading)
        .filter(StorageReading.item_id == item_id)
        .order_by(StorageReading.recorded_at.desc())
        .first()
    )


@router.get("/items/{item_id}/storage-readings/compliance", response_model=ComplianceOut)
def storage_compliance(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _get_owned_item(item_id, user, db)
    reading = (
        db.query(StorageReading)
        .filter(StorageReading.item_id == item.id)
        .order_by(StorageReading.recorded_at.desc())
        .first()
    )
    if reading is None:
        return ComplianceOut(
            item_id=item.id,
            compliant=True,
            violations=[],
            recommendations=["No storage readings recorded yet; add temperature and humidity readings to monitor compliance."],
            checked_reading=None,
        )
    compliant, violations, recommendations = evaluate_reading(item.category.name, reading)
    return ComplianceOut(
        item_id=item.id,
        compliant=compliant,
        violations=violations,
        recommendations=recommendations,
        checked_reading=StorageReadingOut.model_validate(reading),
    )


@router.delete("/storage-readings/{reading_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reading(
    reading_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reading = db.get(StorageReading, reading_id)
    if reading is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reading not found")
    _get_owned_item(reading.item_id, user, db)
    db.delete(reading)
    db.commit()
