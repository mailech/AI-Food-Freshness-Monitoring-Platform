from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import date

from database.connection import SessionLocal
from models.food import FoodItem
from security import get_current_user


router = APIRouter(
    prefix="/food",
    tags=["Food Inventory"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class FoodItemCreate(BaseModel):
    food_name: str
    category: str
    quantity: int
    batch_number: str
    purchase_date: date
    expiry_date: date


@router.post("/")
def add_food_item(
    food_data: FoodItemCreate,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if food_data.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than 0."
        )

    if food_data.expiry_date < food_data.purchase_date:
        raise HTTPException(
            status_code=400,
            detail="Expiry date cannot be before purchase date."
        )

    new_food = FoodItem(
        user_id=int(current_user),
        food_name=food_data.food_name,
        category=food_data.category,
        quantity=food_data.quantity,
        batch_number=food_data.batch_number,
        purchase_date=food_data.purchase_date,
        expiry_date=food_data.expiry_date
    )

    db.add(new_food)
    db.commit()
    db.refresh(new_food)

    return {
        "message": "Food item added successfully.",
        "food_id": new_food.id,
        "food_name": new_food.food_name,
        "category": new_food.category,
        "quantity": new_food.quantity,
        "batch_number": new_food.batch_number,
        "purchase_date": str(new_food.purchase_date),
        "expiry_date": str(new_food.expiry_date)
    }

@router.get("/")
def get_food_items(
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    food_items = db.query(FoodItem).filter(
        FoodItem.user_id == int(current_user)
    ).all()

    return [
        {
            "food_id": item.id,
            "food_name": item.food_name,
            "category": item.category,
            "quantity": item.quantity,
            "batch_number": item.batch_number,
            "purchase_date": str(item.purchase_date),
            "expiry_date": str(item.expiry_date)
        }
        for item in food_items
    ]