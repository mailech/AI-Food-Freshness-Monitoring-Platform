import uuid
from datetime import datetime
from typing import Any, Dict, Optional, List
from pydantic import BaseModel, Field

class ShelfLifePredictionRequest(BaseModel):
    item_id: Optional[uuid.UUID] = Field(None, description="Database ID of the inventory item (optional)")
    category: Optional[str] = Field(None, description="Food category (e.g. Fruits, Dairy Products)")
    packaging_type: Optional[str] = Field("None", description="Packaging type used")
    temperature: Optional[float] = Field(None, description="Storage temperature in Celsius")
    humidity: Optional[float] = Field(None, description="Storage relative humidity in percentage")
    air_circulation: Optional[str] = Field("Medium", description="Air circulation: Low, Medium, High")
    light_exposure: Optional[str] = Field("Low", description="Light exposure: Dark, Low, Medium, High")
    storage_duration_days: float = Field(0.0, description="Number of days item has already been in storage")

class ShelfLifeImpactAnalysis(BaseModel):
    temperature_impact: str = Field(..., description="Description of temperature impact")
    humidity_impact: str = Field(..., description="Description of humidity impact")
    shelf_life_ideal_conditions_days: float = Field(..., description="Predicted total shelf-life in days under ideal settings")
    shelf_life_current_conditions_days: float = Field(..., description="Predicted total shelf-life in days under current settings")

class ShelfLifePredictionResponse(BaseModel):
    predicted_remaining_shelf_life_days: float = Field(..., description="Predicted remaining shelf life in days")
    predicted_expiry_date: datetime = Field(..., description="Forecasted spoilage/expiry date")
    recommended_temperature: float = Field(..., description="Ideal storage temperature in Celsius")
    recommended_humidity: float = Field(..., description="Ideal relative humidity in percentage")
    risk_level: str = Field(..., description="Risk level (LOW, MEDIUM, HIGH)")
    impact_analysis: ShelfLifeImpactAnalysis = Field(..., description="Detailed storage environment impact analysis")
    
    # Audit & Pipeline fields
    status: str = Field("SUCCESS", description="Prediction status: SUCCESS, UNCERTAIN, INVALID_INPUT")
    methodology: str = Field(..., description="Prediction model methodology description")
    estimated_remaining_days: float = Field(..., description="Remaining days estimate")
    estimated_expiry_date: datetime = Field(..., description="Predicted expiry date")
    confidence_score: float = Field(..., description="Model confidence score or uncertainty metric")
    factors_affecting_shelf_life: List[str] = Field(..., description="List of environmental factors affecting shelf life")
    model_version: Optional[str] = Field("1.0.0", description="Model version string")
    prediction_timestamp: Optional[datetime] = Field(None, description="Timestamp of prediction")
    input_summary: Optional[Dict[str, Any]] = Field(None, description="Summary of parsed inputs")
