"""Analysis, storage, alert, notification and report schemas."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field

from app.core.enums import (
    AirCirculation,
    AlertSeverity,
    AlertType,
    LightExposure,
    NotificationType,
    PackagingType,
    RecommendationType,
    ReportFormat,
    ReportType,
    RotationStrategy,
    SensorSource,
)
from app.schemas.common import ORMModel


# ----------------------------------------------------------------- analysis
class AnalysisRequest(BaseModel):
    """Storage/product context submitted alongside an image."""

    batch_id: int = Field(description="Batch being analysed")
    temperature_c: float | None = Field(default=None, ge=-40, le=80, examples=[6.2])
    humidity_pct: float | None = Field(default=None, ge=0, le=100, examples=[72])
    air_circulation: AirCirculation | None = None
    light_exposure: LightExposure | None = None
    packaging_type: PackagingType | None = None
    storage_duration_days: float | None = Field(default=None, ge=0, le=3650)
    notes: str | None = Field(default=None, max_length=1000)
    image_id: int | None = Field(
        default=None, description="Re-analyse a previously uploaded image."
    )


class ModelProvenanceOut(BaseModel):
    kind: str
    name: str
    version: str
    is_demo: bool
    label: str


class ScoreComponentOut(BaseModel):
    key: str
    label: str
    score: float
    weight: float
    weight_label: str
    contribution: float


class IndicatorOut(BaseModel):
    indicator_type: str
    label: str
    severity: str
    confidence: float
    affected_area_ratio: float | None = None
    detected: bool
    description: str | None = None
    regions: list[dict[str, Any]] = Field(default_factory=list)
    detector: str


class AssessmentOut(BaseModel):
    id: int
    batch_id: int
    image_id: int | None = None
    image_url: str | None = None
    overlay_url: str | None = None
    freshness_score: float
    freshness_category: str
    freshness_probability: float | None = None
    confidence: float
    spoilage_probability: float | None = None
    overall_health_score: float | None = None
    quality_score: float | None = None
    components: dict[str, float | None]
    weights_used: dict[str, float] | None = None
    detected_indicators: list[str] = Field(default_factory=list)
    class_probabilities: dict[str, float] | None = None
    model: ModelProvenanceOut
    inputs: dict[str, Any]
    indicators: list[IndicatorOut] = Field(default_factory=list)
    processing_ms: int | None = None
    notes: str | None = None
    created_at: datetime
    explanation: dict[str, Any] | None = None
    visual_features: dict[str, float] | None = None


class AnalysisResponse(BaseModel):
    """The full result the analysis page renders."""

    assessment: AssessmentOut
    shelf_life: dict[str, Any] | None = None
    recommendations: list[dict[str, Any]] = Field(default_factory=list)
    alerts_raised: list[dict[str, Any]] = Field(default_factory=list)
    batch: dict[str, Any] | None = None
    analysis_label: str
    disclaimer: str


# ------------------------------------------------------------------ storage
class StorageReadingCreate(BaseModel):
    batch_id: int | None = None
    location_name: str | None = Field(default=None, max_length=160)
    sensor_id: str | None = Field(default=None, max_length=80)
    temperature_c: float | None = Field(default=None, ge=-40, le=80)
    humidity_pct: float | None = Field(default=None, ge=0, le=100)
    air_circulation: AirCirculation | None = None
    light_exposure: LightExposure | None = None
    co2_ppm: float | None = Field(default=None, ge=0, le=50_000)
    recorded_at: datetime | None = None
    note: str | None = Field(default=None, max_length=500)
    source: SensorSource = SensorSource.MANUAL


class StorageReadingOut(ORMModel):
    id: int
    batch_id: int | None = None
    location_name: str | None = None
    sensor_id: str | None = None
    source: str
    temperature_c: float | None = None
    humidity_pct: float | None = None
    air_circulation: str | None = None
    light_exposure: str | None = None
    co2_ppm: float | None = None
    compliance_status: str | None = None
    is_violation: bool
    note: str | None = None
    recorded_at: datetime
    created_at: datetime


class StorageConditionUpdate(BaseModel):
    temperature_c: float | None = Field(default=None, ge=-40, le=80)
    humidity_pct: float | None = Field(default=None, ge=0, le=100)
    air_circulation: AirCirculation | None = None
    light_exposure: LightExposure | None = None
    location_name: str | None = Field(default=None, max_length=160)
    zone: str | None = Field(default=None, max_length=80)


class StorageSnapshotOut(BaseModel):
    batch_id: int
    batch_number: str
    product_name: str | None = None
    category_slug: str | None = None
    location_name: str | None = None
    zone: str | None = None
    storage_duration_days: float | None = None
    last_reading_at: datetime | None = None
    compliance_status: str
    risk_level: str
    storage_score: float
    violations: list[dict[str, Any]] = Field(default_factory=list)
    recommendation: str
    required: dict[str, Any]
    current: dict[str, Any]
    disclaimer: str


class SensorReadingOut(BaseModel):
    sensor_id: str
    location_name: str
    temperature_c: float | None = None
    humidity_pct: float | None = None
    co2_ppm: float | None = None
    recorded_at: datetime
    source: str


class SensorProviderOut(BaseModel):
    provider: str
    available: bool
    requires_hardware: bool
    note: str


# ------------------------------------------------------------------- alerts
class AlertOut(ORMModel):
    id: int
    batch_id: int | None = None
    alert_type: str
    severity: str
    title: str
    message: str
    context: dict[str, Any] | None = None
    is_read: bool
    read_at: datetime | None = None
    resolved: bool
    resolved_at: datetime | None = None
    resolution_note: str | None = None
    created_at: datetime
    batch_number: str | None = None
    product_name: str | None = None


class AlertUpdate(BaseModel):
    is_read: bool | None = None
    resolved: bool | None = None
    resolution_note: str | None = Field(default=None, max_length=500)


class AlertSummaryOut(BaseModel):
    total: int
    unread: int
    open: int
    by_severity: dict[str, int]
    by_type: dict[str, int]


# ------------------------------------------------------------ notifications
class NotificationOut(ORMModel):
    id: int
    notification_type: str
    title: str
    message: str
    severity: str
    link: str | None = None
    payload: dict[str, Any] | None = None
    is_read: bool
    read_at: datetime | None = None
    alert_id: int | None = None
    created_at: datetime


class NotificationListOut(BaseModel):
    items: list[NotificationOut]
    total: int
    unread: int
    page: int
    page_size: int


class BroadcastRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=3)
    severity: AlertSeverity = AlertSeverity.INFO
    role_names: list[str] | None = None


# ----------------------------------------------------------- recommendations
class RecommendationOut(BaseModel):
    id: int
    batch_id: int
    recommendation_type: str
    priority: str
    title: str
    message: str
    rationale: str | None = None
    rule_id: str | None = None
    action_label: str | None = None
    expected_impact: str | None = None
    evidence: dict[str, Any] | None = None
    acknowledged: bool
    created_at: datetime


class RecommendationFilter(BaseModel):
    recommendation_type: RecommendationType | None = None
    priority: str | None = None


# ------------------------------------------------------------------ reports
class ReportRequest(BaseModel):
    """Filters applied to a generated report."""

    report_format: ReportFormat = ReportFormat.PDF
    title: str | None = Field(default=None, max_length=200)
    date_from: date | None = None
    date_to: date | None = None
    category_slug: str | None = None
    storage_location: str | None = None
    status: list[str] | None = None
    freshness_category: list[str] | None = None
    include_charts: bool = True
    limit: int = Field(default=500, ge=1, le=5000)


class ReportOut(ORMModel):
    id: int
    report_type: str
    report_format: str
    title: str
    status: str
    filters: dict[str, Any] | None = None
    summary: dict[str, Any] | None = None
    row_count: int | None = None
    filename: str | None = None
    size_bytes: int | None = None
    generation_ms: int | None = None
    error_message: str | None = None
    created_at: datetime
    download_url: str | None = None


# ---------------------------------------------------------------- analytics
class DashboardOut(BaseModel):
    role: str
    generated_at: datetime
    inventory_health: dict[str, Any]
    freshness_distribution: dict[str, Any]
    recent_assessments: list[dict[str, Any]]
    upcoming_expiries: list[dict[str, Any]]
    # Role-specific blocks (present depending on the caller's role).
    spoilage: dict[str, Any] | None = None
    freshness_trend: dict[str, Any] | None = None
    shelf_life_distribution: dict[str, Any] | None = None
    category_quality: list[dict[str, Any]] | None = None
    waste_risk: dict[str, Any] | None = None
    alerts: dict[str, Any] | None = None
    open_alerts: list[dict[str, Any]] | None = None
    storage_compliance: dict[str, Any] | None = None
    environment_trends: dict[str, Any] | None = None
    locations: list[dict[str, Any]] | None = None
    inspection_queue: list[dict[str, Any]] | None = None
    indicator_summary: list[dict[str, Any]] | None = None
    my_recommendations: list[dict[str, Any]] | None = None
    rotation: dict[str, Any] | None = None
    platform: dict[str, Any] | None = None


class AuditLogOut(ORMModel):
    id: int
    user_id: int | None = None
    actor_email: str | None = None
    actor_role: str | None = None
    action: str
    entity_type: str | None = None
    entity_id: str | None = None
    description: str | None = None
    method: str | None = None
    path: str | None = None
    ip_address: str | None = None
    request_id: str | None = None
    success: bool
    metadata_json: dict[str, Any] | None = Field(default=None, alias="metadata_json")
    created_at: datetime


class RotationRequest(BaseModel):
    strategy: RotationStrategy = RotationStrategy.FEFO
    storage_location: str | None = None
    category_slug: str | None = None
    limit: int = Field(default=50, ge=1, le=500)


class AlertTypeInfo(BaseModel):
    value: str
    label: str


def alert_type_catalogue() -> list[AlertTypeInfo]:
    return [
        AlertTypeInfo(value=t.value, label=t.value.replace("_", " ").title())
        for t in AlertType
    ]


def notification_type_catalogue() -> list[AlertTypeInfo]:
    return [
        AlertTypeInfo(value=t.value, label=t.value.replace("_", " ").title())
        for t in NotificationType
    ]


def report_type_catalogue() -> list[AlertTypeInfo]:
    return [
        AlertTypeInfo(value=t.value, label=t.value.replace("_", " ").title())
        for t in ReportType
    ]
