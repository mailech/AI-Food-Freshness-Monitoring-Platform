"""Administrator endpoints: user management, audit log, system settings."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, or_, select

from app.auth import service as auth_service
from app.auth.permissions import ROLE_DESCRIPTIONS, permission_strings_for
from app.config import settings
from app.core.enums import AuditAction, Permission, RoleName
from app.core.errors import BusinessRuleError, NotFoundError
from app.deps import CurrentUser, DbSession, Pagination, RequestMeta, require_permissions
from app.ml.registry import get_registry, reset_registry
from app.models import Role, User, UserProfile
from app.schemas.analysis import AuditLogOut
from app.schemas.auth import (
    AdminSetPasswordRequest,
    AdminUserCreate,
    AdminUserUpdate,
    RoleOut,
    UserOut,
)
from app.schemas.common import Message, Page
from app.services.audit import list_audit_logs, record_audit

router = APIRouter(prefix="/admin", tags=["Administration"])

AdminUser = Annotated[Any, Depends(require_permissions(Permission.USER_MANAGE))]
SystemAdmin = Annotated[Any, Depends(require_permissions(Permission.SYSTEM_MANAGE))]


# -------------------------------------------------------------------- roles
@router.get("/roles", response_model=list[dict], summary="Roles and their permissions")
def list_roles(db: DbSession, user: AdminUser) -> list[dict]:
    auth_service.ensure_roles(db)
    db.commit()
    roles = db.scalars(select(Role).order_by(Role.name)).all()
    counts = dict(
        db.execute(select(User.role_id, func.count(User.id)).group_by(User.role_id)).all()
    )
    return [
        {
            **RoleOut.model_validate(role).model_dump(),
            "user_count": int(counts.get(role.id, 0)),
            "permissions": permission_strings_for(role.name),
        }
        for role in roles
    ]


# -------------------------------------------------------------------- users
@router.get("/users", response_model=Page[UserOut], summary="List users")
def list_users(
    db: DbSession,
    user: AdminUser,
    pagination: Pagination,
    q: str | None = Query(default=None, description="Search email, username or name"),
    role: str | None = None,
    is_active: bool | None = None,
    sort_by: str = Query(default="created_at"),
    sort_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
) -> Page[UserOut]:
    stmt = select(User)
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                User.email.ilike(pattern),
                User.username.ilike(pattern),
                User.full_name.ilike(pattern),
            )
        )
    if role:
        stmt = stmt.join(Role).where(Role.name == role.upper())
    if is_active is not None:
        stmt = stmt.where(User.is_active.is_(is_active))

    total = int(db.scalar(select(func.count()).select_from(stmt.subquery())) or 0)
    sortable = {"created_at", "email", "username", "full_name", "last_login_at", "id"}
    column = getattr(User, sort_by if sort_by in sortable else "created_at")
    ordering = column.asc() if sort_dir == "asc" else column.desc()
    rows = db.scalars(
        stmt.order_by(ordering, User.id.desc())
        .limit(pagination.page_size)
        .offset(pagination.offset)
    ).unique().all()

    return Page.build(
        [UserOut.model_validate(u) for u in rows],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.post(
    "/users",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user (any role, including ADMIN)",
)
def create_user(
    payload: AdminUserCreate, db: DbSession, meta: RequestMeta, user: AdminUser
) -> UserOut:
    created = auth_service.register_user(
        db,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        username=payload.username,
        role_name=payload.role.value,
        profile={
            "phone": payload.phone,
            "organisation": payload.organisation,
            "default_storage_location": payload.default_storage_location,
        },
        allow_privileged=True,
        request_meta=meta,
    )
    created.is_active = payload.is_active
    created.is_verified = payload.is_verified
    record_audit(
        db,
        action=AuditAction.ADMIN_CHANGE,
        user=user,
        entity_type="user",
        entity_id=str(created.id),
        description=f"Admin created user {created.email} with role {payload.role.value}",
        request_meta=meta,
    )
    db.commit()
    db.refresh(created)
    return UserOut.model_validate(created)


@router.get("/users/{user_id}", response_model=UserOut, summary="Get a user")
def get_user(user_id: int, db: DbSession, user: AdminUser) -> UserOut:
    return UserOut.model_validate(auth_service.get_user(db, user_id))


@router.put("/users/{user_id}", response_model=UserOut, summary="Update a user")
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: DbSession,
    meta: RequestMeta,
    user: AdminUser,
) -> UserOut:
    target = auth_service.get_user(db, user_id)
    changed: list[str] = []

    if payload.full_name:
        target.full_name = payload.full_name.strip()
        changed.append("full_name")
    if payload.username:
        target.username = payload.username.strip()
        changed.append("username")
    if payload.role is not None:
        # Never allow the last admin to be demoted - it would lock everyone out.
        if (
            target.role_name == RoleName.ADMIN.value
            and payload.role != RoleName.ADMIN
            and _admin_count(db) <= 1
        ):
            raise BusinessRuleError(
                "Cannot change the role of the only remaining administrator.",
                code="LAST_ADMIN",
            )
        target.role_id = auth_service.get_role(db, payload.role.value).id
        target.is_superuser = payload.role == RoleName.ADMIN
        changed.append("role")
    if payload.is_active is not None:
        if not payload.is_active and target.role_name == RoleName.ADMIN.value and _admin_count(db) <= 1:
            raise BusinessRuleError(
                "Cannot deactivate the only remaining administrator.", code="LAST_ADMIN"
            )
        target.is_active = payload.is_active
        changed.append("is_active")
    if payload.is_verified is not None:
        target.is_verified = payload.is_verified
        changed.append("is_verified")

    if payload.profile is not None:
        if target.profile is None:
            target.profile = UserProfile(user_id=target.id)
            db.flush()
        for field, value in payload.profile.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(target.profile, field, value)
                changed.append(f"profile.{field}")

    record_audit(
        db,
        action=AuditAction.ADMIN_CHANGE,
        user=user,
        entity_type="user",
        entity_id=str(target.id),
        description=f"Admin updated user {target.email}",
        metadata={"fields": changed},
        request_meta=meta,
    )
    db.commit()
    db.refresh(target)
    return UserOut.model_validate(target)


@router.post(
    "/users/{user_id}/password",
    response_model=Message,
    summary="Reset a user's password",
)
def reset_password(
    user_id: int,
    payload: AdminSetPasswordRequest,
    db: DbSession,
    meta: RequestMeta,
    user: AdminUser,
) -> Message:
    target = auth_service.get_user(db, user_id)
    auth_service.set_password(db, target, payload.new_password)
    record_audit(
        db,
        action=AuditAction.ADMIN_CHANGE,
        user=user,
        entity_type="user",
        entity_id=str(target.id),
        description=f"Admin reset the password for {target.email}; sessions revoked",
        request_meta=meta,
    )
    db.commit()
    return Message(message=f"Password reset for {target.email}. All sessions revoked.")


@router.delete("/users/{user_id}", response_model=Message, summary="Deactivate a user")
def deactivate_user(
    user_id: int,
    db: DbSession,
    meta: RequestMeta,
    user: AdminUser,
    hard: bool = Query(default=False, description="Permanently delete instead of deactivating"),
) -> Message:
    target = auth_service.get_user(db, user_id)
    if target.id == user.id:
        raise BusinessRuleError("You cannot delete your own account.", code="SELF_DELETE")
    if target.role_name == RoleName.ADMIN.value and _admin_count(db) <= 1:
        raise BusinessRuleError(
            "Cannot remove the only remaining administrator.", code="LAST_ADMIN"
        )

    email = target.email
    record_audit(
        db,
        action=AuditAction.ADMIN_CHANGE,
        user=user,
        entity_type="user",
        entity_id=str(target.id),
        description=("Deleted" if hard else "Deactivated") + f" user {email}",
        request_meta=meta,
    )
    if hard:
        db.delete(target)
    else:
        target.is_active = False
        auth_service.revoke_refresh_token(db, None, target)
    db.commit()
    return Message(message=f"User {email} {'deleted' if hard else 'deactivated'}.")


def _admin_count(db) -> int:
    return int(
        db.scalar(
            select(func.count(User.id))
            .join(Role)
            .where(Role.name == RoleName.ADMIN.value, User.is_active.is_(True))
        )
        or 0
    )


# ---------------------------------------------------------------- audit log
@router.get(
    "/audit-logs",
    response_model=Page[AuditLogOut],
    summary="Audit trail",
    description="Append-only record of logins, data changes, analyses, report "
    "generation and administrative actions.",
)
def audit_logs(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.AUDIT_READ))],
    pagination: Pagination,
    user_id: int | None = None,
    action: str | None = None,
    entity_type: str | None = None,
) -> Page[AuditLogOut]:
    rows, total = list_audit_logs(
        db,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        limit=pagination.page_size,
        offset=pagination.offset,
    )
    return Page.build(
        [AuditLogOut.model_validate(row) for row in rows],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/audit-logs/actions", response_model=list[str], summary="Audit action types")
def audit_actions(user: Annotated[Any, Depends(require_permissions(Permission.AUDIT_READ))]) -> list[str]:
    return [a.value for a in AuditAction]


# ------------------------------------------------------------------ system
@router.get(
    "/system/settings",
    response_model=dict,
    summary="Effective system settings",
    description="Non-secret configuration. Secrets are never returned.",
)
def system_settings(user: SystemAdmin) -> dict:
    return {
        "app": {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "debug": settings.DEBUG,
            "api_prefix": settings.API_V1_PREFIX,
        },
        "ml": {
            "demo_mode": settings.DEMO_MODE,
            "model_path": settings.MODEL_PATH,
            "image_analysis_size": settings.IMAGE_ANALYSIS_SIZE,
            "registry": get_registry().describe(),
        },
        "scoring": {
            "weights": settings.score_weights,
            "thresholds": settings.score_thresholds,
        },
        "alerting": {
            "expiry_warning_days": settings.EXPIRY_WARNING_DAYS,
            "shelf_life_warning_days": settings.SHELF_LIFE_WARNING_DAYS,
            "temp_tolerance_c": settings.STORAGE_TEMP_TOLERANCE_C,
            "humidity_tolerance_pct": settings.STORAGE_HUMIDITY_TOLERANCE_PCT,
        },
        "uploads": {
            "storage_backend": settings.STORAGE_BACKEND,
            "max_upload_mb": settings.MAX_UPLOAD_SIZE_MB,
            "allowed_extensions": settings.ALLOWED_IMAGE_EXTENSIONS,
        },
        "sensors": {"provider": settings.SENSOR_PROVIDER},
        "integrations": {
            "oauth_enabled": settings.OAUTH_ENABLED,
            "email_enabled": settings.EMAIL_ENABLED,
            "rate_limit_enabled": settings.RATE_LIMIT_ENABLED,
        },
        "database": {
            "dialect": "sqlite" if settings.is_sqlite else "postgresql",
        },
        "note": (
            "Settings are environment-driven. Change them via environment variables or "
            "the .env file and restart the service. Secrets are never exposed here."
        ),
    }


@router.post(
    "/system/reload-models",
    response_model=dict,
    summary="Reload ML artefacts",
    description="Re-scans MODEL_PATH so a newly trained artefact can be picked up "
    "without restarting the service.",
)
def reload_models(user: SystemAdmin) -> dict:
    reset_registry()
    registry = get_registry()
    return {
        "message": "Model registry reloaded.",
        "status": registry.describe(),
    }


@router.get(
    "/system/health",
    response_model=dict,
    summary="Detailed system health (admin)",
)
def detailed_health(db: DbSession, user: SystemAdmin) -> dict:
    import platform
    import sys

    from app.analytics.service import platform_stats
    from app.database import check_database
    from app.recommendations.engine import registered_rule_count
    from app.services.storage_backend import storage_info
    from app.storage.sensors import get_sensor_provider

    db_ok, db_detail = check_database()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": {"connected": db_ok, "detail": db_detail},
        "runtime": {
            "python": sys.version.split()[0],
            "platform": f"{platform.system()} {platform.release()}",
        },
        "storage": storage_info(),
        "sensors": get_sensor_provider().describe(),
        "recommendation_rules": registered_rule_count(),
        "ml": get_registry().describe(),
        "statistics": platform_stats(db),
    }


@router.get(
    "/system/errors",
    response_model=list[dict],
    summary="Recent failed operations",
    description="Derived from the audit trail (entries with success=false).",
)
def recent_errors(
    db: DbSession,
    user: SystemAdmin,
    limit: int = Query(default=25, ge=1, le=200),
) -> list[dict]:
    from app.models import AuditLog

    rows = db.scalars(
        select(AuditLog)
        .where(AuditLog.success.is_(False))
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    ).all()
    return [
        {
            "id": row.id,
            "action": row.action,
            "description": row.description,
            "actor_email": row.actor_email,
            "path": row.path,
            "status_code": row.status_code,
            "ip_address": row.ip_address,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.get(
    "/system/role-matrix",
    response_model=dict,
    summary="Role / permission matrix",
    description="The authoritative backend grant table. The frontend mirrors it for UI "
    "convenience only.",
)
def role_matrix(user: CurrentUser) -> dict:
    return {
        "roles": [
            {
                "name": role.value,
                "display_name": ROLE_DESCRIPTIONS.get(role.value, (role.value, ""))[0],
                "description": ROLE_DESCRIPTIONS.get(role.value, ("", ""))[1],
                "permissions": permission_strings_for(role.value),
            }
            for role in RoleName
        ],
        "note": (
            "All sensitive authorisation is enforced server-side by the "
            "require_permissions dependency; this endpoint is informational."
        ),
    }
