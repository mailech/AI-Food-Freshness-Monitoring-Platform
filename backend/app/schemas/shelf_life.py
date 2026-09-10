"""Request and response schemas for shelf-life prediction requests."""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ShelfLifePredictionRequest(BaseModel):
    food_batch_id: int = Field(gt=0)
    dwell_hours: int = Field(ge=0, le=8760)
    mean_temp_F: float = Field(ge=-40, le=140)
    mean_rh_pct: float = Field(ge=0, le=100)
    door_opens_count: int = Field(ge=0, le=10000)
    freshness_analysis_id: int | None = Field(default=None, gt=0)


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
