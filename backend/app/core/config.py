import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Fresh.OS API"
    VERSION: str = "1.0.0"
    
    DATABASE_URL: str
    SEED_SAMPLE_DATA: bool = False
    MONGO_URL: str = "mongodb://localhost:27017"
    
    JWT_SECRET_KEY: str = "fresh_os_super_secret_jwt_key_2026_safe_local_dev"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 43200  # 30 days persistent session
    
    ALLOWED_ORIGINS: Union[str, List[str]] = ["*"]
    MODEL_PATH: str = "models/food_freshness_cnn.keras"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v):
        if not v or not isinstance(v, str) or not v.strip():
            raise ValueError("DATABASE_URL is required and cannot be empty.")
        v = v.strip()
        # Automatically handle unencoded special characters like '@' in password
        if "://" in v and v.count("@") > 1:
            scheme, rest = v.split("://", 1)
            auth, endpoint = rest.rsplit("@", 1)
            if ":" in auth:
                user, pwd = auth.split(":", 1)
                from urllib.parse import quote_plus
                v = f"{scheme}://{user}:{quote_plus(pwd)}@{endpoint}"
        return v
    
    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            if v == "*":
                return ["*"]
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
