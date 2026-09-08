"""Authentication and role-based access-control endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.authentication import AccessTokenResponse, RegistrationRequest, UserResponse
from app.services.authentication import authenticate_user, register_user

router = APIRouter(prefix="/authentication", tags=["authentication"])


@router.get("/health")
def authentication_health() -> dict[str, str]:
    """Return authentication module readiness without exposing security state."""
    return {"module": "authentication", "status": "ready"}


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    registration: RegistrationRequest,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Register a user and store only an Argon2 password hash."""
    try:
        return register_user(db, registration)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from None


@router.post("/login", response_model=AccessTokenResponse)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
) -> AccessTokenResponse:
    """Authenticate an email/password form submission and issue a Bearer JWT."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )
    return AccessTokenResponse(access_token=create_access_token(user.id), user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def read_current_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Return safe information for the authenticated user."""
    return current_user


@router.get("/admin-check", response_model=UserResponse)
def administrator_check(
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMINISTRATOR))],
) -> User:
    """Minimal RBAC verification endpoint for the authentication module."""
    return current_user
