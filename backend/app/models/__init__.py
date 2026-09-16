"""SQLAlchemy models.

Importing this package registers every table on `Base.metadata`, which Alembic
autogenerate and `Base.metadata.create_all` both rely on.
"""

from app.models.assessment import (
    FreshnessAssessment,
    ShelfLifePrediction,
    SpoilageIndicator,
)
from app.models.base import Base, IdMixin, TimestampMixin, utcnow
from app.models.engagement import (
    Alert,
    AuditLog,
    Notification,
    Recommendation,
    Report,
)
from app.models.food import (
    FoodBatch,
    FoodCategory,
    FoodImage,
    FoodProduct,
    InventoryItem,
)
from app.models.storage import StorageCondition, StorageReading
from app.models.user import RefreshToken, Role, User, UserProfile

__all__ = [
    "Base",
    "IdMixin",
    "TimestampMixin",
    "utcnow",
    # identity
    "Role",
    "User",
    "UserProfile",
    "RefreshToken",
    # catalogue / inventory
    "FoodCategory",
    "FoodProduct",
    "FoodBatch",
    "InventoryItem",
    "FoodImage",
    # assessment
    "FreshnessAssessment",
    "SpoilageIndicator",
    "ShelfLifePrediction",
    # storage
    "StorageCondition",
    "StorageReading",
    # engagement
    "Recommendation",
    "Alert",
    "Notification",
    "Report",
    "AuditLog",
]
