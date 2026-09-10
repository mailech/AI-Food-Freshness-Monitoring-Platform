import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = "http://localhost:8000/auth/google/callback"

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext

from database.connection import SessionLocal
from models.user import User
from security import create_access_token, get_current_user


oauth = OAuth()

oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile"
    }
)


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


# =========================
# GOOGLE LOGIN
# =========================

@router.get("/google/login")
async def google_login(request: Request):
    return await oauth.google.authorize_redirect(
        request,
        GOOGLE_REDIRECT_URI
    )


@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    token = await oauth.google.authorize_access_token(request)

    userinfo = token.get("userinfo")

    if not userinfo:
        userinfo = await oauth.google.userinfo(token=token)

    email = userinfo["email"]
    name = userinfo.get("name", email.split("@")[0])

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user:
        user = User(
            name=name,
            email=email,
            password=None
        )

        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(
        data={"sub": str(user.id)}
    )

    return RedirectResponse(
        url=f"http://localhost:5175/oauth-success?token={access_token}"
    )


# =========================
# REQUEST MODELS
# =========================

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


# =========================
# REGISTER
# =========================

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
    password=hashed_password,
    role="Consumer"
)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id
    }


# =========================
# LOGIN
# =========================

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

    # Google-created users do not have a password
    if user.password is None:
        raise HTTPException(
            status_code=401,
            detail="This account uses Google login"
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
    data={
        "sub": str(user.id),
        "role": user.role
    }
)
    return {
    "message": "Login successful",
    "access_token": access_token,
    "token_type": "bearer",
    "user_id": user.id,
    "name": user.name,
    "role": user.role
}

# =========================
# GET PROFILE
# =========================

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


# =========================
# UPDATE PROFILE
# =========================

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