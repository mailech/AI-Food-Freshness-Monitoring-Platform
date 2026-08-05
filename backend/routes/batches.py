from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

from ..database import get_db
from ..models.sql_models import FoodCategory, Batch, User
from ..schemas.pydantic_schemas import FoodCategoryResponse, FoodCategoryBase, BatchResponse, BatchCreate
from ..utils.security import get_current_user, RoleChecker
from ..mongodb import get_mongo_db

router = APIRouter(prefix="/api/batches", tags=["Categories & Batches"])

# ==========================================
# FOOD CATEGORIES ENDPOINTS
# ==========================================

@router.get("/categories", response_model=List[FoodCategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    categories = db.query(FoodCategory).all()
    
    # Auto-seed basic categories if empty (convenience for demo environment)
    if not categories:
        defaults = [
            ("Fruits", 0.0, 15.0, 80.0, 90.0, 10),
            ("Vegetables", 0.0, 10.0, 85.0, 95.0, 7),
            ("Meat", -2.0, 4.0, 75.0, 85.0, 4),
            ("Seafood", -2.0, 2.0, 80.0, 90.0, 3),
            ("Milk", 1.0, 4.0, 70.0, 80.0, 7),
            ("Bakery", 15.0, 25.0, 40.0, 60.0, 5),
            ("Packaged Foods", 10.0, 25.0, 30.0, 50.0, 180),
            ("Beverages", 4.0, 20.0, 30.0, 50.0, 90),
            ("Eggs", 2.0, 12.0, 70.0, 80.0, 21),
            ("Frozen Foods", -25.0, -18.0, 30.0, 50.0, 120),
        ]
        for name, t_min, t_max, h_min, h_max, life in defaults:
            cat = FoodCategory(
                name=name,
                ideal_temp_min=t_min,
                ideal_temp_max=t_max,
                ideal_humidity_min=h_min,
                ideal_humidity_max=h_max,
                base_shelf_life_days=life
            )
            db.add(cat)
        db.commit()
        categories = db.query(FoodCategory).all()
        
    return categories

@router.post("/categories", response_model=FoodCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: FoodCategoryBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin"]))
):
    existing = db.query(FoodCategory).filter(FoodCategory.name == category_in.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category already exists."
        )
        
    category = FoodCategory(**category_in.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


# ==========================================
# BATCHES ENDPOINTS
# ==========================================

@router.get("", response_model=List[BatchResponse])
def get_batches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # All authenticated users can view batches
    return db.query(Batch).order_by(Batch.created_at.desc()).all()

@router.post("", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(
    batch_in: BatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "retail_manager", "warehouse_operator"]))
):
    # Verify category exists
    category = db.query(FoodCategory).filter(FoodCategory.id == batch_in.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specified food category does not exist."
        )
        
    # Check duplicate batch number
    existing = db.query(Batch).filter(Batch.batch_number == batch_in.batch_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch number must be unique."
        )
        
    batch = Batch(**batch_in.model_dump())
    db.add(batch)
    db.commit()
    db.refresh(batch)
    
    # Log to MongoDB
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        try:
            mongo_db.activity_logs.insert_one({
                "user_id": str(current_user.id),
                "action": "BATCH_CREATED",
                "details": f"Created batch {batch.batch_number} for category {category.name}.",
                "timestamp": datetime.utcnow()
            })
        except Exception as e:
            pass
            
    return batch
