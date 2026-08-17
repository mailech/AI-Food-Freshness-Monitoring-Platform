from typing import List
from pydantic import BaseModel, Field

class RecommendationResponse(BaseModel):
    item_id: str = Field(..., description="PostgreSQL item UUID string link")
    item_name: str = Field(..., description="Product label")
    priority_level: str = Field(..., description="HIGH, MEDIUM, LOW action priority")
    storage_advisories: List[str] = Field(..., description="Temperature, humidity, and packaging settings")
    consumption_advisories: List[str] = Field(..., description="Remaining life consumption guides")
    rotation_advisories: List[str] = Field(..., description="FEFO/FIFO inventory queue rotation guides")
    waste_reduction_advisories: List[str] = Field(..., description="Repurposing or composting options")
    quality_improvement_advisories: List[str] = Field(..., description="Handling, lighting, and ventilation adjustments")

class ItemRecommendationSummary(BaseModel):
    item_id: str
    item_name: str
    priority_level: str

class BatchRecommendationSummary(BaseModel):
    batch_id: str = Field(..., description="PostgreSQL batch UUID string link")
    batch_number: str = Field(..., description="Batch/Lot serial number")
    item_count: int = Field(..., description="Number of items in batch")
    high_priority_count: int = Field(..., description="Number of items requiring immediate attention")
    recommendations_summary: List[str] = Field(..., description="Batch-level summary statements")
    items: List[ItemRecommendationSummary] = Field(..., description="Status breakdown of batch items")
