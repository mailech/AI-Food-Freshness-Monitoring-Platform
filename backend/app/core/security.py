"""Password hashing, JWT handling, and reusable authorization dependencies."""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/authentication/login")
password_hashing = PasswordHash.recommended()

_credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)


def hash_password(password: str) -> str:
    """Create an Argon2 password hash for storage."""
    return password_hashing.hash(password)


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against its stored Argon2 hash."""
    return password_hashing.verify(password, stored_hash)


def _jwt_secret() -> str:
    """Read the configured JWT secret without exposing it."""
    if settings.jwt_secret_key is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT signing is not configured.",
        )
    return settings.jwt_secret_key.get_secret_value()


def create_access_token(user_id: int) -> str:
    """Create a time-limited access token for a user."""
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": expires_at},
        _jwt_secret(),
        algorithm=settings.jwt_algorithm,
    )


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Resolve an active User from a valid Bearer JWT."""
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[settings.jwt_algorithm])
        user_id = int(payload.get("sub", ""))
    except (InvalidTokenError, TypeError, ValueError):
        raise _credentials_exception from None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _credentials_exception
    return user


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    """Create a dependency requiring the authenticated user to hold a role."""

    def role_dependency(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource.",
            )
        return current_user

    return role_dependency
