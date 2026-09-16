"""Identity models: roles, users, profiles and refresh tokens."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import RoleName
from app.models.base import Base, IdMixin, TimestampMixin

if TYPE_CHECKING:  # pragma: no cover
    from app.models.engagement import AuditLog, Notification, Report
    from app.models.food import InventoryItem


class Role(Base, IdMixin, TimestampMixin):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    # JSON-encoded list of permission strings; the canonical grant table lives
    # in app.auth.permissions and is synced into this column by the seeder.
    permissions: Mapped[str | None] = mapped_column(Text)
    is_system: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="role")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Role {self.name}>"


class User(Base, IdMixin, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_role_active", "role_id", "is_active"),
    )

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255))

    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # OAuth2 / social login (optional - local JWT auth works without it).
    oauth_provider: Mapped[str | None] = mapped_column(String(40))
    oauth_subject: Mapped[str | None] = mapped_column(String(255), index=True)

    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    role: Mapped["Role"] = relationship(back_populates="users", lazy="joined")
    profile: Mapped["UserProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    inventory_items: Mapped[list["InventoryItem"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    reports: Mapped[list["Report"]] = relationship(back_populates="created_by")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="user")

    # ------------------------------------------------------------ helpers
    @property
    def role_name(self) -> str:
        return self.role.name if self.role else RoleName.CONSUMER.value

    def has_role(self, *names: str) -> bool:
        return self.role_name in {str(n) for n in names}

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User {self.email} role={self.role_name}>"


class UserProfile(Base, IdMixin, TimestampMixin):
    __tablename__ = "user_profiles"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    phone: Mapped[str | None] = mapped_column(String(32))
    organisation: Mapped[str | None] = mapped_column(String(160))
    job_title: Mapped[str | None] = mapped_column(String(120))
    # Primary site the user works at (warehouse / store / kitchen).
    default_storage_location: Mapped[str | None] = mapped_column(String(160))
    country: Mapped[str | None] = mapped_column(String(80))
    timezone: Mapped[str] = mapped_column(String(64), default="UTC", nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    bio: Mapped[str | None] = mapped_column(Text)
    notify_in_app: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_email: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="profile")


class RefreshToken(Base, IdMixin, TimestampMixin):
    __tablename__ = "refresh_tokens"
    __table_args__ = (
        UniqueConstraint("jti", name="uq_refresh_tokens_jti"),
        Index("ix_refresh_tokens_user_revoked", "user_id", "revoked"),
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    jti: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    # Only a SHA-256 fingerprint is stored - never the token itself.
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user_agent: Mapped[str | None] = mapped_column(String(255))
    ip_address: Mapped[str | None] = mapped_column(String(64))

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")
