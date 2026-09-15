"""Schemas for user-supplied storage condition records.

``storage_duration`` is the persisted API and database field name. Its value is
always hours (canonical unit matching shelf-life ``dwell_hours``), not days.
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

STORAGE_DURATION_MAX_HOURS = 8760
DOOR_OPENS_MAX = 10000

class StorageConditionCreate(BaseModel):
    food_batch_id: int = Field(gt=0)
    temperature: float = Field(ge=-50, le=100)
    humidity: float = Field(ge=0, le=100)
    air_circulation: float = Field(ge=0, le=10000)
    light_level: float = Field(ge=0, le=1_000_000)
    storage_duration: int = Field(
        ge=0,
        le=STORAGE_DURATION_MAX_HOURS,
        description="Storage duration in hours. Canonical unit for shelf-life dwell_hours.",
    )
    door_opens_count: int = Field(
        ge=0,
        le=DOOR_OPENS_MAX,
        description="Non-negative count of door openings during the storage period.",
    )

class StorageConditionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    food_batch_id: int
    temperature: float | None
    humidity: float | None
    air_circulation: float | None
    light_level: float | None
    storage_duration: int | None = Field(
        default=None,
        description="Stored storage duration in hours, not days.",
    )
    door_opens_count: int | None
    recorded_at: datetime
