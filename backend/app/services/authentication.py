"""Database operations for authentication."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.authentication import RegistrationRequest


def get_user_by_email(db: Session, email: str) -> User | None:
    """Find a user by normalized email address."""
    return db.scalar(select(User).where(User.email == email))


def register_user(db: Session, registration: RegistrationRequest) -> User:
    """Create a user after hashing their password."""
    user = User(
        name=registration.name,
        email=str(registration.email).casefold(),
        password_hash=hash_password(registration.password),
        role=registration.role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Return the user only when the submitted credentials are valid."""
    user = get_user_by_email(db, email.strip().casefold())
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user
