from sqlalchemy import Column, Integer, Float, String, DateTime
from datetime import datetime

from database import Base


class FoodHistory(Base):

    __tablename__ = "food_history"

    id = Column(Integer, primary_key=True, index=True)

    product_type = Column(String)
    temperature = Column(Float)
    humidity = Column(Float)
    packaging = Column(String)
    storage_duration = Column(Integer)

    freshness_category = Column(String)
    freshness_score = Column(Float)
    shelf_life_days = Column(Integer)
    confidence = Column(Float)
    recommendation = Column(String)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )