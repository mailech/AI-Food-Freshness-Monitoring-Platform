"""Request and response schemas for alert management."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AlertCategory


class AlertPriority(str, Enum):
    """Supported alert priority labels."""
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class AlertCreate(BaseModel):
    """Explicit batch-scoped alert input for users and future rule engines."""
    food_batch_id: int = Field(gt=0, description="Existing food batch this alert belongs to.")
    category: AlertCategory
    priority: AlertPriority
    title: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1, max_length=10000)

    @field_validator("title", "message")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required.")
        return value


class AlertResponse(BaseModel):
    """Safe alert representation returned by the API."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    food_batch_id: int
    category: AlertCategory
    priority: AlertPriority
    title: str
    message: str
    is_read: bool
    is_dismissed: bool
    created_at: datetime
