from datetime import datetime, timezone
from typing import Optional
from beanie import Document
from pydantic import Field

class StorageReading(Document):
    item_id: str = Field(..., description="PostgreSQL item UUID string link")
    warehouse_zone: str = Field(..., description="Storage area / location name")
    temperature: float = Field(..., description="Degrees Celsius")
    humidity: float = Field(..., description="Relative humidity percentage")
    air_circulation: str = Field("Medium", description="Air flow level: Low, Medium, High")
    light_exposure: str = Field("Low", description="Light level: Dark, Low, Medium, High")
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "storage_readings"
