"""Storage condition and environmental reading models."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import ComplianceStatus, SensorSource
from app.models.base import Base, IdMixin, TimestampMixin

if TYPE_CHECKING:  # pragma: no cover
    from app.models.food import FoodBatch


class StorageCondition(Base, IdMixin, TimestampMixin):
    """The *declared* storage setup for a batch, plus its latest evaluation.

    The required range is copied from the category profile at creation time so a
    later change to the defaults does not silently rewrite history.
    """

    __tablename__ = "storage_conditions"
    __table_args__ = (
        Index("ix_storage_conditions_batch_active", "batch_id", "is_active"),
        Index("ix_storage_conditions_compliance", "compliance_status"),
    )

    batch_id: Mapped[int] = mapped_column(
        ForeignKey("food_batches.id", ondelete="CASCADE"), nullable=False, index=True
    )

    location_name: Mapped[str | None] = mapped_column(String(160), index=True)
    zone: Mapped[str | None] = mapped_column(String(80))

    # ---- current observed conditions ----------------------------------
    temperature_c: Mapped[float | None] = mapped_column(Float)
    humidity_pct: Mapped[float | None] = mapped_column(Float)
    air_circulation: Mapped[str | None] = mapped_column(String(20))
    light_exposure: Mapped[str | None] = mapped_column(String(20))
    storage_duration_days: Mapped[float | None] = mapped_column(Float)

    # ---- required envelope (snapshot of the applicable rule) ----------
    required_temp_min_c: Mapped[float | None] = mapped_column(Float)
    required_temp_max_c: Mapped[float | None] = mapped_column(Float)
    required_humidity_min_pct: Mapped[float | None] = mapped_column(Float)
    required_humidity_max_pct: Mapped[float | None] = mapped_column(Float)

    # ---- evaluation ---------------------------------------------------
    compliance_status: Mapped[str] = mapped_column(
        String(20), default=ComplianceStatus.UNKNOWN.value, nullable=False
    )
    storage_score: Mapped[float | None] = mapped_column(Float)
    risk_level: Mapped[str | None] = mapped_column(String(20))
    violations: Mapped[list | None] = mapped_column(JSON)
    recommendation: Mapped[str | None] = mapped_column(Text)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    evaluated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    batch: Mapped["FoodBatch"] = relationship(back_populates="storage_conditions")


class StorageReading(Base, IdMixin, TimestampMixin):
    """A time-series environmental sample (manual entry, mock or MQTT sensor)."""

    __tablename__ = "storage_readings"
    __table_args__ = (
        Index("ix_storage_readings_batch_recorded", "batch_id", "recorded_at"),
        Index("ix_storage_readings_location_recorded", "location_name", "recorded_at"),
    )

    batch_id: Mapped[int | None] = mapped_column(
        ForeignKey("food_batches.id", ondelete="CASCADE"), index=True
    )
    storage_condition_id: Mapped[int | None] = mapped_column(
        ForeignKey("storage_conditions.id", ondelete="SET NULL"), index=True
    )
    recorded_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    location_name: Mapped[str | None] = mapped_column(String(160), index=True)
    sensor_id: Mapped[str | None] = mapped_column(String(80), index=True)
    source: Mapped[str] = mapped_column(
        String(20), default=SensorSource.MANUAL.value, nullable=False, index=True
    )

    temperature_c: Mapped[float | None] = mapped_column(Float)
    humidity_pct: Mapped[float | None] = mapped_column(Float)
    air_circulation: Mapped[str | None] = mapped_column(String(20))
    light_exposure: Mapped[str | None] = mapped_column(String(20))
    co2_ppm: Mapped[float | None] = mapped_column(Float)

    compliance_status: Mapped[str | None] = mapped_column(String(20), index=True)
    is_violation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    note: Mapped[str | None] = mapped_column(Text)

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )

    batch: Mapped["FoodBatch | None"] = relationship(back_populates="storage_readings")
