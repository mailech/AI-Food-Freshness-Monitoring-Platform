"""Authentication, user and profile schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.enums import RoleName
from app.schemas.common import ORMModel


# ---------------------------------------------------------------- requests
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128, examples=["Demo@1234"])
    full_name: str = Field(min_length=2, max_length=160, examples=["Asha Menon"])
    username: str | None = Field(default=None, min_length=3, max_length=80)
    role: RoleName = Field(
        default=RoleName.CONSUMER,
        description="Requested role. ADMIN is rejected for public registration.",
    )
    phone: str | None = Field(default=None, max_length=32)
    organisation: str | None = Field(default=None, max_length=160)
    default_storage_location: str | None = Field(default=None, max_length=160)

    @field_validator("full_name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        return v.strip()


class LoginRequest(BaseModel):
    """JSON login. The OAuth2 password form is also accepted at /auth/token."""

    username: str = Field(
        description="Email address or username", examples=["consumer@freshness.local"]
    )
    password: str = Field(examples=["Demo@1234"])


class RefreshRequest(BaseModel):
    refresh_token: str


class GoogleLoginRequest(BaseModel):
    """Google Identity Services sign-in: the browser sends the ID token (JWT)."""

    credential: str = Field(
        description="Google ID token (JWT) returned by Google Identity Services.",
        min_length=10,
    )


class LogoutRequest(BaseModel):
    refresh_token: str | None = Field(
        default=None, description="Omit to revoke every session for this user."
    )


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class AdminSetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


class UserProfileUpdate(BaseModel):
    phone: str | None = Field(default=None, max_length=32)
    organisation: str | None = Field(default=None, max_length=160)
    job_title: str | None = Field(default=None, max_length=120)
    default_storage_location: str | None = Field(default=None, max_length=160)
    country: str | None = Field(default=None, max_length=80)
    timezone: str | None = Field(default=None, max_length=64)
    avatar_url: str | None = Field(default=None, max_length=500)
    bio: str | None = None
    notify_in_app: bool | None = None
    notify_email: bool | None = None


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    username: str | None = Field(default=None, min_length=3, max_length=80)
    profile: UserProfileUpdate | None = None


class AdminUserUpdate(UserUpdate):
    role: RoleName | None = None
    is_active: bool | None = None
    is_verified: bool | None = None


class AdminUserCreate(RegisterRequest):
    """Admins may create any role, including other admins."""

    role: RoleName = RoleName.CONSUMER
    is_active: bool = True
    is_verified: bool = True


# --------------------------------------------------------------- responses
class RoleOut(ORMModel):
    id: int
    name: str
    display_name: str
    description: str | None = None


class UserProfileOut(ORMModel):
    phone: str | None = None
    organisation: str | None = None
    job_title: str | None = None
    default_storage_location: str | None = None
    country: str | None = None
    timezone: str = "UTC"
    avatar_url: str | None = None
    bio: str | None = None
    notify_in_app: bool = True
    notify_email: bool = False


class UserOut(ORMModel):
    id: int
    # Plain `str` on output: the value was already validated on the way in, and
    # re-validating would reject otherwise-legitimate internal domains.
    email: str
    username: str
    full_name: str
    role: RoleOut
    is_active: bool
    is_verified: bool
    last_login_at: datetime | None = None
    created_at: datetime
    profile: UserProfileOut | None = None


class UserMeOut(UserOut):
    """`/users/me` also returns the permission list so the UI can adapt."""

    permissions: list[str] = Field(default_factory=list)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    expires_at: datetime
    refresh_expires_at: datetime


class AuthResponse(BaseModel):
    user: UserMeOut
    tokens: TokenPair


class OAuthConfigOut(BaseModel):
    """Advertises whether social login is configured for this deployment."""

    enabled: bool
    providers: list[str]
    redirect_url: str | None = None
    note: str
