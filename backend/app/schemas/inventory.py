"""Request and response schemas for inventory management."""

from datetime import date, datetime, timedelta
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator

from app.models.enums import FoodCategory


class ExpiryStatus(str, Enum):
    """Date-derived batch states used for filtering and API responses."""

    FRESH = "Fresh"
    NEAR_EXPIRY = "Near Expiry"
    EXPIRED = "Expired"
    UNKNOWN = "Unknown"


class FoodItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: FoodCategory
    description: str | None = Field(default=None, max_length=10_000)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name is required.")
        return value

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class FoodItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    category: FoodCategory | None = None
    description: str | None = Field(default=None, max_length=10_000)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Name is required.")
        return value

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @model_validator(mode="after")
    def require_change(self) -> "FoodItemUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        return self


class FoodItemSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: FoodCategory


class FoodItemResponse(FoodItemSummary):
    description: str | None
    created_at: datetime
    updated_at: datetime


class FoodBatchCreate(BaseModel):
    batch_number: str = Field(min_length=1, max_length=100)
    quantity: float = Field(gt=0, le=999_999_999.999)
    unit: str = Field(min_length=1, max_length=50)
    storage_location: str = Field(min_length=1, max_length=255)
    purchase_date: date
    expiry_date: date

    @field_validator("batch_number", "unit", "storage_location")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required.")
        return value

    @model_validator(mode="after")
    def validate_dates(self) -> "FoodBatchCreate":
        if self.expiry_date < self.purchase_date:
            raise ValueError("Expiry date cannot be before purchase date.")
        return self


class FoodBatchUpdate(BaseModel):
    batch_number: str | None = Field(default=None, min_length=1, max_length=100)
    quantity: float | None = Field(default=None, gt=0, le=999_999_999.999)
    unit: str | None = Field(default=None, min_length=1, max_length=50)
    storage_location: str | None = Field(default=None, min_length=1, max_length=255)
    purchase_date: date | None = None
    expiry_date: date | None = None

    @field_validator("batch_number", "unit", "storage_location")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("This field is required.")
        return value

    @model_validator(mode="after")
    def validate_supplied_dates(self) -> "FoodBatchUpdate":
        if self.purchase_date and self.expiry_date and self.expiry_date < self.purchase_date:
            raise ValueError("Expiry date cannot be before purchase date.")
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        return self


class FoodBatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    food_item_id: int
    batch_number: str
    quantity: float
    unit: str
    storage_location: str
    purchase_date: date | None
    expiry_date: date | None
    created_at: datetime
    updated_at: datetime
    food_item: FoodItemSummary

    @computed_field(return_type=ExpiryStatus)
    @property
    def expiry_status(self) -> ExpiryStatus:
        """Calculate status from the current calendar date without storing it."""
        if self.expiry_date is None:
            return ExpiryStatus.UNKNOWN
        today = date.today()
        if self.expiry_date < today:
            return ExpiryStatus.EXPIRED
        if self.expiry_date <= today + timedelta(days=7):
            return ExpiryStatus.NEAR_EXPIRY
        return ExpiryStatus.FRESH
