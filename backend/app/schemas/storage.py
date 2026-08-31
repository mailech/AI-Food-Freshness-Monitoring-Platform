from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, Field

ExposureLevel = Literal["low", "medium", "high"]


class StorageReadingIn(BaseModel):
    temperature_c: Optional[float] = Field(default=None, ge=-30, le=60)
    humidity_pct: Optional[float] = Field(default=None, ge=0, le=100)
    light_exposure: Optional[ExposureLevel] = None
    air_circulation: Optional[ExposureLevel] = None
    source: str = Field(default="manual", max_length=20)


class StorageReadingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    temperature_c: Optional[float]
    humidity_pct: Optional[float]
    light_exposure: Optional[str]
    air_circulation: Optional[str]
    source: str
    recorded_at: datetime


class ComplianceOut(BaseModel):
    item_id: int
    compliant: bool
    violations: list[str]
    recommendations: list[str]
    checked_reading: StorageReadingOut | None
