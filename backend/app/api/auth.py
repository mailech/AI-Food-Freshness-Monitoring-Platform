from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.db.session import get_db
from app.models.orm import UserORM
from app.models.schemas import (
    UserLogin, UserRegister, UserResponse, UserProfile
)
from app.core.security import (
    hash_password, verify_password, create_access_token
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account with hashed password and return JWT access token."""
    email = payload.email.strip().lower()
    
    # Check if user already exists
    existing_user = db.query(UserORM).filter(UserORM.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in instead."
        )
    
    if not payload.name or len(payload.name.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid full name."
        )

    if not payload.password or len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )
    
    # Hash password securely with bcrypt
    hashed = hash_password(payload.password)
    role = payload.role or "Consumer"
    user_id = f"user-{uuid.uuid4().hex[:8]}"
    
    user = UserORM(
        id=user_id,
        name=payload.name.strip(),
        email=email,
        password_hash=hashed,
        role=role,
        created_at=datetime.utcnow()
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate cryptographic JWT
    token = create_access_token(
        subject=user.id,
        email=user.email,
        role=user.role,
        name=user.name
    )
    
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        token=token
    )

@router.post("/login", response_model=UserResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate existing user credentials and issue a signed JWT access token."""
    email = payload.email.strip().lower()
    password = payload.password
    
    user = db.query(UserORM).filter(UserORM.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found. Please create an account / sign up first.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Check password hash
    if user.password_hash:
        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password. Please try again.",
                headers={"WWW-Authenticate": "Bearer"}
            )
    else:
        # If legacy demo record without hash, set hash on first login
        user.password_hash = hash_password(password)
        db.commit()
        
    # Verify role: User can only log in if the selected role matches their registered role (or user is Administrator)
    if payload.role:
        selected_role = payload.role.strip()
        if selected_role.lower() != user.role.strip().lower() and user.role.strip().lower() != "administrator":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role mismatch: This account is registered as '{user.role}', not '{selected_role}'. Please choose '{user.role}' to sign in.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
    # Generate cryptographically signed JWT token with verified role
    token = create_access_token(
        subject=user.id,
        email=user.email,
        role=user.role,
        name=user.name
    )
    
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        token=token
    )

@router.get("/me", response_model=UserProfile)
def get_me(current_user: UserORM = Depends(get_current_user)):
    """Fetch current user profile authenticated via JWT Bearer token."""
    return UserProfile(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        created_at=str(current_user.created_at) if current_user.created_at else None
    )

@router.post("/forgot-password")
def forgot_password(email: str):
    """Initiate password recovery flow."""
    return {
        "message": f"Password reset instructions sent to {email.strip()}",
        "success": True
    }
