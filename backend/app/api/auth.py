from fastapi import APIRouter, HTTPException, status
from app.models.schemas import UserLogin, UserRegister, UserResponse
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=UserResponse)
def login(payload: UserLogin):
    # Polished demo login accepting demo credentials and any valid format
    email = payload.email.strip()
    role = payload.role or "Food Quality Inspector"
    
    # Simple role mapping based on email or specified role
    name = email.split("@")[0].replace(".", " ").title() if "@" in email else "Demo User"
    if not name:
        name = "Quality Inspector"

    return UserResponse(
        id=f"user-{uuid.uuid4().hex[:6]}",
        name=name,
        email=email,
        role=role,
        token=f"demo-jwt-token-{uuid.uuid4().hex}"
    )

@router.post("/register", response_model=UserResponse)
def register(payload: UserRegister):
    return UserResponse(
        id=f"user-{uuid.uuid4().hex[:6]}",
        name=payload.name,
        email=payload.email,
        role=payload.role,
        token=f"demo-jwt-token-{uuid.uuid4().hex}"
    )

@router.post("/forgot-password")
def forgot_password(email: str):
    return {"message": f"Password reset instructions sent to {email}", "success": True}
