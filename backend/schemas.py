from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "Consumer"

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    avatar: str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class FoodItemCreate(BaseModel):
    name: str
    category: str = "Fruits"
    barcode: str = ""
    description: str = ""
    quantity: int = 1
    unit: str = "pieces"

class FoodItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    barcode: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None

class FoodItemOut(BaseModel):
    id: int
    name: str
    category: str
    barcode: str
    description: str
    quantity: int
    unit: str
    image_url: str
    added_by: Optional[int]
    created_at: datetime
    class Config:
        from_attributes = True

class BatchCreate(BaseModel):
    label: str
    source: str = ""
    expiry_date: Optional[datetime] = None
    food_item_id: int

class BatchOut(BaseModel):
    id: int
    label: str
    source: str
    received_date: datetime
    expiry_date: Optional[datetime]
    food_item_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class AnalysisOut(BaseModel):
    id: int
    food_item_id: Optional[int]
    user_id: int
    image_path: str
    food_name: str
    food_category: str
    freshness_score: float
    quality_class: str
    confidence: float
    color_score: float
    texture_score: float
    spoilage_probability: float
    mold_detected: bool
    bruising_detected: bool
    damage_detected: bool
    shelf_life_days: float
    shelf_life_text: str
    storage_recommendation: str
    consumption_recommendation: str
    risk_level: str
    created_at: datetime
    class Config:
        from_attributes = True

class StorageConditionCreate(BaseModel):
    food_item_id: int
    temperature: float = 4.0
    humidity: float = 60.0
    air_circulation: str = "Normal"
    light_exposure: str = "Dark"
    storage_duration_hours: float = 0.0
    packaging_type: str = "Open"

class StorageConditionOut(BaseModel):
    id: int
    food_item_id: int
    temperature: float
    humidity: float
    air_circulation: str
    light_exposure: str
    storage_duration_hours: float
    packaging_type: str
    is_compliant: bool
    recorded_at: datetime
    class Config:
        from_attributes = True

class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    is_read: bool
    priority: str
    related_item_id: Optional[int]
    created_at: datetime
    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_items: int = 0
    fresh_items: int = 0
    spoiled_items: int = 0
    expiring_soon: int = 0
    total_analyses: int = 0
    avg_freshness: float = 0.0
    total_notifications: int = 0
    unread_notifications: int = 0
    storage_compliance_rate: float = 0.0
    waste_reduction_score: float = 0.0
