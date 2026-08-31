from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ImageUpload(Base):
    __tablename__ = "image_uploads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(
        ForeignKey("food_items.id"), index=True, nullable=False
    )
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("food_items.id"), index=True, nullable=False)
    image_id: Mapped[int] = mapped_column(ForeignKey("image_uploads.id"), index=True, nullable=False)
    predicted_class: Mapped[str] = mapped_column(String(80), nullable=False)
    is_fresh: Mapped[bool]
    confidence: Mapped[float] = mapped_column(Float)
    spoilage_probability: Mapped[float] = mapped_column(Float)
    freshness_score: Mapped[float] = mapped_column(Float)
    freshness_category: Mapped[str] = mapped_column(String(40))
    assessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
