"""User profile endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.auth.permissions import permission_strings_for
from app.core.enums import AuditAction
from app.deps import CurrentUser, DbSession, RequestMeta
from app.models import UserProfile
from app.schemas.auth import UserMeOut, UserOut, UserUpdate
from app.services.audit import record_audit

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserMeOut, summary="Get my account and permissions")
def get_me(user: CurrentUser) -> UserMeOut:
    payload = UserMeOut.model_validate(user)
    payload.permissions = permission_strings_for(user.role_name)
    return payload


@router.put("/me", response_model=UserOut, summary="Update my account and profile")
def update_me(
    payload: UserUpdate, db: DbSession, user: CurrentUser, meta: RequestMeta
) -> UserOut:
    changed: list[str] = []

    if payload.full_name and payload.full_name != user.full_name:
        user.full_name = payload.full_name.strip()
        changed.append("full_name")
    if payload.username and payload.username != user.username:
        user.username = payload.username.strip()
        changed.append("username")

    if payload.profile is not None:
        if user.profile is None:
            user.profile = UserProfile(user_id=user.id)
            db.flush()
        for field, value in payload.profile.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(user.profile, field, value)
                changed.append(f"profile.{field}")

    record_audit(
        db,
        action=AuditAction.UPDATE,
        user=user,
        entity_type="user",
        entity_id=str(user.id),
        description="Updated own profile",
        metadata={"fields": changed},
        request_meta=meta,
    )
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.get(
    "/me/permissions",
    response_model=list[str],
    summary="Permissions granted to my role",
    description="Returned for UI convenience only - the backend always re-checks.",
)
def my_permissions(user: CurrentUser) -> list[str]:
    return permission_strings_for(user.role_name)
