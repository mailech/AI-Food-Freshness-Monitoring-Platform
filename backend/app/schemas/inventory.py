from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class FoodItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category_id: int
    packaging_type: Optional[str] = Field(default=None, max_length=80)


class FoodItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category_id: int
    category: CategoryOut
    packaging_type: Optional[str]
    created_at: datetime


class BatchCreate(BaseModel):
    batch_code: str = Field(min_length=1, max_length=80)
    quantity: float = Field(gt=0)
    expiry_date: date
    storage_location: Optional[str] = Field(default=None, max_length=120)


class BatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    batch_code: str
    quantity: float
    received_date: date
    expiry_date: date
    storage_location: Optional[str]
    created_at: datetime


class Page(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[FoodItemOut]
