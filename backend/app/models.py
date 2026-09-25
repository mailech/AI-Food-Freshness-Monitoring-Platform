from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="consumer")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FoodAnalysis(Base):
    __tablename__ = "food_analysis"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)

    food = Column(String(100), nullable=False)
    freshness = Column(String(50), nullable=False)
    confidence = Column(Float)
    freshness_score = Column(Float)
    classification = Column(String(50))
    visual_score = Column(Float)

    expected_shelf_life_days = Column(Float)
    remaining_days = Column(Float)

    temperature = Column(Float)
    humidity = Column(Float)
    packaging = Column(String(50))
    storage_duration = Column(Integer)

    recommendation = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)

    food_name = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False)
    quantity = Column(Float, default=0)
    unit = Column(String(50), default="kg")

    batch_id = Column(String(100), nullable=True)
    tracking_id = Column(String(100), nullable=True)

    freshness = Column(String(50), nullable=True)
    expiry_date = Column(String(50), nullable=True)

    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    storage_duration = Column(Integer, default=0)
    air_circulation = Column(String(50), nullable=True)
    light_exposure = Column(String(50), nullable=True)
    packaging = Column(String(50), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
class FoodBatch(Base):
    __tablename__ = "food_batches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)

    batch_id = Column(String(100), nullable=False)
    food_name = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False)

    quantity = Column(Float, default=0)
    unit = Column(String(50), default="kg")

    freshness = Column(String(50), nullable=True)
    shelf_life = Column(String(50), nullable=True)

    status = Column(String(50), default="Active")

    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )