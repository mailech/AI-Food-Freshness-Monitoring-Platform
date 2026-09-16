from datetime import datetime, timedelta, timezone
from pathlib import Path
import json

from jose import JWTError, jwt
from passlib.context import CryptContext


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
# USERS FILE
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
USERS_FILE = BASE_DIR / "users.json"


if not USERS_FILE.exists():
    with open(USERS_FILE, "w") as file:
        json.dump([], file, indent=4)


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
# USER FUNCTIONS
# ============================================================

def load_users():
    try:
        with open(USERS_FILE, "r") as file:
            return json.load(file)

    except Exception:
        return []


def save_users(users):
    with open(USERS_FILE, "w") as file:
        json.dump(
            users,
            file,
            indent=4
        )


def find_user(email):
    users = load_users()

    email = email.lower().strip()

    for user in users:
        if user["email"] == email:
            return user

    return None


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