"""Request and response schemas for shelf-life prediction requests."""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ShelfLifePredictionRequest(BaseModel):
    food_batch_id: int = Field(gt=0)
    temperature: float = Field(ge=-50, le=100)
    humidity: float = Field(ge=0, le=100)
    packaging: str = Field(min_length=1, max_length=100)
    storage_duration: int = Field(ge=0, le=36500)
    freshness_analysis_id: int | None = Field(default=None, gt=0)

    @field_validator("packaging")
    @classmethod
    def normalize_packaging(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Packaging is required.")
        return value


class ShelfLifePredictionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    food_batch_id: int
    remaining_days: int | None
    predicted_expiry_date: date | None
    confidence_score: float | None
    temperature: float | None
    humidity: float | None
    packaging: str | None
    storage_duration: int | None
    prediction_result: dict[str, Any] | None
    predicted_at: datetime
