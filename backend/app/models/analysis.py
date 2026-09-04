from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.database import Base

class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    id = Column(Integer, primary_key=True, index=True)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=True)
    freshness_category = Column(String)
    freshness_score = Column(Float)
    spoilage_probability = Column(Float)
    confidence_score = Column(Float)
    detected_indicators = Column(String) # Stored as comma-separated string for simplicity
    is_demo_prediction = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())