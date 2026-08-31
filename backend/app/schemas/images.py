from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AssessmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    image_id: int
    predicted_class: str
    is_fresh: bool
    confidence: float
    spoilage_probability: float
    freshness_score: float
    freshness_category: str
    assessed_at: datetime


class ImageUploadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    file_path: str
    uploaded_at: datetime
    assessment: Optional[AssessmentOut] = None
