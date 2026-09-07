from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class FreshnessDetail(BaseModel):
    label: str # "fresh" or "rotten"
    confidence: float
    fresh_probability: float
    rotten_probability: float

class FoodTypeDetail(BaseModel):
    label: str # "apple", "banana", "orange", or user-provided
    confidence: float

class ShelfLifeDetail(BaseModel):
    remaining_days: Optional[int] = None
    confidence: Optional[float] = None
    status: str = "model_not_available" # Kaggle dataset does not contain remaining days labels
    note: str = "Shelf-life model requires temporal deterioration dataset with ground-truth remaining days."

class StorageAssessment(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    status: str = "normal"
    score: float = 90.0
    issues: List[str] = []

class PredictionResponse(BaseModel):
    analysis_id: str
    food_type: FoodTypeDetail
    freshness: FreshnessDetail
    visual_score: float
    spoilage_probability: float
    shelf_life: ShelfLifeDetail
    storage: StorageAssessment
    freshness_score: float
    detected_issues: List[str]
    recommendations: List[str]
    inference_time_ms: float
    model_version: str = "EfficientNetB0-Freshness-v1.0"
