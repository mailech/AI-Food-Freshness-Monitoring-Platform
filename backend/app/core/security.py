"""Password hashing and JWT token utilities.

Password hashing uses `bcrypt` directly (actively maintained) rather than
passlib, which is currently unmaintained. Hashes are stored in the standard
modular-crypt format so they remain portable.
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import bcrypt
import jwt

from app.config import settings
from app.core.errors import AuthenticationError

_BCRYPT_ROUNDS = 12
# bcrypt only consumes the first 72 bytes of the input. Pre-hashing with
# SHA-256 removes that limit while keeping the result deterministic.
_PREHASH = True

TokenType = Literal["access", "refresh"]


# --------------------------------------------------------------------- password
def _prepare(password: str) -> bytes:
    raw = password.encode("utf-8")
    if _PREHASH:
        return hashlib.sha256(raw).hexdigest().encode("ascii")
    return raw[:72]


def hash_password(password: str) -> str:
    """Return a salted bcrypt hash for `password`."""
    return bcrypt.hashpw(_prepare(password), bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode("ascii")


def verify_password(password: str, hashed: str | None) -> bool:
    """Constant-time password verification. Never raises on malformed input."""
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(_prepare(password), hashed.encode("ascii"))
    except (ValueError, TypeError):
        return False


def password_strength_errors(password: str) -> list[str]:
    """Return a list of human-readable policy violations (empty == acceptable)."""
    problems: list[str] = []
    if len(password) < settings.PASSWORD_MIN_LENGTH:
        problems.append(f"must be at least {settings.PASSWORD_MIN_LENGTH} characters long")
    if not any(c.isalpha() for c in password):
        problems.append("must contain at least one letter")
    if not any(c.isdigit() for c in password):
        problems.append("must contain at least one digit")
    return problems


# ------------------------------------------------------------------------ jwt
def _create_token(
    subject: str,
    token_type: TokenType,
    expires_delta: timedelta,
    extra: dict[str, Any] | None = None,
) -> tuple[str, datetime, str]:
    now = datetime.now(UTC)
    expires_at = now + expires_delta
    jti = uuid.uuid4().hex
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": jti,
        "iss": settings.APP_NAME,
    }
    if extra:
        payload.update(extra)
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, expires_at, jti


def create_access_token(
    subject: str | int, role: str | None = None, extra: dict[str, Any] | None = None
) -> tuple[str, datetime]:
    claims: dict[str, Any] = dict(extra or {})
    if role:
        claims["role"] = role
    token, expires_at, _ = _create_token(
        str(subject), "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES), claims
    )
    return token, expires_at


def create_refresh_token(subject: str | int) -> tuple[str, datetime, str]:
    """Return `(token, expires_at, jti)`; the jti is persisted for revocation."""
    return _create_token(
        str(subject), "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )


def decode_token(token: str, expected_type: TokenType | None = None) -> dict[str, Any]:
    """Decode and validate a JWT, raising `AuthenticationError` when invalid."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp", "sub", "type"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthenticationError("The token has expired.", code="TOKEN_EXPIRED") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthenticationError("The token is invalid.", code="TOKEN_INVALID") from exc

    if expected_type and payload.get("type") != expected_type:
        raise AuthenticationError(
            f"Expected a {expected_type} token.", code="TOKEN_WRONG_TYPE"
        )
    return payload


def hash_token(token: str) -> str:
    """Irreversible fingerprint used to store refresh tokens at rest."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_api_secret(length: int = 32) -> str:
    return secrets.token_urlsafe(length)
