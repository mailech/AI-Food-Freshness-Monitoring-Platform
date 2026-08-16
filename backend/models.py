from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum

class UserRole(str, enum.Enum):
    Consumer = "Consumer"
    RetailManager = "RetailManager"
    WarehouseOperator = "WarehouseOperator"
    FoodQualityInspector = "FoodQualityInspector"
    Administrator = "Administrator"

class FoodCategory(str, enum.Enum):
    Fruits = "Fruits"
    Vegetables = "Vegetables"
    DairyProducts = "Dairy Products"
    MeatPoultry = "Meat & Poultry"
    Seafood = "Seafood"
    BakeryProducts = "Bakery Products"
    PackagedFoods = "Packaged Foods"
    Beverages = "Beverages"

class FreshnessClass(str, enum.Enum):
    Fresh = "Fresh"
    Good = "Good"
    Acceptable = "Acceptable"
    NearSpoilage = "Near Spoilage"
    Spoiled = "Spoiled"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default=UserRole.Consumer.value)
    avatar = Column(String(500), default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    food_items = relationship("FoodItem", back_populates="owner")
    analysis_records = relationship("AnalysisRecord", back_populates="user")
    notifications = relationship("Notification", back_populates="user")

class FoodItem(Base):
    __tablename__ = "food_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)
    barcode = Column(String(100), default="")
    description = Column(Text, default="")
    quantity = Column(Integer, default=1)
    unit = Column(String(50), default="pieces")
    image_url = Column(String(500), default="")
    added_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    owner = relationship("User", back_populates="food_items")
    batches = relationship("Batch", back_populates="food_item")
    analysis_records = relationship("AnalysisRecord", back_populates="food_item")
    storage_conditions = relationship("StorageCondition", back_populates="food_item")

class Batch(Base):
    __tablename__ = "batches"
    id = Column(Integer, primary_key=True, index=True)
    label = Column(String(255), nullable=False)
    source = Column(String(255), default="")
    received_date = Column(DateTime, default=datetime.utcnow)
    expiry_date = Column(DateTime, nullable=True)
    food_item_id = Column(Integer, ForeignKey("food_items.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    food_item = relationship("FoodItem", back_populates="batches")

class AnalysisRecord(Base):
    __tablename__ = "analysis_records"
    id = Column(Integer, primary_key=True, index=True)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    image_path = Column(String(500), nullable=False)
    food_name = Column(String(255), default="Unknown")
    food_category = Column(String(100), default="")
    freshness_score = Column(Float, default=0.0)
    quality_class = Column(String(50), default="Unknown")
    confidence = Column(Float, default=0.0)
    color_score = Column(Float, default=0.0)
    texture_score = Column(Float, default=0.0)
    spoilage_probability = Column(Float, default=0.0)
    mold_detected = Column(Boolean, default=False)
    bruising_detected = Column(Boolean, default=False)
    damage_detected = Column(Boolean, default=False)
    shelf_life_days = Column(Float, default=0.0)
    shelf_life_text = Column(String(100), default="")
    storage_recommendation = Column(Text, default="")
    consumption_recommendation = Column(Text, default="")
    risk_level = Column(String(50), default="Low")
    created_at = Column(DateTime, default=datetime.utcnow)
    food_item = relationship("FoodItem", back_populates="analysis_records")
    user = relationship("User", back_populates="analysis_records")

class StorageCondition(Base):
    __tablename__ = "storage_conditions"
    id = Column(Integer, primary_key=True, index=True)
    food_item_id = Column(Integer, ForeignKey("food_items.id"))
    temperature = Column(Float, default=4.0)
    humidity = Column(Float, default=60.0)
    air_circulation = Column(String(50), default="Normal")
    light_exposure = Column(String(50), default="Dark")
    storage_duration_hours = Column(Float, default=0.0)
    packaging_type = Column(String(100), default="Open")
    is_compliant = Column(Boolean, default=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    food_item = relationship("FoodItem", back_populates="storage_conditions")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String(50), default="info")
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    priority = Column(String(20), default="normal")
    related_item_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="notifications")
