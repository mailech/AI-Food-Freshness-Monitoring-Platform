from datetime import datetime, timezone
from typing import Optional
from beanie import Document
from pydantic import Field

class ImageAnalysis(Document):
    item_id: str = Field(..., description="UUID string referring to Postgres inventory_items.id")
    filename: str
    file_url: str
    freshness_score: float = Field(default=100.0, description="Freshness Index (0.0 to 100.0)")
    color_degradation: float = Field(default=0.0, description="Color degradation/browning index (0.0 to 1.0)")
    texture_roughness: float = Field(default=0.0, description="Surface texture decay/wrinkles (0.0 to 1.0)")
    mold_detected: bool = Field(default=False)
    mold_confidence: float = Field(default=0.0)
    bruising_detected: bool = Field(default=False)
    bruising_confidence: float = Field(default=0.0)
    damage_detected: bool = Field(default=False)
    damage_confidence: float = Field(default=0.0)
    classification_label: str = Field(default="unknown/uncertain", description="ML output class classification")
    status_message: str = Field(default="Normal classification", description="Detailed safety or status description")
    analyzed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "image_analyses"
