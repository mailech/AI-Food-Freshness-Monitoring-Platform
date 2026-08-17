import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

from app.modules.inventory.models import BatchStatus

# Category definition
VALID_CATEGORIES = {
    "Fruits",
    "Vegetables",
    "Dairy Products",
    "Meat & Poultry",
    "Seafood",
    "Bakery Products",
    "Packaged Foods",
    "Beverages",
}

class BatchCreate(BaseModel):
    batch_number: str = Field(..., min_length=2, description="Unique batch or lot identifier")
    supplier_name: Optional[str] = None
    received_date: Optional[datetime] = None

class BatchResponse(BaseModel):
    id: uuid.UUID
    batch_number: str
    supplier_name: Optional[str]
    received_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class InventoryItemBase(BaseModel):
    name: str = Field(..., min_length=1, description="Food item name")
    category: str = Field(..., description="Food product category")
    batch_id: Optional[uuid.UUID] = None
    quantity: float = Field(..., gt=0, description="Quantity must be greater than zero")
    unit: str = Field(..., min_length=1, description="E.g., kg, liters, units")
    packaging_type: Optional[str] = None
    entry_date: Optional[datetime] = None
    expiry_date: datetime
    status: BatchStatus = BatchStatus.FRESH
    storage_location: Optional[str] = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        if value not in VALID_CATEGORIES:
            raise ValueError(
                f"Invalid category '{value}'. Allowed: {', '.join(sorted(VALID_CATEGORIES))}"
            )
        return value

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    batch_id: Optional[uuid.UUID] = None
    quantity: Optional[float] = Field(None, gt=0)
    unit: Optional[str] = None
    packaging_type: Optional[str] = None
    entry_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    status: Optional[BatchStatus] = None
    storage_location: Optional[str] = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in VALID_CATEGORIES:
            raise ValueError(
                f"Invalid category '{value}'. Allowed: {', '.join(sorted(VALID_CATEGORIES))}"
            )
        return value

class InventoryItemResponse(InventoryItemBase):
    id: uuid.UUID
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    batch: Optional[BatchResponse] = None

    class Config:
        from_attributes = True
