"""Freshness analysis database model."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import FreshnessCategory


class FreshnessAnalysis(Base):
    __tablename__ = "freshness_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    food_batch_id: Mapped[int] = mapped_column(
        ForeignKey("food_batches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    freshness_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    freshness_category: Mapped[FreshnessCategory | None] = mapped_column(
        SAEnum(
            FreshnessCategory,
            name="freshness_category",
            values_callable=lambda enum: [item.value for item in enum],
        ),
        nullable=True,
    )
    spoilage_probability: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    analysis_result: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    analyzed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    food_batch: Mapped["FoodBatch"] = relationship(back_populates="freshness_analyses")
