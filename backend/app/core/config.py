import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='allow')
    
    PROJECT_NAME: str = 'Food Freshness Monitoring Platform'
    VERSION: str = '1.0.0'
    API_V1_STR: str = '/api'
    
    # Security
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'food_freshness_super_secret_jwt_key_2026_secure_hash')
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv('DATABASE_URL', 'sqlite:///./food_freshness.db')
    
    # Paths
    BASE_DIR: Path = BASE_DIR
    UPLOAD_DIR: Path = BASE_DIR / 'uploads'
    EXPORT_DIR: Path = BASE_DIR / 'exports'
    ML_MODEL_DIR: Path = BASE_DIR.parent / 'ml' / 'models'
    
    # CORS
    CORS_ORIGINS: list = ['*']

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.EXPORT_DIR.mkdir(parents=True, exist_ok=True)
settings.ML_MODEL_DIR.mkdir(parents=True, exist_ok=True)
