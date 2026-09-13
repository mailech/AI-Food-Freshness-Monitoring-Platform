from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth & User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "consumer"
    phone: Optional[str] = None
    department: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

# --- Batch Schemas ---
class BatchBase(BaseModel):
    batch_number: str
    supplier_name: str
    category: str
    total_quantity: float
    unit: str = "kg"
    initial_quality_grade: str = "Grade A"
    inspection_status: str = "pending"
    notes: Optional[str] = None

class BatchCreate(BatchBase):
    pass

class BatchUpdate(BaseModel):
    inspection_status: Optional[str] = None
    initial_quality_grade: Optional[str] = None
    notes: Optional[str] = None

class BatchOut(BatchBase):
    id: int
    arrival_date: datetime
    created_at: datetime
    class Config:
        from_attributes = True

# --- Storage Location & Environmental Reading Schemas ---
class StorageLocationBase(BaseModel):
    name: str
    location_type: str
    ideal_temp_min: float = 0.0
    ideal_temp_max: float = 4.0
    ideal_humidity_min: float = 85.0
    ideal_humidity_max: float = 95.0
    current_temperature: float = 3.0
    current_humidity: float = 90.0
    air_circulation: str = "Medium"
    light_exposure: str = "Low Light"

class StorageLocationCreate(StorageLocationBase):
    pass

class StorageLocationUpdate(BaseModel):
    name: Optional[str] = None
    ideal_temp_min: Optional[float] = None
    ideal_temp_max: Optional[float] = None
    ideal_humidity_min: Optional[float] = None
    ideal_humidity_max: Optional[float] = None
    current_temperature: Optional[float] = None
    current_humidity: Optional[float] = None
    air_circulation: Optional[str] = None
    light_exposure: Optional[str] = None

class StorageLocationOut(StorageLocationBase):
    id: int
    last_reading_time: datetime
    is_compliant: Optional[bool] = True
    target_temp_min: Optional[float] = None
    target_temp_max: Optional[float] = None
    target_humidity_min: Optional[float] = None
    target_humidity_max: Optional[float] = None
    max_ethylene_ppm: Optional[float] = 1.5
    max_co2_ppm: Optional[float] = 1000.0
    latest_reading: Optional[dict] = None
    class Config:
        from_attributes = True

class EnvironmentalReadingCreate(BaseModel):
    storage_location_id: int
    temperature: float
    humidity: float
    ethylene: Optional[float] = 0.5
    co2_level: Optional[float] = 400.0
    air_circulation: str = "Medium"
    light_exposure: str = "Low Light"
    recorded_by: Optional[str] = "IoT Sensor Suite"

class EnvironmentalReadingOut(BaseModel):
    id: int
    storage_location_id: int
    temperature: float
    humidity: float
    ethylene: Optional[float] = 0.5
    co2_level: Optional[float] = 400.0
    air_circulation: str
    light_exposure: str
    is_compliant: bool
    compliance_status: Optional[str] = "compliant"
    alerts_triggered: Optional[List[str]] = []
    recorded_by: str
    timestamp: datetime
    class Config:
        from_attributes = True

class TelemetrySimulationInput(BaseModel):
    storage_location_id: int
    temperature: float
    humidity: float
    ethylene: Optional[float] = None
    co2_level: Optional[float] = None
    air_circulation: Optional[str] = "Medium"
    light_exposure: Optional[str] = "Low Light"

# --- Food Item Schemas ---
class FoodItemBase(BaseModel):
    name: str
    category: str
    batch_id: Optional[int] = None
    storage_location_id: Optional[int] = None
    quantity: float = 1.0
    unit: str = "units"
    packaging_type: str = "Unpackaged"
    initial_freshness_score: float = 95.0
    current_freshness_score: float = 90.0
    quality_category: str = "Fresh"
    harvest_date: Optional[datetime] = None
    purchase_date: Optional[datetime] = None
    estimated_expiry_date: Optional[datetime] = None
    days_stored: int = 0
    status: str = "active"
    image_url: Optional[str] = None

class FoodItemCreate(FoodItemBase):
    pass

class FoodItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    storage_location_id: Optional[int] = None
    quantity: Optional[float] = None
    packaging_type: Optional[str] = None
    current_freshness_score: Optional[float] = None
    quality_category: Optional[str] = None
    status: Optional[str] = None
    days_stored: Optional[int] = None
    estimated_expiry_date: Optional[datetime] = None

class FoodItemOut(FoodItemBase):
    id: int
    created_at: datetime
    updated_at: datetime
    remaining_shelf_life_days: Optional[float] = None
    storage_location_name: Optional[str] = None
    batch_number: Optional[str] = None
    class Config:
        from_attributes = True

# --- Freshness & ML Vision Schemas ---
class FreshnessScanOut(BaseModel):
    id: int
    food_item_id: Optional[int] = None
    image_url: str
    predicted_class: str
    confidence: float
    visual_condition_score: float
    color_score: float
    texture_score: float
    mold_detected: bool
    bruising_detected: bool
    physical_damage_detected: bool
    spoilage_probability: float
    freshness_category: str
    freshness_score: float
    predicted_shelf_life_days: float
    expiry_forecast_date: Optional[datetime] = None
    scan_timestamp: datetime
    class Config:
        from_attributes = True

class WeightedScoreBreakdown(BaseModel):
    visual_condition_score: float
    visual_weight: float = 0.40
    storage_condition_score: float
    storage_weight: float = 0.25
    shelf_life_prediction_score: float
    shelf_life_weight: float = 0.20
    product_age_score: float
    product_age_weight: float = 0.15
    final_freshness_score: float
    freshness_category: str

class FreshnessAssessmentInput(BaseModel):
    food_item_id: Optional[int] = None
    category: str
    visual_score: float = 90.0
    storage_location_id: Optional[int] = None
    current_temperature: Optional[float] = None
    current_humidity: Optional[float] = None
    packaging_type: str = "Unpackaged"
    days_stored: int = 0
    total_expected_shelf_life: float = 14.0

class ShelfLifePredictionInput(BaseModel):
    category: str
    product_name: str
    current_freshness_score: float
    storage_temperature: float
    storage_humidity: float
    packaging_type: str = "Unpackaged"
    days_stored: int = 0

class ShelfLifePredictionOut(BaseModel):
    base_shelf_life_days: float
    adjusted_shelf_life_days: float
    temperature_impact_factor: float
    humidity_impact_factor: float
    packaging_benefit_factor: float
    predicted_expiry_date: datetime
    risk_level: str
    storage_optimization_tip: str

# --- Alerts & Recommendations Schemas ---
class AlertOut(BaseModel):
    id: int
    alert_type: str
    severity: str
    title: str
    message: str
    food_item_id: Optional[int] = None
    storage_location_id: Optional[int] = None
    is_read: bool
    is_resolved: bool
    created_at: datetime
    class Config:
        from_attributes = True

class RecommendationOut(BaseModel):
    id: int
    food_item_id: Optional[int] = None
    storage_location_id: Optional[int] = None
    recommendation_type: str
    title: str
    description: str
    priority: str
    action_taken: bool
    created_at: datetime
    class Config:
        from_attributes = True

# --- Analytics & Audit ---
class AnalyticsSummary(BaseModel):
    total_items: int
    average_freshness_score: float
    fresh_items_count: int
    near_spoilage_count: int
    spoiled_count: int
    active_alerts_count: int
    storage_compliance_rate: float
    waste_reduction_savings_pct: float
    category_distribution: Dict[str, int]
    freshness_distribution: Dict[str, int]
    recent_scans: List[FreshnessScanOut]

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    details: Optional[str] = None
    timestamp: datetime
    class Config:
        from_attributes = True
