from datetime import datetime
from typing import List
from pydantic import BaseModel, Field

class ScoreBreakdown(BaseModel):
    visual_score: float = Field(..., description="Visual analysis score out of 100")
    storage_score: float = Field(..., description="Storage telemetry compliance score out of 100")
    shelflife_score: float = Field(..., description="Remaining shelf-life score out of 100")
    age_score: float = Field(..., description="Age decay progress score out of 100")
    visual_weight: float = Field(0.40, description="Visual score weight")
    storage_weight: float = Field(0.25, description="Storage score weight")
    shelflife_weight: float = Field(0.20, description="Shelf-life score weight")
    age_weight: float = Field(0.15, description="Age score weight")

class ItemHealthScoreResponse(BaseModel):
    item_id: str = Field(..., description="PostgreSQL item UUID string link")
    item_name: str = Field(..., description="Product label")
    combined_health_score: float = Field(..., description="Blended overall health score out of 100")
    quality_classification: str = Field(..., description="Fresh, Good, Acceptable, Near Spoilage, Spoiled")
    confidence_score: float = Field(..., description="Data confidence rating percentage")
    breakdown: ScoreBreakdown = Field(..., description="Weighted components list")
    recorded_at: datetime = Field(..., description="Calculation timestamp")

class BatchItemHealth(BaseModel):
    item_id: str
    item_name: str
    combined_health_score: float
    quality_classification: str

class BatchHealthScoreResponse(BaseModel):
    batch_id: str = Field(..., description="PostgreSQL batch UUID string link")
    batch_number: str = Field(..., description="Batch/Lot serial number")
    item_count: int = Field(..., description="Number of items in batch")
    average_health_score: float = Field(..., description="Mean average of item health scores")
    quality_classification: str = Field(..., description="Aggregated batch quality status")
    items: List[BatchItemHealth] = Field(..., description="Details of items in batch")
