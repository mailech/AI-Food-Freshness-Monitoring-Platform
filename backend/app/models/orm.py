from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.db.base import Base

def generate_uuid():
    return str(uuid.uuid4())

class UserORM(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(50), default="Food Quality Inspector")
    created_at = Column(DateTime, default=datetime.utcnow)

class FoodItemORM(Base):
    __tablename__ = "foods"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(120), nullable=False, index=True)
    category = Column(String(60), nullable=False, index=True)
    batch_id = Column(String(64), nullable=False, index=True)
    quantity = Column(Float, nullable=False, default=1.0)
    unit = Column(String(20), nullable=False, default="kg")
    purchase_date = Column(String(30), nullable=False)
    expiry_date = Column(String(30), nullable=False)
    storage_temp = Column(Float, nullable=False, default=4.0)
    humidity = Column(Float, nullable=False, default=85.0)
    packaging_type = Column(String(80), nullable=False, default="Standard Packaging")
    image_url = Column(String(500), nullable=True)
    freshness_status = Column(String(40), nullable=False, default="Fresh")
    freshness_score = Column(Integer, nullable=False, default=90)
    spoilage_probability = Column(Float, nullable=False, default=0.05)
    estimated_shelf_life_days = Column(Integer, nullable=False, default=7)
    storage_duration_days = Column(Integer, nullable=False, default=1)
    confidence = Column(Float, nullable=False, default=0.92)
    detected_issues = Column(JSON, default=list)
    recommendation = Column(Text, nullable=True)
    created_at = Column(String(40), default=lambda: datetime.utcnow().isoformat())
    freshness_history = Column(JSON, default=list)

    # Relationships
    batches = relationship("FoodBatchORM", back_populates="food_item", cascade="all, delete-orphan")
    images = relationship("FoodImageORM", back_populates="food_item", cascade="all, delete-orphan")
    analyses = relationship("FoodAnalysisORM", back_populates="food_item", cascade="all, delete-orphan")

class FoodBatchORM(Base):
    __tablename__ = "food_batches"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    batch_code = Column(String(64), unique=True, index=True, nullable=False)
    food_id = Column(String(64), ForeignKey("foods.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), default="kg")
    origin = Column(String(100), default="Regional Supplier")
    harvest_date = Column(String(30), nullable=True)
    arrival_date = Column(String(30), nullable=False)
    current_status = Column(String(40), default="In Storage")
    created_at = Column(DateTime, default=datetime.utcnow)

    food_item = relationship("FoodItemORM", back_populates="batches")

class FoodImageORM(Base):
    __tablename__ = "food_images"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    food_id = Column(String(64), ForeignKey("foods.id"), nullable=True)
    file_path = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    mime_type = Column(String(50), default="image/jpeg")
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    food_item = relationship("FoodItemORM", back_populates="images")

class FoodAnalysisORM(Base):
    __tablename__ = "food_analysis"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    food_id = Column(String(64), ForeignKey("foods.id"), nullable=True)
    food_name = Column(String(120), nullable=False)
    category = Column(String(60), nullable=False)
    image_url = Column(String(500), nullable=True)
    freshness_score = Column(Integer, nullable=False)
    freshness_category = Column(String(40), nullable=False)
    spoilage_probability = Column(Float, nullable=False)
    estimated_shelf_life_days = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    visual_score = Column(Float, nullable=True)
    storage_score = Column(Float, nullable=True)
    detected_issues = Column(JSON, default=list)
    recommendation = Column(Text, nullable=True)
    storage_recommendation = Column(Text, nullable=True)
    consumption_recommendation = Column(Text, nullable=True)
    waste_reduction_recommendation = Column(Text, nullable=True)
    risk_level = Column(String(30), default="Low")
    metrics = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    food_item = relationship("FoodItemORM", back_populates="analyses")
    predictions = relationship("FreshnessPredictionORM", back_populates="analysis", cascade="all, delete-orphan")

class FreshnessPredictionORM(Base):
    __tablename__ = "freshness_predictions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(64), ForeignKey("food_analysis.id"), nullable=False)
    model_name = Column(String(80), default="EfficientNetB0-Freshness")
    predicted_class = Column(String(50), nullable=False)
    predicted_food_type = Column(String(50), nullable=True)
    fresh_probability = Column(Float, nullable=False)
    rotten_probability = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    raw_class_probabilities = Column(JSON, default=dict)
    inference_time_ms = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("FoodAnalysisORM", back_populates="predictions")

class ShelfLifePredictionORM(Base):
    __tablename__ = "shelf_life_predictions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    food_id = Column(String(64), ForeignKey("foods.id"), nullable=True)
    estimated_remaining_days = Column(Integer, nullable=False)
    expected_expiry_date = Column(String(30), nullable=False)
    risk_level = Column(String(30), default="Low")
    prediction_confidence = Column(Float, default=0.90)
    model_status = Column(String(50), default="calibrated_baseline")
    factors = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

class StorageConditionORM(Base):
    __tablename__ = "storage_conditions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    zone_name = Column(String(100), nullable=False)
    temperature = Column(Float, nullable=False)
    temperature_status = Column(String(30), default="Normal")
    humidity = Column(Float, nullable=False)
    humidity_status = Column(String(30), default="Normal")
    air_circulation = Column(String(60), default="Optimal (1.2 m/s)")
    air_status = Column(String(30), default="Normal")
    light_exposure = Column(String(60), default="Low (15 Lux)")
    light_status = Column(String(30), default="Normal")
    storage_duration = Column(String(60), default="Continuous 24/7")
    overall_status = Column(String(30), default="Normal")
    last_updated = Column(String(40), default="Just now")

class RecommendationORM(Base):
    __tablename__ = "recommendations"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    food_name = Column(String(120), nullable=False)
    category = Column(String(60), nullable=False)
    type = Column(String(40), nullable=False) # storage, consumption, inventory, waste_reduction
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(20), default="Medium") # High, Medium, Low
    action_text = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AlertORM(Base):
    __tablename__ = "alerts"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(60), nullable=False)
    severity = Column(String(30), default="warning") # critical, warning, info
    timestamp = Column(String(60), default="Just now")
    is_read = Column(Boolean, default=False)
    related_item_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ReportORM(Base):
    __tablename__ = "reports"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    title = Column(String(200), nullable=False)
    report_type = Column(String(60), nullable=False)
    created_at = Column(String(30), default=lambda: datetime.utcnow().strftime("%Y-%m-%d"))
    generated_by = Column(String(100), default="Food Quality Inspector")
    summary = Column(Text, nullable=False)
    status = Column(String(30), default="Ready")
    data = Column(JSON, default=dict)
