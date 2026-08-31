from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    item_id: Mapped[int | None] = mapped_column(ForeignKey("food_items.id"), index=True)
    # freshness_alert | shelf_life_warning | spoilage_notification |
    # storage_condition_alert | inventory_alert | platform_notification
    type: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    severity: Mapped[str] = mapped_column(String(10), default="info", nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(String(1000), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    emailed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
