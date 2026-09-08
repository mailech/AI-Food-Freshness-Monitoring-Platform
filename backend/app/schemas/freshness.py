"""Safe response schemas for freshness-analysis records."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import FreshnessCategory


class FreshnessAnalysisResponse(BaseModel):
    """Public representation; image_reference is never an absolute path."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    food_batch_id: int
    image_reference: str | None = Field(validation_alias="image_path")
    freshness_score: float | None
    freshness_category: FreshnessCategory | None
    spoilage_probability: float | None
    analysis_result: dict[str, Any] | None
    analyzed_at: datetime
