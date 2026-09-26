from datetime import datetime, timedelta, timezone
import os

import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from database import SessionLocal
from models.user import User


SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "CHANGE_THIS_DEMO_SECRET_KEY_BEFORE_PRODUCTION"
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# Only these four roles are supported by the platform.
ALLOWED_ROLES = {
    "consumer",
    "retail_manager",
    "warehouse_operator",
    "food_quality_inspector",
}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8")
        )
    except (ValueError, TypeError):
        return False


def create_access_token(user: User) -> str:
    if user.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This user role is no longer supported."
        )

    expires = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "exp": expires,
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_exception

        user_id = int(user_id)

    except (JWTError, ValueError, TypeError):
        raise credentials_exception

    db = SessionLocal()

    try:
        user = db.query(User).filter(User.id == user_id).first()

        if user is None or not user.is_active:
            raise credentials_exception

        # Block old Administrator accounts/tokens.
        if user.role not in ALLOWED_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This user role is not supported."
            )

        return user

    finally:
        db.close()


def require_role(*allowed_roles: str):
    # Prevent accidentally creating an endpoint with an unsupported role.
    invalid_roles = set(allowed_roles) - ALLOWED_ROLES

    if invalid_roles:
        raise ValueError(
            f"Unsupported role(s): {', '.join(sorted(invalid_roles))}"
        )

    def role_checker(
        current_user: User = Depends(get_current_user)
    ):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource."
            )

        return current_user

    return role_checker