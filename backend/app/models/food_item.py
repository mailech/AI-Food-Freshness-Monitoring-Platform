import enum
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class FreshnessCategory(str, enum.Enum):
    FRESH = "Fresh"
    GOOD = "Good"
    ACCEPTABLE = "Acceptable"
    NEAR_SPOILAGE = "Near Spoilage"
    SPOILED = "Spoiled"


class SpoilageRiskLevel(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True, default="Produce")
    batch_id = Column(String(100), nullable=False, index=True)
    quantity = Column(Float, nullable=False, default=1.0)
    unit = Column(String(50), nullable=False, default="kg")
    
    freshness_score = Column(Float, nullable=True, default=95.0)  # Percentage 0 - 100
    freshness_status = Column(String(50), nullable=False, default="Fresh")
    spoilage_risk = Column(String(50), nullable=True, default="Low")
    
    storage_temperature = Column(Float, nullable=True, default=4.0)  # In Celsius
    humidity = Column(Float, nullable=True, default=85.0)  # In percentage
    estimated_expiry_days = Column(Integer, nullable=True, default=7)
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    
    origin_location = Column(String(255), nullable=True, default="Local Facility")
    image_url = Column(Text, nullable=True)
    storage_tip = Column(Text, nullable=True)
    consumption_suggestion = Column(Text, nullable=True)
    
    is_sample_data = Column(Boolean, nullable=False, default=False, server_default="false")
    is_personal = Column(Boolean, nullable=False, default=False, server_default="false", index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    owner = relationship("User", backref="food_items", lazy="joined")
