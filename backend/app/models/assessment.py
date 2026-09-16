"""Assessment models: freshness, spoilage indicators and shelf-life predictions."""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
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

from app.core.enums import ModelKind
from app.models.base import Base, IdMixin, TimestampMixin

if TYPE_CHECKING:  # pragma: no cover
    from app.models.food import FoodBatch, FoodImage
    from app.models.user import User


class FreshnessAssessment(Base, IdMixin, TimestampMixin):
    """One run of the freshness pipeline.

    Component scores are stored so the UI can explain *why* a score was given.
    """

    __tablename__ = "freshness_assessments"
    __table_args__ = (
        Index("ix_freshness_assessments_batch_created", "batch_id", "created_at"),
        Index("ix_freshness_assessments_category", "freshness_category"),
    )

    batch_id: Mapped[int] = mapped_column(
        ForeignKey("food_batches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    image_id: Mapped[int | None] = mapped_column(
        ForeignKey("food_images.id", ondelete="SET NULL"), index=True
    )
    assessed_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    # ---- final result -------------------------------------------------
    freshness_score: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    freshness_category: Mapped[str] = mapped_column(String(24), nullable=False)
    freshness_probability: Mapped[float | None] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    spoilage_probability: Mapped[float | None] = mapped_column(Float)
    overall_health_score: Mapped[float | None] = mapped_column(Float)

    # ---- weighted component scores (0-100) ----------------------------
    visual_score: Mapped[float | None] = mapped_column(Float)
    storage_score: Mapped[float | None] = mapped_column(Float)
    shelf_life_score: Mapped[float | None] = mapped_column(Float)
    product_age_score: Mapped[float | None] = mapped_column(Float)
    # Weights actually applied (kept for reproducibility if config changes).
    weights_used: Mapped[dict | None] = mapped_column(JSON)

    # ---- provenance / explainability ---------------------------------
    model_kind: Mapped[str] = mapped_column(
        String(20), default=ModelKind.BASELINE.value, nullable=False
    )
    model_name: Mapped[str] = mapped_column(String(120), default="baseline-cv", nullable=False)
    model_version: Mapped[str] = mapped_column(String(40), default="1.0.0", nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Raw colour/texture descriptors + per-class probabilities.
    visual_features: Mapped[dict | None] = mapped_column(JSON)
    class_probabilities: Mapped[dict | None] = mapped_column(JSON)
    explanation: Mapped[dict | None] = mapped_column(JSON)
    detected_indicators: Mapped[list | None] = mapped_column(JSON)
    notes: Mapped[str | None] = mapped_column(Text)
    processing_ms: Mapped[int | None] = mapped_column(Integer)

    # ---- inputs used (snapshot so the record is self-contained) -------
    input_temperature_c: Mapped[float | None] = mapped_column(Float)
    input_humidity_pct: Mapped[float | None] = mapped_column(Float)
    input_packaging: Mapped[str | None] = mapped_column(String(40))
    input_storage_duration_days: Mapped[float | None] = mapped_column(Float)
    input_product_age_days: Mapped[float | None] = mapped_column(Float)

    batch: Mapped["FoodBatch"] = relationship(back_populates="assessments")
    image: Mapped["FoodImage | None"] = relationship(back_populates="assessments")
    indicators: Mapped[list["SpoilageIndicator"]] = relationship(
        back_populates="assessment", cascade="all, delete-orphan"
    )
    shelf_life_prediction: Mapped["ShelfLifePrediction | None"] = relationship(
        back_populates="assessment", uselist=False
    )


class SpoilageIndicator(Base, IdMixin, TimestampMixin):
    """A single detected visual spoilage signal."""

    __tablename__ = "spoilage_indicators"
    __table_args__ = (
        Index("ix_spoilage_indicators_type", "indicator_type"),
    )

    assessment_id: Mapped[int] = mapped_column(
        ForeignKey("freshness_assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    indicator_type: Mapped[str] = mapped_column(String(40), nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="LOW", nullable=False)
    # 0..1 confidence that the indicator is present.
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    # Fraction of the food surface affected (0..1).
    affected_area_ratio: Mapped[float | None] = mapped_column(Float)
    detected: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Optional bounding boxes: [{"x":..,"y":..,"w":..,"h":..,"score":..}, ...]
    regions: Mapped[list | None] = mapped_column(JSON)
    description: Mapped[str | None] = mapped_column(Text)
    detector: Mapped[str] = mapped_column(String(60), default="opencv-baseline", nullable=False)

    assessment: Mapped["FreshnessAssessment"] = relationship(back_populates="indicators")


class ShelfLifePrediction(Base, IdMixin, TimestampMixin):
    __tablename__ = "shelf_life_predictions"
    __table_args__ = (
        Index("ix_shelf_life_predictions_batch_created", "batch_id", "created_at"),
        Index("ix_shelf_life_predictions_risk", "risk_level"),
    )

    batch_id: Mapped[int] = mapped_column(
        ForeignKey("food_batches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assessment_id: Mapped[int | None] = mapped_column(
        ForeignKey("freshness_assessments.id", ondelete="SET NULL"), unique=True, index=True
    )
    predicted_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    remaining_shelf_life_days: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    predicted_expiry_date: Mapped[date | None] = mapped_column(Date, index=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), default="LOW", nullable=False)
    # Lower/upper bound of the estimate in days.
    lower_bound_days: Mapped[float | None] = mapped_column(Float)
    upper_bound_days: Mapped[float | None] = mapped_column(Float)

    model_kind: Mapped[str] = mapped_column(
        String(20), default=ModelKind.BASELINE.value, nullable=False
    )
    model_name: Mapped[str] = mapped_column(
        String(120), default="baseline-kinetic", nullable=False
    )
    model_version: Mapped[str] = mapped_column(String(40), default="1.0.0", nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Feature snapshot + per-factor contributions for explainability.
    features: Mapped[dict | None] = mapped_column(JSON)
    factors: Mapped[dict | None] = mapped_column(JSON)
    explanation: Mapped[str | None] = mapped_column(Text)
    computed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    batch: Mapped["FoodBatch"] = relationship(back_populates="shelf_life_predictions")
    assessment: Mapped["FreshnessAssessment | None"] = relationship(
        back_populates="shelf_life_prediction"
    )
