import enum
import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Boolean, Enum as SQLEnum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    CONSUMER = "CONSUMER"
    RETAIL_MANAGER = "RETAIL_MANAGER"
    WAREHOUSE_OPERATOR = "WAREHOUSE_OPERATOR"
    QUALITY_INSPECTOR = "QUALITY_INSPECTOR"

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String, unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(
        String, nullable=False
    )
    full_name: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole), default=UserRole.CONSUMER, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
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
