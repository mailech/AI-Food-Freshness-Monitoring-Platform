from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.food_item import FoodItem
from app.schemas.food_item import FoodItemCreate, FoodItemOut

router = APIRouter(prefix="/api/food-items", tags=["Inventory"])

@router.post("/", response_model=FoodItemOut)
def create_food_item(item: FoodItemCreate, db: Session = Depends(get_db)):
    db_item = FoodItem(**item.model_dump(), owner_id=1) # Hardcoded owner ID for brevity; extract from JWT in production
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/", response_model=List[FoodItemOut])
def get_food_items(db: Session = Depends(get_db)):
    return db.query(FoodItem).all()