from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from database.connection import SessionLocal
from models.user import User
from security import create_access_token, get_current_user

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


# Database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Data received from Register page
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
class LoginRequest(BaseModel):
    email: str
    password: str
class UpdateProfileRequest(BaseModel):
    name: str
    email: str


@router.post("/register")
def register_user(
    user_data: RegisterRequest,
    db: Session = Depends(get_db)
):

    # Check whether email already exists
    existing_user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Hash password
    hashed_password = pwd_context.hash(
        user_data.password
    )

    # Create new user
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id
    }

@router.post("/login")
def login_user(
    user_data: LoginRequest,
    db: Session = Depends(get_db)
):


    # Find user by email
    user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    # Check whether user exists
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Verify password
    if not pwd_context.verify(
        user_data.password,
        user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token(
    data={"sub": str(user.id)}
)

    return {
    "message": "Login successful",
    "access_token": access_token,
    "token_type": "bearer",
    "user_id": user.id,
    "name": user.name
}
@router.get("/profile")
def get_profile(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == int(user_id)
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email
    }



@router.put("/profile")
def update_profile(
    profile_data: UpdateProfileRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == int(user_id)
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    existing_user = db.query(User).filter(
        User.email == profile_data.email,
        User.id != int(user_id)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered by another user"
        )

    user.name = profile_data.name
    user.email = profile_data.email

    db.commit()
    db.refresh(user)

    return {
        "message": "Profile updated successfully",
        "id": user.id,
        "name": user.name,
        "email": user.email
    }