"""Authentication and account service."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.permissions import (
    ROLE_DESCRIPTIONS,
    permission_strings_for,
)
from app.config import settings
from app.core.enums import AuditAction, RoleName
from app.core.errors import (
    AuthenticationError,
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from app.core.logging_config import get_logger
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    password_strength_errors,
    verify_password,
)
from app.models import RefreshToken, Role, User, UserProfile
from app.services.audit import record_audit

logger = get_logger("app.auth")

MAX_FAILED_LOGINS = 10


# ------------------------------------------------------------------ roles
def ensure_roles(db: Session) -> dict[str, Role]:
    """Create any missing system roles and keep their permission list in sync."""
    existing = {r.name: r for r in db.scalars(select(Role)).all()}
    for role_name in RoleName:
        display, description = ROLE_DESCRIPTIONS.get(
            role_name.value, (role_name.value.title(), "")
        )
        perms = json.dumps(permission_strings_for(role_name.value))
        role = existing.get(role_name.value)
        if role is None:
            role = Role(
                name=role_name.value,
                display_name=display,
                description=description,
                permissions=perms,
                is_system=True,
            )
            db.add(role)
            existing[role_name.value] = role
        else:
            role.display_name = display
            role.description = description
            role.permissions = perms
    db.flush()
    return existing


def get_role(db: Session, name: str) -> Role:
    role = db.scalar(select(Role).where(Role.name == str(name).upper()))
    if role is None:
        ensure_roles(db)
        role = db.scalar(select(Role).where(Role.name == str(name).upper()))
    if role is None:
        raise NotFoundError(f"Role '{name}' does not exist.", code="ROLE_NOT_FOUND")
    return role


# ----------------------------------------------------------------- lookups
def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.email) == email.strip().lower()))


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.username) == username.strip().lower()))


def get_user_by_identifier(db: Session, identifier: str) -> User | None:
    """Login accepts either an email address or a username."""
    return get_user_by_email(db, identifier) or get_user_by_username(db, identifier)


def get_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found.", code="USER_NOT_FOUND")
    return user


# ---------------------------------------------------------------- register
def _validate_password(password: str) -> None:
    problems = password_strength_errors(password)
    if problems:
        raise ValidationError(
            "Password does not meet the security policy.",
            code="WEAK_PASSWORD",
            details={"requirements": problems},
        )


def _suggest_username(db: Session, email: str, requested: str | None) -> str:
    base = (requested or email.split("@")[0]).strip().lower()
    base = "".join(ch for ch in base if ch.isalnum() or ch in {".", "_", "-"}) or "user"
    candidate = base
    suffix = 1
    while get_user_by_username(db, candidate) is not None:
        suffix += 1
        candidate = f"{base}{suffix}"
    return candidate


def register_user(
    db: Session,
    *,
    email: str,
    password: str,
    full_name: str,
    username: str | None = None,
    role_name: str = RoleName.CONSUMER.value,
    profile: dict[str, Any] | None = None,
    allow_privileged: bool = False,
    request_meta: dict[str, Any] | None = None,
) -> User:
    """Create a new user account.

    Self-service registration may not grant ADMIN; only an authenticated admin
    (``allow_privileged=True``) can create administrators.
    """
    email_norm = email.strip().lower()
    if get_user_by_email(db, email_norm):
        raise ConflictError("An account with this email already exists.", code="EMAIL_TAKEN")

    _validate_password(password)

    wanted_role = RoleName.parse(role_name, RoleName.CONSUMER)
    if wanted_role == RoleName.ADMIN and not allow_privileged:
        raise PermissionDeniedError(
            "Administrator accounts cannot be created through public registration.",
            code="ROLE_NOT_ALLOWED",
        )

    role = get_role(db, wanted_role.value)
    user = User(
        email=email_norm,
        username=_suggest_username(db, email_norm, username),
        full_name=full_name.strip(),
        hashed_password=hash_password(password),
        role_id=role.id,
        is_active=True,
        is_verified=False,
        is_superuser=wanted_role == RoleName.ADMIN,
    )
    db.add(user)
    db.flush()

    user.profile = UserProfile(user_id=user.id, **(profile or {}))
    db.flush()

    record_audit(
        db,
        action=AuditAction.REGISTER,
        user=user,
        entity_type="user",
        entity_id=str(user.id),
        description=f"Registered account with role {wanted_role.value}",
        request_meta=request_meta,
    )
    logger.info("user registered id=%s role=%s", user.id, wanted_role.value)
    return user


# ------------------------------------------------------------------- login
def authenticate(
    db: Session, identifier: str, password: str, request_meta: dict[str, Any] | None = None
) -> User:
    user = get_user_by_identifier(db, identifier)
    if user is None or not verify_password(password, user.hashed_password):
        record_audit(
            db,
            action=AuditAction.LOGIN_FAILED,
            user=user,
            entity_type="user",
            entity_id=str(user.id) if user else None,
            description=f"Failed login for '{identifier}'",
            success=False,
            request_meta=request_meta,
        )
        if user is not None:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        db.commit()
        raise AuthenticationError("Incorrect email/username or password.", code="INVALID_CREDENTIALS")

    if not user.is_active:
        raise AuthenticationError("This account has been deactivated.", code="ACCOUNT_DISABLED")

    user.failed_login_attempts = 0
    user.last_login_at = datetime.now(UTC)
    return user


def issue_tokens(
    db: Session, user: User, request_meta: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Mint an access + refresh token pair and persist the refresh fingerprint."""
    access_token, access_expires = create_access_token(user.id, role=user.role_name)
    refresh_token, refresh_expires, jti = create_refresh_token(user.id)

    db.add(
        RefreshToken(
            user_id=user.id,
            jti=jti,
            token_hash=hash_token(refresh_token),
            expires_at=refresh_expires,
            user_agent=(request_meta or {}).get("user_agent"),
            ip_address=(request_meta or {}).get("ip_address"),
        )
    )
    db.flush()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "expires_at": access_expires,
        "refresh_expires_at": refresh_expires,
    }


def refresh_access_token(
    db: Session, refresh_token: str, request_meta: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Rotate a refresh token: the old one is revoked, a new pair is issued."""
    payload = decode_token(refresh_token, expected_type="refresh")
    jti = payload.get("jti")
    stored = db.scalar(select(RefreshToken).where(RefreshToken.jti == jti))
    if stored is None or stored.revoked:
        raise AuthenticationError(
            "The refresh token has been revoked.", code="TOKEN_REVOKED"
        )
    if stored.token_hash != hash_token(refresh_token):
        raise AuthenticationError("The refresh token is invalid.", code="TOKEN_INVALID")

    user = get_user(db, int(payload["sub"]))
    if not user.is_active:
        raise AuthenticationError("This account has been deactivated.", code="ACCOUNT_DISABLED")

    stored.revoked = True
    stored.revoked_at = datetime.now(UTC)

    tokens = issue_tokens(db, user, request_meta)
    record_audit(
        db,
        action=AuditAction.TOKEN_REFRESH,
        user=user,
        entity_type="user",
        entity_id=str(user.id),
        description="Refreshed access token",
        request_meta=request_meta,
    )
    return tokens


def revoke_refresh_token(db: Session, refresh_token: str | None, user: User) -> int:
    """Revoke one token (when supplied) or every active token for the user."""
    now = datetime.now(UTC)
    revoked = 0
    if refresh_token:
        try:
            payload = decode_token(refresh_token, expected_type="refresh")
            stored = db.scalar(select(RefreshToken).where(RefreshToken.jti == payload.get("jti")))
        except AuthenticationError:
            stored = None
        if stored is not None and not stored.revoked:
            stored.revoked = True
            stored.revoked_at = now
            revoked = 1
    else:
        tokens = db.scalars(
            select(RefreshToken).where(
                RefreshToken.user_id == user.id, RefreshToken.revoked.is_(False)
            )
        ).all()
        for token in tokens:
            token.revoked = True
            token.revoked_at = now
            revoked += 1
    return revoked


# ---------------------------------------------------------------- password
def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.hashed_password):
        raise AuthenticationError("The current password is incorrect.", code="INVALID_CREDENTIALS")
    _validate_password(new_password)
    user.hashed_password = hash_password(new_password)
    revoke_refresh_token(db, None, user)


def set_password(db: Session, user: User, new_password: str) -> None:
    """Administrative password reset (no current-password check)."""
    _validate_password(new_password)
    user.hashed_password = hash_password(new_password)
    revoke_refresh_token(db, None, user)


# ------------------------------------------------------------- oauth (opt-in)
def upsert_oauth_user(
    db: Session, *, provider: str, subject: str, email: str, full_name: str
) -> User:
    """Link or create an account from an OAuth2/OIDC identity.

    The flow is disabled unless `OAUTH_ENABLED=true`; local JWT auth is the
    fully-supported default.
    """
    if not settings.OAUTH_ENABLED:
        raise PermissionDeniedError(
            "OAuth login is not enabled on this deployment.", code="OAUTH_DISABLED"
        )
    user = db.scalar(
        select(User).where(User.oauth_provider == provider, User.oauth_subject == subject)
    ) or get_user_by_email(db, email)

    if user is None:
        role = get_role(db, RoleName.CONSUMER.value)
        user = User(
            email=email.strip().lower(),
            username=_suggest_username(db, email, None),
            full_name=full_name or email.split("@")[0],
            hashed_password=None,
            role_id=role.id,
            is_active=True,
            is_verified=True,
            oauth_provider=provider,
            oauth_subject=subject,
        )
        db.add(user)
        db.flush()
        user.profile = UserProfile(user_id=user.id)
    else:
        user.oauth_provider = provider
        user.oauth_subject = subject
        user.is_verified = True
    db.flush()
    return user



# ------------------------------------------------------------- google oauth
def verify_google_id_token(credential: str) -> dict[str, Any]:
    """Verify a Google Identity Services ID token and return its claims.

    Raises AuthenticationError on any verification failure. The audience is
    checked against OAUTH_GOOGLE_CLIENT_ID so tokens minted for other apps are
    rejected.
    """
    client_id = settings.OAUTH_GOOGLE_CLIENT_ID
    if not client_id:
        raise AuthenticationError(
            "Google login is not configured on this deployment.",
            code="OAUTH_NOT_CONFIGURED",
        )
    try:
        # Local imports keep google-auth optional for baseline deployments.
        from google.auth.transport import requests as google_requests  # noqa: PLC0415
        from google.oauth2 import id_token as google_id_token  # noqa: PLC0415
    except ImportError as exc:  # pragma: no cover - dependency missing
        raise AuthenticationError(
            "Google login dependencies are not installed on the server.",
            code="OAUTH_DEPENDENCY_MISSING",
        ) from exc

    try:
        claims = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), client_id
        )
    except ValueError as exc:
        logger.warning("Google ID token verification failed: %s", exc)
        raise AuthenticationError(
            "Could not verify the Google sign-in.", code="INVALID_GOOGLE_TOKEN"
        ) from exc

    if claims.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
        raise AuthenticationError("Unexpected token issuer.", code="INVALID_GOOGLE_TOKEN")
    if not claims.get("email"):
        raise AuthenticationError("Google account has no email.", code="INVALID_GOOGLE_TOKEN")
    if claims.get("email_verified") is False:
        raise AuthenticationError(
            "Google account email is not verified.", code="EMAIL_NOT_VERIFIED"
        )
    return claims


def login_with_google(
    db: Session, credential: str, request_meta: dict[str, Any] | None = None
) -> User:
    """Verify a Google ID token and get-or-create the linked CONSUMER account."""
    claims = verify_google_id_token(credential)
    user = upsert_oauth_user(
        db,
        provider="google",
        subject=str(claims["sub"]),
        email=str(claims["email"]),
        full_name=str(claims.get("name") or claims["email"].split("@")[0]),
    )
    if not user.is_active:
        raise AuthenticationError("This account has been deactivated.", code="ACCOUNT_DISABLED")
    user.failed_login_attempts = 0
    user.last_login_at = datetime.now(UTC)
    return user
