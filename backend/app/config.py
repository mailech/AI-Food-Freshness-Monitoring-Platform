"""Application configuration.

All settings are read from environment variables (optionally via a `.env`
file) so that no secret is ever hard-coded. See `.env.example`.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Any, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# backend/  (…/backend/app/config.py -> parents[1] == …/backend)
BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    """Typed application settings."""

    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR / ".env", PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------ app
    APP_NAME: str = "AI Food Freshness Monitoring Platform"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: Literal["development", "testing", "staging", "production"] = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = False

    # ------------------------------------------------------------- database
    # Default is a local SQLite file so the project runs with zero setup.
    # docker-compose and any real deployment override this with PostgreSQL.
    DATABASE_URL: str = f"sqlite:///{(BACKEND_DIR / 'freshness.sqlite3').as_posix()}"
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # ------------------------------------------------------------------ jwt
    # NOTE: development-only default. Production MUST set JWT_SECRET_KEY.
    JWT_SECRET_KEY: str = "dev-only-insecure-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_MIN_LENGTH: int = 8

    # --------------------------------------------------------------- oauth2
    # Optional social login. Local JWT auth works fully without these.
    OAUTH_ENABLED: bool = False
    OAUTH_GOOGLE_CLIENT_ID: str = ""
    OAUTH_GOOGLE_CLIENT_SECRET: str = ""
    OAUTH_REDIRECT_URL: str = "http://localhost:5173/oauth/callback"

    # ------------------------------------------------------------------ cors
    # `NoDecode` stops pydantic-settings from JSON-decoding the env value, so
    # the validator below can accept either a JSON array or a plain
    # comma-separated list (which is far friendlier in Docker/CI env files).
    CORS_ORIGINS: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://localhost:3000",
        ]
    )

    # ---------------------------------------------------------- rate limit
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 300
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # ------------------------------------------------------------- uploads
    STORAGE_BACKEND: Literal["local", "s3", "azure"] = "local"
    UPLOAD_DIR: str = str(BACKEND_DIR / "uploads")
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_IMAGE_EXTENSIONS: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [".jpg", ".jpeg", ".png"]
    )
    ALLOWED_IMAGE_MIME_TYPES: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["image/jpeg", "image/png"]
    )

    # S3 / Azure are optional and only used when STORAGE_BACKEND says so.
    S3_BUCKET: str = ""
    S3_REGION: str = "us-east-1"
    S3_PREFIX: str = "food-images/"
    AZURE_STORAGE_CONTAINER: str = ""
    AZURE_STORAGE_CONNECTION_STRING: str = ""

    # ------------------------------------------------------------------- ml
    # DEMO_MODE=true  -> deterministic OpenCV/rule baselines ("Demo AI Analysis")
    # DEMO_MODE=false -> load trained artefacts from MODEL_PATH, fall back to
    #                    the baseline (and say so) when a file is missing.
    DEMO_MODE: bool = True
    MODEL_PATH: str = str(BACKEND_DIR / "app" / "ml" / "models")
    FRESHNESS_MODEL_FILE: str = "freshness_classifier.joblib"
    FRESHNESS_CNN_FILE: str = "freshness_cnn.keras"
    SHELF_LIFE_MODEL_FILE: str = "shelf_life_regressor.joblib"
    SPOILAGE_MODEL_FILE: str = "spoilage_yolo.pt"
    FOOD_CLASSIFIER_MODEL_FILE: str = "food_classifier.joblib"
    IMAGE_ANALYSIS_SIZE: int = 384

    # ------------------------------------------------- freshness score model
    # Weighted scoring model from the specification (must sum to 1.0).
    WEIGHT_VISUAL: float = 0.40
    WEIGHT_STORAGE: float = 0.25
    WEIGHT_SHELF_LIFE: float = 0.20
    WEIGHT_PRODUCT_AGE: float = 0.15

    # Configurable score -> category thresholds (lower bound, inclusive).
    THRESHOLD_FRESH: float = 90.0
    THRESHOLD_GOOD: float = 75.0
    THRESHOLD_ACCEPTABLE: float = 60.0
    THRESHOLD_NEAR_SPOILAGE: float = 30.0

    # ---------------------------------------------------------- alerting
    EXPIRY_WARNING_DAYS: int = 3
    SHELF_LIFE_WARNING_DAYS: int = 2
    STORAGE_TEMP_TOLERANCE_C: float = 1.0
    STORAGE_HUMIDITY_TOLERANCE_PCT: float = 5.0

    # ---------------------------------------------------------- reporting
    REPORT_DIR: str = str(PROJECT_ROOT / "reports")
    REPORT_ORGANISATION: str = "AI Food Freshness Monitoring Platform"

    # ----------------------------------------------------- sample images
    # Where `write_sample_library()` puts the generated demo images. Must be
    # writable; in a container PROJECT_ROOT is "/" so this is set explicitly
    # via the SAMPLE_DIR environment variable (see backend/Dockerfile).
    SAMPLE_DIR: str = str(PROJECT_ROOT / "data" / "sample")

    # ------------------------------------------------------------- sensors
    SENSOR_PROVIDER: Literal["mock", "mqtt"] = "mock"
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 1883
    MQTT_TOPIC: str = "freshness/sensors/#"
    MQTT_USERNAME: str = ""
    MQTT_PASSWORD: str = ""

    # ------------------------------------------------------------ email
    EMAIL_ENABLED: bool = False
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "no-reply@freshness.local"

    # --------------------------------------------------------------- seed
    SEED_DEMO_PASSWORD: str = "Demo@1234"

    # ------------------------------------------------------------ validators
    @field_validator("CORS_ORIGINS", "ALLOWED_IMAGE_EXTENSIONS", "ALLOWED_IMAGE_MIME_TYPES", mode="before")
    @classmethod
    def _split_csv(cls, value: Any) -> Any:
        """Accept both JSON arrays and comma-separated strings from env vars."""
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            if raw.startswith("["):
                return json.loads(raw)
            return [item.strip() for item in raw.split(",") if item.strip()]
        return value

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _normalise_db_url(cls, value: Any) -> Any:
        """Map `postgres://` (Heroku style) to the SQLAlchemy psycopg2 driver."""
        if isinstance(value, str) and value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg2://", 1)
        if isinstance(value, str) and value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg2://", 1)
        return value

    # ------------------------------------------------------------ helpers
    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def score_weights(self) -> dict[str, float]:
        return {
            "visual": self.WEIGHT_VISUAL,
            "storage": self.WEIGHT_STORAGE,
            "shelf_life": self.WEIGHT_SHELF_LIFE,
            "product_age": self.WEIGHT_PRODUCT_AGE,
        }

    @property
    def score_thresholds(self) -> dict[str, float]:
        return {
            "FRESH": self.THRESHOLD_FRESH,
            "GOOD": self.THRESHOLD_GOOD,
            "ACCEPTABLE": self.THRESHOLD_ACCEPTABLE,
            "NEAR_SPOILAGE": self.THRESHOLD_NEAR_SPOILAGE,
        }

    def ensure_directories(self) -> None:
        """Create writable directories the app depends on."""
        for path in (self.UPLOAD_DIR, self.MODEL_PATH, self.REPORT_DIR):
            Path(path).mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor (usable as a FastAPI dependency)."""
    return Settings()


settings = get_settings()
