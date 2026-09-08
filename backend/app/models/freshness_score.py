"""Composite freshness-scoring evaluation database model."""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class FreshnessScore(TimestampMixin, Base):
    """Persist scoring inputs and outcomes without deriving scientific values."""

    __tablename__ = "freshness_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    food_batch_id: Mapped[int] = mapped_column(
        ForeignKey("food_batches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    visual_freshness_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    storage_condition_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    shelf_life_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    product_age_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    freshness_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    visual_weight: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False, server_default="0.40")
    storage_weight: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False, server_default="0.25")
    shelf_life_weight: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False, server_default="0.20")
    product_age_weight: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False, server_default="0.15")
    status: Mapped[str] = mapped_column(
        String(100), nullable=False, server_default="pending_model_integration"
    )

    food_batch: Mapped["FoodBatch"] = relationship()
