from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.models.user import UserRole

# Mapping for aliases from the frontend dropdown
ROLE_ALIASES = {
    "quality_inspector": UserRole.FOOD_QUALITY_INSPECTOR,
    "food_quality_inspector": UserRole.FOOD_QUALITY_INSPECTOR,
    "administrator": UserRole.ADMIN,
    "admin": UserRole.ADMIN,
    "consumer": UserRole.CONSUMER,
    "retail_manager": UserRole.RETAIL_MANAGER,
    "warehouse_operator": UserRole.WAREHOUSE_OPERATOR,
    "warehouse_manager": UserRole.WAREHOUSE_OPERATOR,
}


class UserSignup(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72, description="Password max 72 bytes due to bcrypt limit")
    role: str = "consumer"

    @field_validator("email", mode="before")
    @classmethod
    def lowercase_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("role", mode="before")
    @classmethod
    def validate_and_normalize_role(cls, v: str) -> str:
        if not v:
            return UserRole.CONSUMER.value
        clean_v = str(v).strip().lower()
        if clean_v in ROLE_ALIASES:
            return ROLE_ALIASES[clean_v].value
        valid_roles = [r.value for r in UserRole]
        if clean_v in valid_roles:
            return clean_v
        raise ValueError(f"Invalid role '{v}'. Allowed roles: {', '.join(valid_roles)}")


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=72)
    remember_me: bool = False

    @field_validator("email", mode="before")
    @classmethod
    def lowercase_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: Optional[datetime] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
