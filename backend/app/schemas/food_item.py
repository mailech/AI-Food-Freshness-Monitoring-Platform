from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class FoodItemBase(BaseModel):
    name: str
    category: str
    quantity: int

class FoodItemCreate(FoodItemBase):
    pass

class FoodItemOut(FoodItemBase):
    id: int
    purchase_date: datetime
    owner_id: int

    class Config:
        from_attributes = True