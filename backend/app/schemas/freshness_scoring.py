"""Response schemas for composite freshness scoring evaluations."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class FreshnessScoreResponse(BaseModel):
    """Safe representation of a stored scoring evaluation."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    food_batch_id: int
    visual_freshness_score: Decimal | None
    storage_condition_score: Decimal | None
    shelf_life_score: Decimal | None
    product_age_score: Decimal | None
    freshness_score: Decimal | None
    visual_weight: Decimal
    storage_weight: Decimal
    shelf_life_weight: Decimal
    product_age_weight: Decimal
    status: str
    created_at: datetime
    updated_at: datetime
