from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from uuid import UUID
import datetime

# 1. Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


# 2. User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str = Field(..., description="Role must be admin, consumer, retail_manager, warehouse_operator, or food_inspector")

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime.datetime
    
    model_config = ConfigDict(from_attributes=True)


# 3. Food Category Schemas
class FoodCategoryBase(BaseModel):
    name: str
    ideal_temp_min: float
    ideal_temp_max: float
    ideal_humidity_min: float
    ideal_humidity_max: float
    base_shelf_life_days: int

class FoodCategoryResponse(FoodCategoryBase):
    id: UUID
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


# 4. Batch Schemas
class BatchBase(BaseModel):
    batch_number: str
    category_id: UUID
    supplier_name: str
    notes: Optional[str] = None

class BatchCreate(BatchBase):
    pass

class BatchResponse(BatchBase):
    id: UUID
    received_date: datetime.datetime
    created_at: datetime.datetime
    updated_at: datetime.datetime
    category: Optional[FoodCategoryResponse] = None

    model_config = ConfigDict(from_attributes=True)


# 5. Inventory Schemas
class InventoryBase(BaseModel):
    name: str
    category_id: UUID
    batch_id: Optional[UUID] = None
    quantity: float = 1.0
    unit: str = "pcs"
    expiry_date: datetime.datetime
    storage_temp: Optional[float] = None
    storage_humidity: Optional[float] = None

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = None
    status: Optional[str] = None
    freshness_score: Optional[int] = None
    storage_temp: Optional[float] = None
    storage_humidity: Optional[float] = None

class CVMetricsSchema(BaseModel):
    color_score: float
    texture_score: float
    mold_detected: bool
    mold_probability: float
    bruise_detected: bool
    bruise_score: float

class AnalysisResultResponse(BaseModel):
    id: UUID
    image_url: str
    color_score: float
    texture_score: float
    mold_detected: bool
    bruise_detected: bool
    damage_detected: bool
    freshness_score: int
    spoilage_probability: float
    remaining_shelf_life_days: float
    analyzed_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class InventoryResponse(BaseModel):
    id: UUID
    name: str
    category_id: UUID
    user_id: Optional[UUID] = None
    batch_id: Optional[UUID] = None
    quantity: float
    unit: str
    added_at: datetime.datetime
    expiry_date: datetime.datetime
    status: str
    freshness_score: int
    storage_temp: Optional[float] = None
    storage_humidity: Optional[float] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    
    category: FoodCategoryResponse
    batch: Optional[BatchResponse] = None
    analysis_results: List[AnalysisResultResponse] = []
    recommendations: List[str] = []

    model_config = ConfigDict(from_attributes=True)


# 6. Storage Logs Schemas
class StorageLogBase(BaseModel):
    inventory_item_id: UUID
    temperature: float
    humidity: float

class StorageLogCreate(StorageLogBase):
    pass

class StorageLogResponse(StorageLogBase):
    id: UUID
    recorded_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


# 7. Dashboard / Analytics Stats Schemas
class DashboardKPIs(BaseModel):
    total_items: int
    fresh_items: int
    decaying_items: int
    spoiled_items: int
    average_freshness: float
    total_waste_saved_kg: float # simulated metric
