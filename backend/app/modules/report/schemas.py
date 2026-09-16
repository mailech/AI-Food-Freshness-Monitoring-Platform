from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ReportFilterRequest(BaseModel):
    report_type: str = Field(..., description="Type of report: freshness, shelf-life, quality, waste, storage")
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    category: Optional[str] = None
    storage_location: Optional[str] = None

class ReportSummaryItem(BaseModel):
    id: str
    name: str
    category: str
    storage_location: str
    entry_date: str
    expiry_date: str
    quantity: float
    unit: str
    freshness_score: float
    remaining_shelf_life_days: float
    status: str
    packaging_type: Optional[str] = "None"
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    air_circulation: Optional[str] = "Medium"
    light_exposure: Optional[str] = "Low"
    storage_duration_days: Optional[float] = 0.0
    prediction_methodology: Optional[str] = "Empirical FoodKeeper Baseline Model (ML Regression Dataset Pending)"

class ReportPreviewResponse(BaseModel):
    report_type: str
    generated_at: datetime
    summary_stats: Dict[str, Any]
    items: List[ReportSummaryItem]
