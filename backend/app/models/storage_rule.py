"""Configurable operational storage ranges by food category."""

from sqlalchemy import Enum as SAEnum, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import FoodCategory


class StorageRule(Base):
    __tablename__ = "storage_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category: Mapped[FoodCategory] = mapped_column(
        SAEnum(FoodCategory, name="food_category", values_callable=lambda enum: [item.value for item in enum]),
        unique=True, nullable=False, index=True,
    )
    temperature_min: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    temperature_max: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    humidity_min: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    humidity_max: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    air_circulation_min: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    air_circulation_max: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    light_level_min: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    light_level_max: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
