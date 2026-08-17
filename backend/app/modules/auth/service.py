from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.modules.user.models import User
from app.modules.user.service import get_user_by_email

async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> Optional[User]:
    user = await get_user_by_email(db, email=email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
