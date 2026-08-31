from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

CREDENTIALS_ERROR = "Could not validate credentials"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(subject: str, token_type: str, expires_delta: timedelta, version: int = 0) -> str:
    payload = {
        "sub": subject,
        "type": token_type,
        "ver": version,
        "exp": datetime.now(timezone.utc) + expires_delta,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: int | str, token_version: int = 0) -> str:
    return _create_token(
        str(user_id), "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES), token_version
    )


def create_refresh_token(user_id: int | str, token_version: int = 0) -> str:
    return _create_token(
        str(user_id), "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS), token_version
    )


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
