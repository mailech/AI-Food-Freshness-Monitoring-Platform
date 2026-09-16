"""Engagement models: recommendations, alerts, notifications, reports, audit logs."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import (
    AlertSeverity,
    RecommendationPriority,
    ReportFormat,
    ReportStatus,
)
from app.models.base import Base, IdMixin, TimestampMixin

if TYPE_CHECKING:  # pragma: no cover
    from app.models.food import FoodBatch
    from app.models.user import User


class Recommendation(Base, IdMixin, TimestampMixin):
    """An explainable, rule-derived suggestion attached to a batch."""

    __tablename__ = "recommendations"
    __table_args__ = (
        Index("ix_recommendations_batch_type", "batch_id", "recommendation_type"),
        Index("ix_recommendations_priority", "priority"),
    )

    batch_id: Mapped[int] = mapped_column(
        ForeignKey("food_batches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assessment_id: Mapped[int | None] = mapped_column(
        ForeignKey("freshness_assessments.id", ondelete="SET NULL"), index=True
    )

    recommendation_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    priority: Mapped[str] = mapped_column(
        String(16), default=RecommendationPriority.MEDIUM.value, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    # Human-readable justification ("temperature 8.4 C exceeds the 4 C maximum").
    rationale: Mapped[str | None] = mapped_column(Text)
    # Machine-readable rule id so the engine stays testable and auditable.
    rule_id: Mapped[str | None] = mapped_column(String(80), index=True)
    action_label: Mapped[str | None] = mapped_column(String(120))
    expected_impact: Mapped[str | None] = mapped_column(String(255))
    evidence: Mapped[dict | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    batch: Mapped["FoodBatch"] = relationship(back_populates="recommendations")


class Alert(Base, IdMixin, TimestampMixin):
    __tablename__ = "alerts"
    __table_args__ = (
        Index("ix_alerts_severity_resolved", "severity", "resolved"),
        Index("ix_alerts_batch_created", "batch_id", "created_at"),
        Index("ix_alerts_type_created", "alert_type", "created_at"),
    )

    batch_id: Mapped[int | None] = mapped_column(
        ForeignKey("food_batches.id", ondelete="CASCADE"), index=True
    )
    triggered_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    alert_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(
        String(16), default=AlertSeverity.INFO.value, nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    # Stable key used to avoid re-raising the same open alert repeatedly.
    dedupe_key: Mapped[str | None] = mapped_column(String(200), index=True)
    context: Mapped[dict | None] = mapped_column(JSON)

    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    resolution_note: Mapped[str | None] = mapped_column(Text)

    batch: Mapped["FoodBatch | None"] = relationship(back_populates="alerts")
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="alert", cascade="all, delete-orphan"
    )


class Notification(Base, IdMixin, TimestampMixin):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_read", "user_id", "is_read"),
        Index("ix_notifications_user_created", "user_id", "created_at"),
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    alert_id: Mapped[int | None] = mapped_column(
        ForeignKey("alerts.id", ondelete="CASCADE"), index=True
    )

    notification_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(
        String(16), default=AlertSeverity.INFO.value, nullable=False
    )
    link: Mapped[str | None] = mapped_column(String(300))
    payload: Mapped[dict | None] = mapped_column(JSON)

    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Email delivery is optional architecture; false when EMAIL_ENABLED=false.
    email_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="notifications")
    alert: Mapped["Alert | None"] = relationship(back_populates="notifications")


class Report(Base, IdMixin, TimestampMixin):
    __tablename__ = "reports"
    __table_args__ = (
        Index("ix_reports_type_created", "report_type", "created_at"),
    )

    report_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    report_format: Mapped[str] = mapped_column(
        String(10), default=ReportFormat.PDF.value, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), default=ReportStatus.PENDING.value, nullable=False, index=True
    )

    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    filters: Mapped[dict | None] = mapped_column(JSON)
    summary: Mapped[dict | None] = mapped_column(JSON)
    row_count: Mapped[int | None] = mapped_column(Integer)

    storage_key: Mapped[str | None] = mapped_column(String(500))
    filename: Mapped[str | None] = mapped_column(String(255))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    generation_ms: Mapped[int | None] = mapped_column(Integer)
    error_message: Mapped[str | None] = mapped_column(Text)

    created_by: Mapped["User | None"] = relationship(back_populates="reports")


class AuditLog(Base, IdMixin, TimestampMixin):
    """Append-only record of security- and data-relevant operations."""

    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_user_created", "user_id", "created_at"),
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
        Index("ix_audit_logs_action_created", "action", "created_at"),
    )

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    actor_email: Mapped[str | None] = mapped_column(String(255))
    actor_role: Mapped[str | None] = mapped_column(String(40))

    action: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    entity_type: Mapped[str | None] = mapped_column(String(60), index=True)
    entity_id: Mapped[str | None] = mapped_column(String(60))
    description: Mapped[str | None] = mapped_column(Text)

    method: Mapped[str | None] = mapped_column(String(10))
    path: Mapped[str | None] = mapped_column(String(300))
    status_code: Mapped[int | None] = mapped_column(Integer)
    ip_address: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(String(255))
    request_id: Mapped[str | None] = mapped_column(String(40), index=True)
    duration_ms: Mapped[float | None] = mapped_column(Float)
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Never contains passwords or tokens - the logger redacts sensitive keys.
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON)

    user: Mapped["User | None"] = relationship(back_populates="audit_logs")
