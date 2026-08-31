import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class UserRole(str, enum.Enum):
    CONSUMER = "Consumer"
    RETAIL_MANAGER = "Retail Manager"
    WAREHOUSE_OPERATOR = "Warehouse Operator"
    QUALITY_INSPECTOR = "Food Quality Inspector"
    ADMIN = "Administrator"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    oauth_provider: Mapped[str | None] = mapped_column(String(40), index=True)
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, length=40), default=UserRole.CONSUMER, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
