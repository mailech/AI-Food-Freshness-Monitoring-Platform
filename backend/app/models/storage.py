from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class StorageReading(Base):
    __tablename__ = "storage_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(
        ForeignKey("food_items.id"), index=True, nullable=False
    )
    temperature_c: Mapped[Optional[float]] = mapped_column(Float)
    humidity_pct: Mapped[Optional[float]] = mapped_column(Float)
    light_exposure: Mapped[Optional[str]] = mapped_column(String(10))
    air_circulation: Mapped[Optional[str]] = mapped_column(String(10))
    source: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
