from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class FoodItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(default="Produce", max_length=100)
    batch_id: str = Field(..., min_length=1, max_length=100, description="Batch ID or Barcode number")
    quantity: float = Field(default=1.0, ge=0.0)
    unit: str = Field(default="kg", max_length=50)
    
    freshness_score: Optional[float] = Field(default=95.0, ge=0.0, le=100.0)
    freshness_status: str = Field(default="Fresh", max_length=50)
    spoilage_risk: Optional[str] = Field(default="Low", max_length=50)
    
    storage_temperature: Optional[float] = Field(default=4.0)
    humidity: Optional[float] = Field(default=85.0, ge=0.0, le=100.0)
    estimated_expiry_days: Optional[int] = Field(default=7, ge=0)
    expiry_date: Optional[datetime] = None
    
    origin_location: Optional[str] = Field(default="Local Farm", max_length=255)
    image_url: Optional[str] = None
    storage_tip: Optional[str] = None
    consumption_suggestion: Optional[str] = None


class FoodItemCreate(FoodItemBase):
    pass


class FoodItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    category: Optional[str] = Field(default=None, max_length=100)
    batch_id: Optional[str] = Field(default=None, min_length=1, max_length=100)
    quantity: Optional[float] = Field(default=None, ge=0.0)
    unit: Optional[str] = Field(default=None, max_length=50)
    
    freshness_score: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    freshness_status: Optional[str] = Field(default=None, max_length=50)
    spoilage_risk: Optional[str] = Field(default=None, max_length=50)
    
    storage_temperature: Optional[float] = None
    humidity: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    estimated_expiry_days: Optional[int] = Field(default=None, ge=0)
    expiry_date: Optional[datetime] = None
    
    origin_location: Optional[str] = Field(default=None, max_length=255)
    image_url: Optional[str] = None
    storage_tip: Optional[str] = None
    consumption_suggestion: Optional[str] = None


class FoodItemResponse(FoodItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class InventoryListResponse(BaseModel):
    items: List[FoodItemResponse]
    total: int
    page: int
    limit: int
