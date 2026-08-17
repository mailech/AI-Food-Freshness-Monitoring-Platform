from typing import Optional, List, Dict
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )

    PROJECT_NAME: str = "FreshLens"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS Configuration
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # PostgreSQL
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres_password"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "freshlens_db"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres_password@localhost:5432/freshlens_db"

    # MongoDB
    MONGODB_USER: str = "mongo_admin"
    MONGODB_PASSWORD: str = "mongo_password"
    MONGODB_HOST: str = "localhost"
    MONGODB_PORT: int = 27017
    MONGODB_DB: str = "freshlens_mongo"
    MONGODB_URL: str = "mongodb://mongo_admin:mongo_password@localhost:27017/freshlens_mongo?authSource=admin"

    # AI Model Settings
    MODEL_PATH: str = "ml/models/freshness_model.pt"
    MODEL_CONFIDENCE_THRESHOLD: float = 0.60
    MODEL_DEVICE: str = "auto"
    MODEL_VERSION: str = "1.0.0"
    MODEL_NAME: str = "FreshNet-CNN"
    MAX_IMAGE_SIZE_BYTES: int = 5242880  # 5 MB

    # Freshness Scoring Configurable Weights
    FRESHNESS_VISUAL_WEIGHT: float = 0.40
    FRESHNESS_STORAGE_WEIGHT: float = 0.25
    FRESHNESS_SHELF_WEIGHT: float = 0.20
    FRESHNESS_AGE_WEIGHT: float = 0.15

    # Heuristic Shelf Life Estimation Constants
    FOOD_CATEGORY_CONSTANTS: Dict[str, Dict[str, float]] = {
        "Fruits": {
            "ideal_temp": 4.0,
            "ideal_humidity": 90.0,
            "base_shelf_life": 14.0,
            "temp_sensitivity": 1.08,
            "humidity_sensitivity": 1.02,
        },
        "Vegetables": {
            "ideal_temp": 4.0,
            "ideal_humidity": 95.0,
            "base_shelf_life": 10.0,
            "temp_sensitivity": 1.09,
            "humidity_sensitivity": 1.02,
        },
        "Dairy Products": {
            "ideal_temp": 3.0,
            "ideal_humidity": 50.0,
            "base_shelf_life": 7.0,
            "temp_sensitivity": 1.15,
            "humidity_sensitivity": 1.01,
        },
        "Meat & Poultry": {
            "ideal_temp": 0.0,
            "ideal_humidity": 85.0,
            "base_shelf_life": 5.0,
            "temp_sensitivity": 1.18,
            "humidity_sensitivity": 1.02,
        },
        "Seafood": {
            "ideal_temp": -1.0,
            "ideal_humidity": 90.0,
            "base_shelf_life": 3.0,
            "temp_sensitivity": 1.22,
            "humidity_sensitivity": 1.02,
        },
        "Bakery Products": {
            "ideal_temp": 20.0,
            "ideal_humidity": 40.0,
            "base_shelf_life": 5.0,
            "temp_sensitivity": 1.05,
            "humidity_sensitivity": 1.08,
        },
        "Packaged Foods": {
            "ideal_temp": 20.0,
            "ideal_humidity": 45.0,
            "base_shelf_life": 180.0,
            "temp_sensitivity": 1.02,
            "humidity_sensitivity": 1.01,
        },
        "Beverages": {
            "ideal_temp": 8.0,
            "ideal_humidity": 50.0,
            "base_shelf_life": 90.0,
            "temp_sensitivity": 1.03,
            "humidity_sensitivity": 1.00,
        },
    }

    PACKAGING_MODIFIERS: Dict[str, float] = {
        "Vacuum Sealed": 2.5,
        "Modified Atmosphere Packaging (MAP)": 2.0,
        "Plastic Wrap": 1.2,
        "Plastic Jug": 1.1,
        "Cartboard Box": 1.0,
        "None": 1.0,
    }

    @model_validator(mode="after")
    def validate_weights(self) -> 'Settings':
        total = (self.FRESHNESS_VISUAL_WEIGHT + 
                 self.FRESHNESS_STORAGE_WEIGHT + 
                 self.FRESHNESS_SHELF_WEIGHT + 
                 self.FRESHNESS_AGE_WEIGHT)
        if not abs(total - 1.0) < 1e-5:
            raise ValueError(f"Total freshness scoring weights must sum to exactly 1.0 (got {total})")
        return self

settings = Settings()
