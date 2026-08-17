import enum
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Float, Enum as SQLEnum, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

class BatchStatus(str, enum.Enum):
    FRESH = "FRESH"
    WARNING = "WARNING"
    SPOILED = "SPOILED"

class Batch(Base):
    __tablename__ = "batches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    batch_number: Mapped[str] = mapped_column(
        String, unique=True, index=True, nullable=False
    )
    supplier_name: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )
    received_date: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(
        String, nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(
        String, nullable=False, index=True
    )
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("batches.id", ondelete="SET NULL"), nullable=True
    )
    quantity: Mapped[float] = mapped_column(
        Float, nullable=False
    )
    unit: Mapped[str] = mapped_column(
        String, nullable=False
    )
    packaging_type: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )
    entry_date: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    expiry_date: Mapped[datetime] = mapped_column(
        DateTime, nullable=False
    )
    status: Mapped[BatchStatus] = mapped_column(
        SQLEnum(BatchStatus), default=BatchStatus.FRESH, nullable=False
    )
    storage_location: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    batch = relationship("Batch", backref="items")
    created_by = relationship("User", backref="items")
