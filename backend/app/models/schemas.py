from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date

class UserLogin(BaseModel):
    email: str
    password: str
    remember_me: Optional[bool] = False
    role: Optional[str] = "Food Quality Inspector"

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str = "Consumer"

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    token: str

class FoodItemCreate(BaseModel):
    name: str
    category: str
    batch_id: str
    quantity: float
    unit: str
    purchase_date: str
    expiry_date: str
    storage_temp: float
    humidity: float
    packaging_type: str
    image_url: Optional[str] = None
    freshness_status: Optional[str] = "Fresh"
    freshness_score: Optional[int] = 90

class FoodItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    batch_id: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    purchase_date: Optional[str] = None
    expiry_date: Optional[str] = None
    storage_temp: Optional[float] = None
    humidity: Optional[float] = None
    packaging_type: Optional[str] = None
    image_url: Optional[str] = None
    freshness_status: Optional[str] = None
    freshness_score: Optional[int] = None

class FoodItem(BaseModel):
    id: str
    name: str
    category: str
    batch_id: str
    quantity: float
    unit: str
    purchase_date: str
    expiry_date: str
    storage_temp: float
    humidity: float
    packaging_type: str
    image_url: Optional[str] = None
    freshness_status: str
    freshness_score: int
    spoilage_probability: float
    estimated_shelf_life_days: int
    storage_duration_days: int
    confidence: float
    detected_issues: List[str] = []
    recommendation: str = ""
    created_at: str
    freshness_history: List[Dict[str, Any]] = []

class FoodAnalysisRequest(BaseModel):
    food_type: Optional[str] = None
    category: Optional[str] = None
    image_base64: Optional[str] = None

class FoodAnalysisResponse(BaseModel):
    food_type: str
    category: str
    freshness_score: int
    freshness_category: str
    spoilage_probability: float
    estimated_shelf_life_days: int
    confidence: float
    detected_issues: List[str]
    recommendation: str
    storage_recommendation: str
    consumption_recommendation: str
    waste_reduction_recommendation: str
    risk_level: str
    metrics: Dict[str, Any]

class ShelfLifeResponse(BaseModel):
    food_id: str
    food_name: str
    estimated_remaining_days: int
    expected_expiry_date: str
    current_storage_duration_days: int
    storage_temp: float
    humidity: float
    risk_level: str
    prediction_confidence: float
    factors: List[Dict[str, Any]]

class StorageCondition(BaseModel):
    id: str
    zone_name: str
    temperature: float
    temperature_status: str
    humidity: float
    humidity_status: str
    air_circulation: str
    air_status: str
    light_exposure: str
    light_status: str
    storage_duration: str
    overall_status: str
    last_updated: str

class Recommendation(BaseModel):
    id: str
    food_name: str
    category: str
    type: str # storage, consumption, inventory, waste_reduction
    title: str
    description: str
    priority: str # High, Medium, Low
    action_text: str

class Alert(BaseModel):
    id: str
    title: str
    message: str
    type: str # Freshness Alert, Shelf-Life Warning, Spoilage Alert, Storage Condition Alert, Inventory Alert
    severity: str # critical, warning, info
    timestamp: str
    is_read: bool
    related_item_id: Optional[str] = None

class DashboardSummary(BaseModel):
    total_items: int
    fresh_items: int
    near_spoilage_items: int
    spoiled_items: int
    average_freshness: int
    freshness_distribution: Dict[str, int]
    category_distribution: Dict[str, int]
    freshness_trend: List[Dict[str, Any]]
    expiring_soon: List[FoodItem]
    recent_analyses: List[Dict[str, Any]]

class ReportItem(BaseModel):
    id: str
    title: str
    report_type: str
    created_at: str
    generated_by: str
    summary: str
    status: str
    data: Dict[str, Any]
