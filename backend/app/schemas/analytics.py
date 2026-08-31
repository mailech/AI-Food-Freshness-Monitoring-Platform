from pydantic import BaseModel


HEALTH_BANDS = ["Fresh", "Good", "Acceptable", "Near Spoilage", "Spoiled"]


class CategoryBreakdown(BaseModel):
    category: str
    count: int
    avg_score: float


class ItemAlert(BaseModel):
    item_id: int
    name: str
    overall_score: float
    health_category: str
    remaining_days: int
    compliant: bool | None = None


class StorageComplianceSummary(BaseModel):
    with_readings: int
    compliant_items: int
    non_compliant_items: int
    top_violations: list[str]


class WasteInsight(BaseModel):
    at_risk_items: int
    spoiled_items: int
    quantity_at_risk: float


class AdminStats(BaseModel):
    total_users: int
    total_items: int
    total_assessments: int
    total_storage_readings: int


class DashboardOut(BaseModel):
    total_items: int
    average_freshness_score: float
    health_distribution: dict[str, int]
    categories: list[CategoryBreakdown]
    expiring_soon: list[ItemAlert]
    consume_first: list[ItemAlert]
    storage_compliance: StorageComplianceSummary
    waste_insights: WasteInsight
    admin_stats: AdminStats | None = None
