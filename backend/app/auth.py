from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.models import User


# ============================================================
# JWT CONFIGURATION
# ============================================================

SECRET_KEY = "foodfresh-development-secret-key-change-later"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# ============================================================
# PASSWORD HASHING
# ============================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


# ============================================================
# ALLOWED ROLES
# ============================================================

ALLOWED_ROLES = {
    "admin",
    "consumer",
    "retail_manager",
    "warehouse_operator",
    "quality_inspector",
}


# ============================================================
# ROLE PERMISSIONS
# ============================================================

ROLE_PERMISSIONS = {
    "admin": {
        "dashboard",
        "food_analysis",
        "inventory",
        "batches",
        "storage",
        "alerts",
        "recommendations",
        "reports",
        "users",
    },

    "consumer": {
        "dashboard",
        "food_analysis",
        "recommendations",
    },

    "retail_manager": {
        "dashboard",
        "food_analysis",
        "inventory",
        "batches",
        "alerts",
        "recommendations",
        "reports",
    },

    "warehouse_operator": {
        "dashboard",
        "inventory",
        "batches",
        "storage",
        "alerts",
        "recommendations",
    },

    "quality_inspector": {
        "dashboard",
        "food_analysis",
        "storage",
        "alerts",
        "recommendations",
        "reports",
    },
}


# ============================================================
# USER FUNCTIONS - POSTGRESQL
# ============================================================

def find_user(email: str, db: Session):

    email = email.lower().strip()

    return (
        db.query(User)
        .filter(User.email == email)
        .first()
    )


def create_user(
    username: str,
    email: str,
    password: str,
    role: str,
    db: Session
):

    email = email.lower().strip()

    if role not in ALLOWED_ROLES:
        raise ValueError("Invalid role")

    existing_user = find_user(email, db)

    if existing_user:
        return None

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        role=role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# ============================================================
# PASSWORD FUNCTIONS
# ============================================================

def hash_password(password):

    return pwd_context.hash(password)


def verify_password(
    plain_password,
    hashed_password
):

    return pwd_context.verify(
        plain_password,
        hashed_password
    )


# ============================================================
# JWT TOKEN
# ============================================================

def create_access_token(data):

    to_encode = data.copy()

    expire = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    to_encode.update({
        "exp": expire
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# ============================================================
# VERIFY JWT
# ============================================================

def verify_token(token):

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        email = payload.get("sub")
        role = payload.get("role")

        if not email or not role:
            return None

        if role not in ALLOWED_ROLES:
            return None

        return {
            "email": email,
            "role": role
        }

    except JWTError:

        return None


# ============================================================
# PERMISSION CHECK
# ============================================================

def has_permission(
    role,
    permission
):

    if role not in ROLE_PERMISSIONS:
        return False

    return permission in ROLE_PERMISSIONS[role]