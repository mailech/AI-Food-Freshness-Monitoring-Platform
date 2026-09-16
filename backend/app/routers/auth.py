"""Authentication endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.auth import service as auth_service
from app.auth.permissions import permission_strings_for
from app.config import settings
from app.core.enums import AuditAction
from app.deps import CurrentUser, DbSession, RequestMeta
from app.schemas.auth import (
    AuthResponse,
    ChangePasswordRequest,
    GoogleLoginRequest,
    LoginRequest,
    LogoutRequest,
    OAuthConfigOut,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserMeOut,
)
from app.schemas.common import Message
from app.services.audit import record_audit

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _user_payload(user) -> UserMeOut:
    data = UserMeOut.model_validate(user)
    data.permissions = permission_strings_for(user.role_name)
    return data


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new account",
    description=(
        "Creates a user with one of the self-service roles (CONSUMER, "
        "RETAIL_MANAGER, WAREHOUSE_OPERATOR, QUALITY_INSPECTOR) and returns a "
        "ready-to-use token pair. ADMIN accounts can only be created by an "
        "existing administrator via `POST /admin/users`."
    ),
)
def register(payload: RegisterRequest, db: DbSession, meta: RequestMeta) -> AuthResponse:
    user = auth_service.register_user(
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
        request_meta=meta,
    )
    tokens = auth_service.issue_tokens(db, user, meta)
    db.commit()
    db.refresh(user)
    return AuthResponse(user=_user_payload(user), tokens=TokenPair(**tokens))


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Log in with email/username and password",
)
def login(payload: LoginRequest, db: DbSession, meta: RequestMeta) -> AuthResponse:
    user = auth_service.authenticate(db, payload.username, payload.password, meta)
    tokens = auth_service.issue_tokens(db, user, meta)
    record_audit(
        db,
        action=AuditAction.LOGIN,
        user=user,
        entity_type="user",
        entity_id=str(user.id),
        description="Successful login",
        request_meta=meta,
    )
    db.commit()
    db.refresh(user)
    return AuthResponse(user=_user_payload(user), tokens=TokenPair(**tokens))


@router.post(
    "/google",
    response_model=AuthResponse,
    summary="Sign in with Google (Consumer)",
    description=(
        "Verifies a Google Identity Services ID token, then gets-or-creates the "
        "linked CONSUMER account and returns a standard token pair. New accounts "
        "created this way are assigned the CONSUMER role."
    ),
)
def google_login(payload: GoogleLoginRequest, db: DbSession, meta: RequestMeta) -> AuthResponse:
    user = auth_service.login_with_google(db, payload.credential, meta)
    tokens = auth_service.issue_tokens(db, user, meta)
    record_audit(
        db,
        action=AuditAction.LOGIN,
        user=user,
        entity_type="user",
        entity_id=str(user.id),
        description="Successful login (Google OAuth)",
        request_meta=meta,
    )
    db.commit()
    db.refresh(user)
    return AuthResponse(user=_user_payload(user), tokens=TokenPair(**tokens))


@router.post(
    "/token",
    response_model=TokenPair,
    summary="OAuth2 password-flow token endpoint",
    description="Form-encoded endpoint used by the Swagger 'Authorize' button.",
)
def login_oauth2_form(
    db: DbSession,
    meta: RequestMeta,
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> TokenPair:
    user = auth_service.authenticate(db, form.username, form.password, meta)
    tokens = auth_service.issue_tokens(db, user, meta)
    record_audit(
        db,
        action=AuditAction.LOGIN,
        user=user,
        entity_type="user",
        entity_id=str(user.id),
        description="Successful login (OAuth2 password flow)",
        request_meta=meta,
    )
    db.commit()
    return TokenPair(**tokens)


@router.post("/refresh", response_model=TokenPair, summary="Rotate an expired access token")
def refresh(payload: RefreshRequest, db: DbSession, meta: RequestMeta) -> TokenPair:
    tokens = auth_service.refresh_access_token(db, payload.refresh_token, meta)
    db.commit()
    return TokenPair(**tokens)


@router.post("/logout", response_model=Message, summary="Revoke refresh token(s)")
def logout(
    payload: LogoutRequest, db: DbSession, user: CurrentUser, meta: RequestMeta
) -> Message:
    revoked = auth_service.revoke_refresh_token(db, payload.refresh_token, user)
    record_audit(
        db,
        action=AuditAction.LOGOUT,
        user=user,
        entity_type="user",
        entity_id=str(user.id),
        description=f"Logged out ({revoked} session(s) revoked)",
        request_meta=meta,
    )
    db.commit()
    return Message(message=f"Logged out. {revoked} session(s) revoked.")


@router.get("/me", response_model=UserMeOut, summary="Current authenticated user")
def me(user: CurrentUser) -> UserMeOut:
    return _user_payload(user)


@router.post("/change-password", response_model=Message, summary="Change your password")
def change_password(
    payload: ChangePasswordRequest, db: DbSession, user: CurrentUser, meta: RequestMeta
) -> Message:
    auth_service.change_password(db, user, payload.current_password, payload.new_password)
    record_audit(
        db,
        action=AuditAction.UPDATE,
        user=user,
        entity_type="user",
        entity_id=str(user.id),
        description="Password changed; all sessions revoked",
        request_meta=meta,
    )
    db.commit()
    return Message(message="Password updated. Please sign in again.")


@router.get(
    "/oauth/config",
    response_model=OAuthConfigOut,
    summary="OAuth2 availability for this deployment",
)
def oauth_config() -> OAuthConfigOut:
    providers: list[str] = []
    if settings.OAUTH_ENABLED and settings.OAUTH_GOOGLE_CLIENT_ID:
        providers.append("google")
    return OAuthConfigOut(
        enabled=settings.OAUTH_ENABLED and bool(providers),
        providers=providers,
        redirect_url=settings.OAUTH_REDIRECT_URL if settings.OAUTH_ENABLED else None,
        note=(
            "OAuth2 is wired as optional architecture. Local JWT authentication is "
            "fully functional without any external provider credentials."
        ),
    )
