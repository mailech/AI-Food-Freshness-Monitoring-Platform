"""Metadata entry point for future migrations and table creation commands.

Importing this module registers every model with Base.metadata. It deliberately
does not call metadata.create_all(), so application startup never changes the
database.
"""

from app.db.base import Base
from app.models import (  # noqa: F401
    Alert,
    FoodBatch,
    FoodItem,
    FreshnessAnalysis,
    FreshnessScore,
    Recommendation,
    Report,
    ShelfLifePrediction,
    StorageCondition,
    User,
)

__all__ = ["Base"]
