"""Shelf-life prediction database model."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ShelfLifePrediction(Base):
    __tablename__ = "shelf_life_predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    food_batch_id: Mapped[int] = mapped_column(
        ForeignKey("food_batches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    remaining_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    predicted_expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    temperature: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    humidity: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    packaging: Mapped[str | None] = mapped_column(String(100), nullable=True)
    storage_duration: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prediction_result: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    predicted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    food_batch: Mapped["FoodBatch"] = relationship(back_populates="shelf_life_predictions")
