from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = "Consumer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr
    role: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class FoodItemCreate(BaseModel):
    name: str
    category: str
    quantity: int = 0
    expiry_date: Optional[date] = None
    status: str = "Fresh"
    freshness_score: float = 100.0


class FoodItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    expiry_date: Optional[date] = None
    status: Optional[str] = None
    freshness_score: Optional[float] = None


class FoodItemResponse(FoodItemCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    image_path: Optional[str] = None
    created_at: datetime


class ShelfLifeRequest(BaseModel):
    food_name: str
    storage_type: str = "refrigerator"
    food_condition: str = "fresh"
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    packaging_type: str = "standard"
    storage_duration_days: int = 0


class ShelfLifeResponse(BaseModel):
    food_name: str
    remaining_days: int
    risk_level: str
    message: str


class StorageCreate(BaseModel):
    food_item_id: Optional[int] = None
    temperature: float
    humidity: float
    air_circulation: str = "Good"
    light_exposure: str = "Low"
    storage_duration_days: int = 0


class StorageResponse(StorageCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class AnalysisResponse(BaseModel):
    analysis_id: Optional[int] = None
    food_item_id: Optional[int] = None
    freshness_score: float
    status: str
    spoilage_probability: float
    shelf_life_days: int
    recommendation: str
    image_path: Optional[str] = None


class DashboardResponse(BaseModel):
    total_items: int
    fresh_items: int
    good_items: int
    acceptable_items: int
    near_spoilage_items: int
    spoiled_items: int
    near_expiry: int
    spoilage_alerts: int
    average_freshness_score: float
