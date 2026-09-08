"""Food item database model."""

from __future__ import annotations

from sqlalchemy import Enum as SAEnum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import FoodCategory
from app.models.mixins import TimestampMixin


class FoodItem(TimestampMixin, Base):
    __tablename__ = "food_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[FoodCategory] = mapped_column(
        SAEnum(FoodCategory, name="food_category", values_callable=lambda enum: [item.value for item in enum]),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    batches: Mapped[list["FoodBatch"]] = relationship(
        back_populates="food_item", cascade="all, delete-orphan", passive_deletes=True
    )
