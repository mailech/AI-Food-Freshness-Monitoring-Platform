import enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship

from .database import Base


class UserRole(str, enum.Enum):
    consumer = "consumer"
    retail_manager = "retail_manager"
    warehouse_operator = "warehouse_operator"
    food_quality_inspector = "food_quality_inspector"
    administrator = "administrator"


class FoodCategory(str, enum.Enum):
    fruits = "fruits"
    vegetables = "vegetables"
    dairy = "dairy"
    meat_poultry = "meat_poultry"
    seafood = "seafood"
    bakery = "bakery"
    packaged = "packaged"
    beverages = "beverages"


class FreshnessLabel(str, enum.Enum):
    fresh = "fresh"
    good = "good"
    acceptable = "acceptable"
    near_spoilage = "near_spoilage"
    spoiled = "spoiled"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.consumer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    food_items = relationship("FoodItem", back_populates="owner", cascade="all, delete-orphan")


class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    name = Column(String, nullable=False)
    category = Column(Enum(FoodCategory), nullable=False)
    batch_id = Column(String, nullable=True)

    image_filename = Column(String, nullable=True)

    storage_temperature_c = Column(Float, nullable=True)
    storage_humidity_pct = Column(Float, nullable=True)

    freshness_score = Column(Float, nullable=True)       # 0-100
    freshness_label = Column(Enum(FreshnessLabel), nullable=True)
    predicted_shelf_life_days = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="food_items")
