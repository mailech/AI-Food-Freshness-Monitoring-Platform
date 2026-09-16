import enum
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Float, Boolean, Enum as SQLEnum, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

class InspectionStatus(str, enum.Enum):
    PENDING = "PENDING"
    PASSED = "PASSED"
    WARNING = "WARNING"
    REJECTED = "REJECTED"
    QUARANTINED = "QUARANTINED"

class QualityInspection(Base):
    __tablename__ = "quality_inspections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    item_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inventory_items.id", ondelete="SET NULL"), nullable=True
    )
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batches.id", ondelete="SET NULL"), nullable=True
    )
    inspector_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    
    # Input metadata
    product_name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    packaging_type: Mapped[str] = mapped_column(String, nullable=False, default="None")
    storage_location: Mapped[str] = mapped_column(String, nullable=False, default="Ambient Room")
    storage_temperature: Mapped[float] = mapped_column(Float, nullable=False, default=20.0)
    humidity: Mapped[float] = mapped_column(Float, nullable=False, default=50.0)
    air_circulation: Mapped[str] = mapped_column(String, nullable=False, default="Medium")
    light_exposure: Mapped[str] = mapped_column(String, nullable=False, default="Low")
    storage_duration_days: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    
    image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # AI & Calculation outputs
    ai_predicted_class: Mapped[str] = mapped_column(String, nullable=False, default="FRESH")
    ai_confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    freshness_score: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    predicted_shelf_life_days: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    quality_classification: Mapped[str] = mapped_column(String, nullable=False, default="Fresh")
    
    # Defect flags
    mold_detected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    bruising_detected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    damage_detected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    color_degradation: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    texture_roughness: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    # Inspector decision
    status: Mapped[InspectionStatus] = mapped_column(
        SQLEnum(InspectionStatus), default=InspectionStatus.PASSED, nullable=False
    )
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    action_taken: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    inspected_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
