"""Inventory batch database model."""

from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class FoodBatch(TimestampMixin, Base):
    __tablename__ = "food_batches"
    __table_args__ = (
        UniqueConstraint("food_item_id", "batch_number", name="uq_food_batches_item_batch_number"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    food_item_id: Mapped[int] = mapped_column(
        ForeignKey("food_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    quantity: Mapped[float] = mapped_column(Numeric(12, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    storage_location: Mapped[str] = mapped_column(String(255), nullable=False)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)

    food_item: Mapped["FoodItem"] = relationship(back_populates="batches")
    freshness_analyses: Mapped[list["FreshnessAnalysis"]] = relationship(
        back_populates="food_batch", cascade="all, delete-orphan", passive_deletes=True
    )
    shelf_life_predictions: Mapped[list["ShelfLifePrediction"]] = relationship(
        back_populates="food_batch", cascade="all, delete-orphan", passive_deletes=True
    )
    storage_conditions: Mapped[list["StorageCondition"]] = relationship(
        back_populates="food_batch", cascade="all, delete-orphan", passive_deletes=True
    )
    recommendations: Mapped[list["Recommendation"]] = relationship(
        back_populates="food_batch", cascade="all, delete-orphan", passive_deletes=True
    )
    alerts: Mapped[list["Alert"]] = relationship(
        back_populates="food_batch", cascade="all, delete-orphan", passive_deletes=True
    )
