from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Food Freshness Monitoring Platform"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql+psycopg2://ffp:ffp@localhost:5432/ffpdb"
    MONGO_URL: str = "mongodb://localhost:27017"
    MONGO_DB: str = "ffp"

    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    UPLOAD_DIR: str = "./uploads"
    MAX_IMAGE_SIZE_MB: int = 10

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URL: str = "http://localhost:8000/api/v1/auth/google/callback"
    FRONTEND_URL: str = "http://localhost:3000"

    EMAILS_ENABLED: bool = False
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@ffp.local"

    NOTIFICATION_SYNC_DISABLED: bool = False
    NOTIFICATION_SYNC_INTERVAL_MINUTES: int = 15

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
