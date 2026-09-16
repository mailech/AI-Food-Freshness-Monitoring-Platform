import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from app.modules.inspection.models import InspectionStatus

class InspectionCreate(BaseModel):
    item_id: Optional[uuid.UUID] = Field(None, description="Optional Inventory Item UUID")
    batch_id: Optional[uuid.UUID] = Field(None, description="Optional Batch UUID")
    product_name: str = Field(..., description="Product name")
    category: str = Field(..., description="Category (Fruits, Vegetables, Dairy Products, etc.)")
    packaging_type: str = Field("None", description="Packaging type")
    storage_location: str = Field("Ambient Room", description="Storage area")
    storage_temperature: float = Field(20.0, description="Temperature in Celsius")
    humidity: float = Field(50.0, description="Relative humidity %")
    air_circulation: str = Field("Medium", description="Air flow level: Low, Medium, High")
    light_exposure: str = Field("Low", description="Light level: Dark, Low, Medium, High")
    storage_duration_days: float = Field(0.0, description="Elapsed storage days")
    status: InspectionStatus = Field(InspectionStatus.PASSED, description="Inspector decision status")
    remarks: Optional[str] = Field(None, description="Inspector clinical notes/remarks")
    action_taken: Optional[str] = Field(None, description="Action taken: e.g., APPROVED, QUARANTINED")

class InspectionUpdate(BaseModel):
    status: Optional[InspectionStatus] = Field(None, description="Updated status")
    remarks: Optional[str] = Field(None, description="Updated remarks")
    action_taken: Optional[str] = Field(None, description="Updated action")

class InspectionResponse(BaseModel):
    id: uuid.UUID
    item_id: Optional[uuid.UUID] = None
    batch_id: Optional[uuid.UUID] = None
    inspector_id: uuid.UUID
    inspector_name: Optional[str] = None
    product_name: str
    category: str
    packaging_type: str
    storage_location: str
    storage_temperature: float
    humidity: float
    air_circulation: str
    light_exposure: str
    storage_duration_days: float
    image_url: Optional[str] = None
    ai_predicted_class: str
    ai_confidence: float
    freshness_score: float
    predicted_shelf_life_days: float
    quality_classification: str
    mold_detected: bool
    bruising_detected: bool
    damage_detected: bool
    color_degradation: float
    texture_roughness: float
    status: InspectionStatus
    remarks: Optional[str] = None
    action_taken: Optional[str] = None
    inspected_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InspectorDashboardSummary(BaseModel):
    total_inspections: int
    pending_inspections: int
    passed_inspections: int
    warning_inspections: int
    quarantined_inspections: int
    fresh_count: int
    good_count: int
    acceptable_count: int
    near_spoilage_count: int
    spoiled_count: int
    recent_inspections: List[InspectionResponse]
