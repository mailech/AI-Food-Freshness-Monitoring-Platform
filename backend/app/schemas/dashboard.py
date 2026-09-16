"""Response schemas for the authenticated dashboard summary."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class StorageComplianceSummary(BaseModel):
    """Counts from the existing prototype storage-alert policy, not a new standard."""

    evaluated: int = Field(ge=0)
    compliant: int = Field(ge=0)
    noncompliant: int = Field(ge=0)
    unknown: int = Field(ge=0)


class EatMeFirstItem(BaseModel):
    """Lowest complete-score batches, ranked for priority consumption."""

    food_batch_id: int
    batch_number: str
    product_name: str
    freshness_score: Decimal
    storage_location: str
    expiry_date: date | None
    priority: str


class RecentBatchItem(BaseModel):
    """Newest inventory batches with optional latest complete freshness score."""

    food_batch_id: int
    batch_number: str
    product_name: str
    expiry_status: str
    storage_location: str
    quantity: float
    unit: str
    created_at: datetime
    updated_at: datetime
    latest_freshness_score: Decimal | None


class DashboardSummary(BaseModel):
    """Single-response dashboard analytics from existing recorded data."""

    model_config = ConfigDict(from_attributes=True)

    total_monitored_batches: int = Field(ge=0)
    average_freshness_score: Decimal | None
    scored_batch_count: int = Field(ge=0)
    ai_risk_batch_count: int = Field(ge=0)
    active_alert_count: int = Field(ge=0)
    storage_compliance: StorageComplianceSummary
    eat_me_first: list[EatMeFirstItem]
    recent_batches: list[RecentBatchItem]
