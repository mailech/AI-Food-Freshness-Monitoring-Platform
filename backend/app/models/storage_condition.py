"""Storage condition monitoring database model."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StorageCondition(Base):
    __tablename__ = "storage_conditions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    food_batch_id: Mapped[int] = mapped_column(
        ForeignKey("food_batches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    temperature: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    humidity: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    air_circulation: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    light_level: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    food_batch: Mapped["FoodBatch"] = relationship(back_populates="storage_conditions")
