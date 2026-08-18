import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db
from ..freshness_engine import estimate_freshness

router = APIRouter(prefix="/api/food-items", tags=["food-items"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("", response_model=List[schemas.FoodItemOut])
def list_food_items(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    query = db.query(models.FoodItem).filter(models.FoodItem.owner_id == current_user.id)
    if category:
        query = query.filter(models.FoodItem.category == category)
    return query.order_by(models.FoodItem.created_at.desc()).all()


@router.get("/{item_id}", response_model=schemas.FoodItemOut)
def get_food_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    item = (
        db.query(models.FoodItem)
        .filter(models.FoodItem.id == item_id, models.FoodItem.owner_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    return item


@router.post("", response_model=schemas.FoodItemOut)
async def create_food_item(
    name: str = Form(...),
    category: str = Form(...),
    batch_id: Optional[str] = Form(None),
    storage_temperature_c: Optional[float] = Form(None),
    storage_humidity_pct: Optional[float] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    image_filename = None
    if image is not None:
        ext = os.path.splitext(image.filename)[1] or ".jpg"
        image_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, image_filename)
        with open(file_path, "wb") as f:
            f.write(await image.read())

    score, label, shelf_life = estimate_freshness(
        category=category,
        temp_c=storage_temperature_c,
        humidity_pct=storage_humidity_pct,
        has_image=image_filename is not None,
    )

    item = models.FoodItem(
        owner_id=current_user.id,
        name=name,
        category=category,
        batch_id=batch_id,
        storage_temperature_c=storage_temperature_c,
        storage_humidity_pct=storage_humidity_pct,
        image_filename=image_filename,
        freshness_score=score,
        freshness_label=label,
        predicted_shelf_life_days=shelf_life,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.post("/{item_id}/rescan", response_model=schemas.FoodItemOut)
def rescan_food_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Re-run the freshness estimate, e.g. after storage conditions changed."""
    item = (
        db.query(models.FoodItem)
        .filter(models.FoodItem.id == item_id, models.FoodItem.owner_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")

    score, label, shelf_life = estimate_freshness(
        category=item.category.value if hasattr(item.category, "value") else item.category,
        temp_c=item.storage_temperature_c,
        humidity_pct=item.storage_humidity_pct,
        has_image=item.image_filename is not None,
    )
    item.freshness_score = score
    item.freshness_label = label
    item.predicted_shelf_life_days = shelf_life
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}")
def delete_food_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    item = (
        db.query(models.FoodItem)
        .filter(models.FoodItem.id == item_id, models.FoodItem.owner_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")

    if item.image_filename:
        image_path = os.path.join(UPLOAD_DIR, item.image_filename)
        if os.path.exists(image_path):
            os.remove(image_path)

    db.delete(item)
    db.commit()
    return {"detail": "Food item deleted"}


@router.get("/stats/dashboard", response_model=schemas.DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    items = db.query(models.FoodItem).filter(models.FoodItem.owner_id == current_user.id).all()
    total = len(items)
    fresh = len([i for i in items if i.freshness_label in (
        models.FreshnessLabel.fresh, models.FreshnessLabel.good
    )])
    near_spoilage = len([i for i in items if i.freshness_label == models.FreshnessLabel.near_spoilage])
    spoiled = len([i for i in items if i.freshness_label == models.FreshnessLabel.spoiled])
    avg_score = round(sum(i.freshness_score or 0 for i in items) / total, 1) if total else 0.0

    return schemas.DashboardStats(
        total_items=total,
        fresh_count=fresh,
        near_spoilage_count=near_spoilage,
        spoiled_count=spoiled,
        average_freshness_score=avg_score,
    )
