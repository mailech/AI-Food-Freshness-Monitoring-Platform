from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class ReportItem(BaseModel):
    id: int
    name: str
    category: str
    batch_id: str
    freshness_score: float
    freshness_status: str
    estimated_expiry_days: Optional[int] = None
    estimated_waste_saved_usd: float


class ReportSummaryResponse(BaseModel):
    waste_reduced_percentage: float
    items_tracked_total: int
    avg_freshness_score: float
    alerts_triggered_count: int
    category_breakdown: Dict[str, int]


class ReportDataResponse(BaseModel):
    items: List[ReportItem]
    total: int
