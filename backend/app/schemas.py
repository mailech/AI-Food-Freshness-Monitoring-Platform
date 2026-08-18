from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from .models import UserRole, FoodCategory, FreshnessLabel


# ---- auth ----

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.consumer


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ---- food items ----

class FoodItemCreate(BaseModel):
    name: str
    category: FoodCategory
    batch_id: Optional[str] = None
    storage_temperature_c: Optional[float] = None
    storage_humidity_pct: Optional[float] = None


class FoodItemOut(BaseModel):
    id: int
    name: str
    category: FoodCategory
    batch_id: Optional[str]
    image_filename: Optional[str]
    storage_temperature_c: Optional[float]
    storage_humidity_pct: Optional[float]
    freshness_score: Optional[float]
    freshness_label: Optional[FreshnessLabel]
    predicted_shelf_life_days: Optional[float]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_items: int
    fresh_count: int
    near_spoilage_count: int
    spoiled_count: int
    average_freshness_score: float
