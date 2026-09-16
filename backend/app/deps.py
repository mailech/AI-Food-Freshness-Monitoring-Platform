"""Shared FastAPI dependencies (dependency injection layer)."""

from __future__ import annotations

from collections.abc import Callable
from typing import Annotated, Any

from fastapi import Depends, Query, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.auth.permissions import permissions_for, role_has_permission
from app.config import settings
from app.core.enums import Permission, RoleName
from app.core.errors import AuthenticationError, PermissionDeniedError
from app.core.security import decode_token
from app.database import get_db
from app.models import User

# `auto_error=False` lets us emit the platform's own error envelope.
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login",
    auto_error=False,
    scheme_name="JWT",
    description="Paste the `access_token` returned by /auth/login.",
)

DbSession = Annotated[Session, Depends(get_db)]


def get_request_meta(request: Request) -> dict[str, Any]:
    """Client metadata attached to audit records."""
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (
        request.client.host if request.client else None
    )
    return {
        "method": request.method,
        "path": request.url.path,
        "ip_address": ip,
        "user_agent": (request.headers.get("user-agent") or "")[:255] or None,
        "request_id": getattr(request.state, "request_id", None),
    }


RequestMeta = Annotated[dict, Depends(get_request_meta)]


def get_current_user(
    request: Request,
    db: DbSession,
    token: Annotated[str | None, Depends(oauth2_scheme)] = None,
) -> User:
    """Resolve the authenticated user from the bearer access token."""
    if not token:
        raise AuthenticationError("An access token is required.", code="NOT_AUTHENTICATED")

    payload = decode_token(token, expected_type="access")
    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise AuthenticationError("The token subject is invalid.", code="TOKEN_INVALID") from exc

    user = db.get(User, user_id)
    if user is None:
        raise AuthenticationError("The account no longer exists.", code="USER_NOT_FOUND")
    if not user.is_active:
        raise AuthenticationError("This account has been deactivated.", code="ACCOUNT_DISABLED")

    request.state.user_id = user.id
    request.state.user_role = user.role_name
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_optional_user(
    request: Request,
    db: DbSession,
    token: Annotated[str | None, Depends(oauth2_scheme)] = None,
) -> User | None:
    """Like `get_current_user` but returns None instead of raising."""
    if not token:
        return None
    try:
        return get_current_user(request, db, token)
    except AuthenticationError:
        return None


OptionalUser = Annotated[User | None, Depends(get_optional_user)]


# ------------------------------------------------------------------- guards
def require_roles(*roles: RoleName | str) -> Callable[..., User]:
    """Dependency factory enforcing membership of one of `roles`."""
    allowed = {str(r.value if isinstance(r, RoleName) else r).upper() for r in roles}

    def _guard(user: CurrentUser) -> User:
        if user.role_name.upper() not in allowed:
            raise PermissionDeniedError(
                "Your role does not have access to this resource.",
                details={"required_roles": sorted(allowed), "your_role": user.role_name},
            )
        return user

    return _guard


def require_permissions(*perms: Permission | str, require_all: bool = True) -> Callable[..., User]:
    """Dependency factory enforcing permission grants (backend-side RBAC)."""
    wanted = [p.value if isinstance(p, Permission) else str(p) for p in perms]

    def _guard(user: CurrentUser) -> User:
        checks = [role_has_permission(user.role_name, p) for p in wanted]
        ok = all(checks) if require_all else any(checks)
        if not ok:
            raise PermissionDeniedError(
                "You do not have permission to perform this action.",
                details={
                    "required_permissions": wanted,
                    "your_role": user.role_name,
                    "your_permissions": sorted(p.value for p in permissions_for(user.role_name)),
                },
            )
        return user

    return _guard


def require_admin() -> Callable[..., User]:
    return require_roles(RoleName.ADMIN)


def is_privileged(user: User) -> bool:
    """True for roles that may see the whole tenant, not just their own rows."""
    return user.role_name in {
        RoleName.ADMIN.value,
        RoleName.RETAIL_MANAGER.value,
        RoleName.WAREHOUSE_OPERATOR.value,
        RoleName.QUALITY_INSPECTOR.value,
    }


# --------------------------------------------------------------- pagination
class PaginationParams:
    """Standard `page` / `page_size` query parameters.

    Plain `Query(...)` defaults rather than `Annotated[...]` because this module
    uses postponed annotation evaluation (`from __future__ import annotations`),
    under which FastAPI cannot resolve `Annotated` metadata inside `__init__`.
    """

    def __init__(
        self,
        page: int = Query(1, ge=1, le=10_000, description="1-based page number"),
        page_size: int = Query(20, ge=1, le=200, description="Items per page"),
    ) -> None:
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


Pagination = Annotated[PaginationParams, Depends(PaginationParams)]
