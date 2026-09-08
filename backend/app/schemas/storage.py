"""Schemas for user-supplied storage condition records."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class StorageConditionCreate(BaseModel):
    food_batch_id: int = Field(gt=0)
    temperature: float = Field(ge=-50, le=100)
    humidity: float = Field(ge=0, le=100)
    air_circulation: float = Field(ge=0, le=10000)
    light_level: float = Field(ge=0, le=1_000_000)
    storage_duration: int = Field(ge=0, le=36500)

class StorageConditionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    food_batch_id: int
    temperature: float | None
    humidity: float | None
    air_circulation: float | None
    light_level: float | None
    recorded_at: datetime
