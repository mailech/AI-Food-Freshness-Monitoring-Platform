from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class StorageReadingCreate(BaseModel):
    item_id: str = Field(..., description="PostgreSQL item UUID string link")
    temperature: float = Field(..., description="Degrees Celsius")
    humidity: float = Field(..., description="Relative humidity percentage")
    air_circulation: str = Field("Medium", description="Air flow level: Low, Medium, High")
    light_exposure: str = Field("Low", description="Light level: Dark, Low, Medium, High")

class StorageComplianceReport(BaseModel):
    item_id: str = Field(..., description="Inventory item ID link")
    warehouse_zone: str = Field(..., description="Storage zone label")
    compliance_status: str = Field(..., description="COMPLIANT, WARNING, CRITICAL")
    temperature: float = Field(..., description="Degrees Celsius")
    humidity: float = Field(..., description="Relative humidity percentage")
    air_circulation: str = Field(..., description="Air flow level")
    light_exposure: str = Field(..., description="Light exposure level")
    temperature_deviation: float = Field(..., description="Difference from optimal temperature")
    humidity_deviation: float = Field(..., description="Difference from optimal relative humidity")
    recorded_at: datetime = Field(..., description="Timestamp of telemetry reading")
    recommendations: List[str] = Field(..., description="Actionable safety suggestions")
