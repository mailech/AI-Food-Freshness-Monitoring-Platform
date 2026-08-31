from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from urllib.parse import urlencode

import app.core.oauth_google as oauth_google
from app.core.config import get_settings
from app.core.rate_limit import RateLimiter, client_ip
from app.core.security import (
    _create_token,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db import get_db
from app.models import User, UserRole
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])

settings = get_settings()

bearer_scheme = HTTPBearer(auto_error=False)

auth_limiter = RateLimiter(max_requests=10, window_seconds=60)


def _tokens_for(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id, user.token_version),
        refresh_token=create_refresh_token(user.id, user.token_version),
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    if int(payload.get("ver", -1)) != user.token_version:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session revoked; please sign in again")
    return user


def require_roles(*roles: UserRole):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return user

    return checker


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    auth_limiter.check(client_ip(request))
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    valid_roles = {r.value for r in UserRole}
    if body.role not in valid_roles:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Role must be one of: {', '.join(sorted(valid_roles))}")
    user = User(
        email=body.email.lower(),
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=UserRole(body.role),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    auth_limiter.check(client_ip(request))
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")
    return _tokens_for(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Revoke all tokens issued so far for this user (token_version bump)."""
    user.token_version += 1
    db.commit()


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    user = db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    if int(payload.get("ver", -1)) != user.token_version:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session revoked; please sign in again")
    return _tokens_for(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


# ---- Google OAuth2 ----

@router.get("/google/login", tags=["auth"])
def google_login():
    if not oauth_google.is_configured():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )
    state = _create_token("oauth-state", "state", timedelta(minutes=10))
    return RedirectResponse(oauth_google.build_authorize_url(state))


@router.get("/google/callback", tags=["auth"])
async def google_callback(code: str, state: str, db: Session = Depends(get_db)):
    payload = decode_token(state)
    if payload is None or payload.get("type") != "state":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid OAuth state")
    try:
        info = await oauth_google.exchange_code(code)
    except oauth_google.GoogleOAuthError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))

    email = (info.get("email") or "").lower()
    if not email:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Google account has no email")

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(
            email=email,
            full_name=info.get("name") or email,
            hashed_password="",
            oauth_provider="google",
            role=UserRole.CONSUMER,
        )
        db.add(user)
    elif user.oauth_provider is None:
        user.oauth_provider = "google"
    db.commit()
    db.refresh(user)

    tokens = _tokens_for(user)
    fragment = urlencode(
        {
            "access_token": tokens.access_token,
            "refresh_token": tokens.refresh_token,
        }
    )
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback#{fragment}")
