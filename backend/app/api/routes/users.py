from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.entities import User, AuditLog
from app.schemas.all_schemas import UserOut, UserUpdate
from app.api.dependencies import get_current_user, require_role

router = APIRouter(prefix="/users", tags=["User Management"])

@router.get("/", response_model=List[UserOut])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(["administrator"]))
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=UserOut)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(["administrator"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(["administrator"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    if user_update.department is not None:
        user.department = user_update.department
        
    db.commit()
    db.refresh(user)
    
    # Audit log
    audit = AuditLog(
        user_id=admin.id,
        user_email=admin.email,
        action="USER_UPDATED",
        entity_type="User",
        entity_id=user.id,
        details=f"Admin modified user {user.email} (Role: {user.role}, Active: {user.is_active})"
    )
    db.add(audit)
    db.commit()
    return user
