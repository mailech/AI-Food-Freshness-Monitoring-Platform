from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="consumer", nullable=False)  # consumer, retail_manager, warehouse_operator, food_quality_inspector, administrator
    is_active = Column(Boolean, default=True)
    phone = Column(String(50), nullable=True)
    department = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    scans = relationship("FreshnessScan", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    food_items = relationship("FoodItem", back_populates="user")

class Batch(Base):
    __tablename__ = "batches"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_number = Column(String(100), unique=True, index=True, nullable=False)
    supplier_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    total_quantity = Column(Float, nullable=False)
    unit = Column(String(20), default="kg")
    arrival_date = Column(DateTime, default=datetime.utcnow)
    initial_quality_grade = Column(String(50), default="Grade A")
    inspection_status = Column(String(50), default="pending")  # pending, passed, quarantined, rejected
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("FoodItem", back_populates="batch")

class StorageLocation(Base):
    __tablename__ = "storage_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    location_type = Column(String(100), nullable=False)
    ideal_temp_min = Column(Float, default=0.0)
    ideal_temp_max = Column(Float, default=4.0)
    ideal_humidity_min = Column(Float, default=85.0)
    ideal_humidity_max = Column(Float, default=95.0)
    current_temperature = Column(Float, default=3.0)
    current_humidity = Column(Float, default=90.0)
    air_circulation = Column(String(50), default="Medium")
    light_exposure = Column(String(50), default="Low Light")
    last_reading_time = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("FoodItem", back_populates="storage_location")
    readings = relationship("EnvironmentalReading", back_populates="storage_location")
    alerts = relationship("Alert", back_populates="storage_location")

class EnvironmentalReading(Base):
    __tablename__ = "environmental_readings"
    
    id = Column(Integer, primary_key=True, index=True)
    storage_location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=False)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    air_circulation = Column(String(50), default="Medium")
    light_exposure = Column(String(50), default="Low Light")
    is_compliant = Column(Boolean, default=True)
    recorded_by = Column(String(100), default="IoT Sensor Suite v2.1")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    storage_location = relationship("StorageLocation", back_populates="readings")

class FoodItem(Base):
    __tablename__ = "food_items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)  # Fruits, Vegetables, Dairy Products, Meat & Poultry, Seafood, Bakery Products, Packaged Foods, Beverages
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=True)
    storage_location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    quantity = Column(Float, default=1.0)
    unit = Column(String(20), default="units")
    packaging_type = Column(String(100), default="Unpackaged")  # Unpackaged, Plastic Wrap, Sealed Container, Vacuum Sealed, Paper Bag
    initial_freshness_score = Column(Float, default=95.0)
    current_freshness_score = Column(Float, default=90.0)
    quality_category = Column(String(50), default="Fresh")  # Fresh, Good, Acceptable, Near Spoilage, Spoiled
    harvest_date = Column(DateTime, default=datetime.utcnow)
    purchase_date = Column(DateTime, default=datetime.utcnow)
    estimated_expiry_date = Column(DateTime, nullable=True)
    days_stored = Column(Integer, default=0)
    status = Column(String(50), default="active")  # active, consumed, discarded, quarantined, markdown
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    batch = relationship("Batch", back_populates="items")
    storage_location = relationship("StorageLocation", back_populates="items")
    user = relationship("User", back_populates="food_items")
    scans = relationship("FreshnessScan", back_populates="food_item")
    predictions = relationship("ShelfLifePrediction", back_populates="food_item")
    alerts = relationship("Alert", back_populates="food_item")
    recommendations = relationship("Recommendation", back_populates="food_item")

class FreshnessScan(Base):
    __tablename__ = "freshness_scans"
    
    id = Column(Integer, primary_key=True, index=True)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    image_url = Column(String(500), nullable=False)
    image_filename = Column(String(255), nullable=True)
    predicted_class = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)
    visual_condition_score = Column(Float, default=90.0)
    color_score = Column(Float, default=90.0)
    texture_score = Column(Float, default=90.0)
    mold_detected = Column(Boolean, default=False)
    bruising_detected = Column(Boolean, default=False)
    physical_damage_detected = Column(Boolean, default=False)
    spoilage_probability = Column(Float, default=0.05)
    freshness_category = Column(String(50), default="Fresh")
    freshness_score = Column(Float, default=92.0)
    predicted_shelf_life_days = Column(Float, default=7.0)
    expiry_forecast_date = Column(DateTime, nullable=True)
    scan_timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    food_item = relationship("FoodItem", back_populates="scans")
    user = relationship("User", back_populates="scans")

class ShelfLifePrediction(Base):
    __tablename__ = "shelf_life_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=False)
    base_shelf_life_days = Column(Float, nullable=False)
    adjusted_shelf_life_days = Column(Float, nullable=False)
    temperature_factor = Column(Float, default=1.0)
    humidity_factor = Column(Float, default=1.0)
    packaging_factor = Column(Float, default=1.0)
    age_factor = Column(Float, default=1.0)
    risk_level = Column(String(50), default="Low")  # Low, Medium, High, Critical
    predicted_expiry = Column(DateTime, nullable=False)
    predicted_at = Column(DateTime, default=datetime.utcnow)

    food_item = relationship("FoodItem", back_populates="predictions")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String(50), nullable=False)  # freshness, shelf_life, spoilage, storage_condition, inventory, platform
    severity = Column(String(50), default="medium")  # low, medium, high, critical
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=True)
    storage_location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    food_item = relationship("FoodItem", back_populates="alerts")
    storage_location = relationship("StorageLocation", back_populates="alerts")

class Recommendation(Base):
    __tablename__ = "recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=True)
    storage_location_id = Column(Integer, ForeignKey("storage_locations.id"), nullable=True)
    recommendation_type = Column(String(50), nullable=False)  # storage, consumption, rotation, waste_reduction, quality_improvement
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(50), default="medium")  # low, medium, high, urgent
    action_taken = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    food_item = relationship("FoodItem", back_populates="recommendations")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")
