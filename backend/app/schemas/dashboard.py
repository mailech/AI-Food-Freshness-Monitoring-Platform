from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class AlertItem(BaseModel):
    id: int
    name: str
    batch_id: str
    freshness_status: str
    spoilage_risk: str
    estimated_expiry_days: Optional[int] = None
    message: str


class StorageConditions(BaseModel):
    avg_temperature: float
    avg_humidity: float
    compliance_status: str
    compliance_percentage: float


class DashboardSummaryResponse(BaseModel):
    total_inventory_count: int
    avg_freshness_score: float
    active_alerts_count: int
    estimated_waste_saved_usd: float
    inventory_by_category: Dict[str, int]
    storage_conditions: StorageConditions
    priority_alerts: List[AlertItem]
    recent_items: List[Dict]
