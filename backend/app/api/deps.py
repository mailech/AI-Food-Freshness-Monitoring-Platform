from typing import Optional, List, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.orm import UserORM
from app.core.security import decode_access_token

security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> UserORM:
    """Validate Bearer JWT token and return the current UserORM."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not credentials or not credentials.credentials:
        raise credentials_exception
    
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise credentials_exception
    
    user_id: Optional[str] = payload.get("sub")
    email: Optional[str] = payload.get("email")
    if user_id is None and email is None:
        raise credentials_exception
    
    # Query database for user
    user = None
    if user_id:
        user = db.query(UserORM).filter(UserORM.id == user_id).first()
    if not user and email:
        user = db.query(UserORM).filter(UserORM.email == email).first()
        
    if user is None:
        # If user does not exist in DB (e.g. token valid from demo payload), instantiate a transient UserORM
        role = payload.get("role", "Food Quality Inspector")
        name = payload.get("name", email.split("@")[0].title() if email else "User")
        user = UserORM(
            id=user_id or "user-transient",
            name=name,
            email=email or "user@freshness.io",
            role=role
        )
    
    return user

def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[UserORM]:
    """Extract current user if valid token present, otherwise None."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return get_current_user(credentials=credentials, db=db)
    except HTTPException:
        return None

def require_roles(allowed_roles: List[str]) -> Callable:
    """Dependency factory that checks whether current user has one of allowed roles."""
    def role_checker(current_user: UserORM = Depends(get_current_user)) -> UserORM:
        if current_user.role not in allowed_roles and "Administrator" not in [current_user.role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role in {allowed_roles}, your role is '{current_user.role}'"
            )
        return current_user
    return role_checker
