from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from ..database import get_db
from ..models.sql_models import User
from ..schemas.pydantic_schemas import UserCreate, UserResponse, UserLogin, Token
from ..utils.security import verify_password, get_password_hash, create_access_token, get_current_user
from ..mongodb import get_mongo_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
        
    # Create user
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hashed_pwd,
        role=user_in.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Audit log in MongoDB
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        try:
            mongo_db.activity_logs.insert_one({
                "user_id": str(user.id),
                "action": "USER_REGISTERED",
                "details": f"User {user.name} ({user.email}) registered with role {user.role}.",
                "timestamp": datetime.utcnow() if hasattr(datetime, 'utcnow') else datetime.now()
            })
        except Exception as e:
            logger.error(f"Failed to write Mongo activity log: {e}")
            
    return user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
        
    # Create token
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}
    )
    
    # Mongo Log login
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        try:
            from datetime import datetime
            mongo_db.activity_logs.insert_one({
                "user_id": str(user.id),
                "action": "USER_LOGIN",
                "details": f"User logged in successfully.",
                "timestamp": datetime.utcnow()
            })
        except Exception as e:
            logger.error(f"Failed to log login event: {e}")
            
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name
    }

@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email does not exist."
        )
    # Simulated recovery link triggers:
    # In a full production system, you would send an email with reset token.
    return {"message": "Password reset token sent to your email (simulated)."}

@router.post("/reset-password")
def reset_password(email: str, token: str, new_password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
    # Validate simulated token
    if token != "reset-token-123":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )
    user.password_hash = get_password_hash(new_password)
    db.commit()
    return {"message": "Password has been reset successfully."}
