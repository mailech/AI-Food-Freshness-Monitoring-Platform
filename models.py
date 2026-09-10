from datetime import datetime
from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="Consumer", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    quantity = Column(Integer, default=0)
    expiry_date = Column(Date, nullable=True)
    status = Column(String, default="Fresh")
    freshness_score = Column(Float, default=100.0)
    image_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class StorageRecord(Base):
    __tablename__ = "storage_records"

    id = Column(Integer, primary_key=True, index=True)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=True)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    air_circulation = Column(String, default="Good")
    light_exposure = Column(String, default="Low")
    storage_duration_days = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class AnalysisRecord(Base):
    __tablename__ = "analysis_records"

    id = Column(Integer, primary_key=True, index=True)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=True)
    image_path = Column(String, nullable=True)
    freshness_score = Column(Float, nullable=False)
    status = Column(String, nullable=False)
    spoilage_probability = Column(Float, nullable=False)
    shelf_life_days = Column(Integer, nullable=False)
    recommendation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
