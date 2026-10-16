from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user, require_roles
from app.auth.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import Token, UserResponse, UserSignup

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserSignup, db: Session = Depends(get_db)):
    """Registers a new user and returns a JWT access token."""
    normalized_email = user_in.email.strip().lower()
    existing_user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered"
        )

    hashed_pwd = hash_password(user_in.password)
    user = User(
        full_name=user_in.full_name.strip(),
        email=normalized_email,
        hashed_password=hashed_pwd,
        role=UserRole(user_in.role),
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    from datetime import timedelta
    token = create_access_token(subject=user.id, role=user.role.value, expires_delta=timedelta(days=30))
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    db: Session = Depends(get_db)
):
    """Authenticates user with email/password (JSON or Form) and returns JWT access token."""
    email = None
    password = None
    remember_me = False

    content_type = request.headers.get("content-type", "")
    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        email = form.get("username") or form.get("email")
        password = form.get("password")
        rm_val = form.get("remember_me")
        if rm_val is not None:
            remember_me = str(rm_val).lower() in ("true", "1", "yes", "on")
    else:
        try:
            body = await request.json()
            email = body.get("email") or body.get("username")
            password = body.get("password")
            remember_me = bool(body.get("remember_me", False))
        except Exception:
            pass

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required"
        )

    normalized_email = str(email).strip().lower()
    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled"
        )

    from datetime import timedelta
    expires_delta = timedelta(days=30) if remember_me else timedelta(hours=2)

    token = create_access_token(subject=user.id, role=user.role.value, expires_delta=expires_delta)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns profile information for the currently authenticated user."""
    return current_user


@router.get("/admin-only", response_model=dict)
def admin_only_route(current_user: User = Depends(require_roles([UserRole.ADMIN]))):
    """Example endpoint restricted exclusively to users with admin role."""
    return {
        "message": f"Welcome Admin {current_user.full_name}!",
        "role": current_user.role.value
    }
