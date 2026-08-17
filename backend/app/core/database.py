from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.modules.system.models import SystemLog
from app.modules.image_analysis.models import ImageAnalysis
from app.modules.storage.models import StorageReading
from app.modules.notification.models import Notification, NotificationPreference

# PostgreSQL Connection Engine & Session Factory
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Declarative base for SQLAlchemy models
class Base(DeclarativeBase):
    pass

# DB initialization function for FastAPI lifecycle
async def init_databases() -> None:
    # 1. Initialize MongoDB Beanie ODM
    mongo_client: AsyncIOMotorClient = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=mongo_client[settings.MONGODB_DB],
        document_models=[SystemLog, ImageAnalysis, StorageReading, Notification, NotificationPreference]
    )

# Dependency to yield PostgreSQL sessions
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
