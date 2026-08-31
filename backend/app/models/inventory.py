from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class FoodCategory(Base):
    __tablename__ = "food_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)


class FoodItem(Base):
    __tablename__ = "food_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("food_categories.id"), index=True, nullable=False
    )
    packaging_type: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    category: Mapped[FoodCategory] = relationship(lazy="joined")


class Batch(Base):
    __tablename__ = "batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(
        ForeignKey("food_items.id"), index=True, nullable=False
    )
    batch_code: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(12, 3), default=1, nullable=False)
    received_date: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    expiry_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    storage_location: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
