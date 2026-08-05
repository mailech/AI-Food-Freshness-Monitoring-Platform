import os
import datetime
import uuid

from sqlalchemy import Column, String, Boolean, DateTime, Integer, Numeric, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

# Use native UUID for PostgreSQL, String for SQLite (tests)
_db_url = os.getenv("DATABASE_URL", "")
if _db_url.startswith("sqlite"):
    from sqlalchemy import String as _UUIDType
    def _UUID_col(**kwargs):
        return Column(String(36), **kwargs)
else:
    from sqlalchemy.dialects.postgresql import UUID as _PGUUID
    def _UUID_col(**kwargs):
        return Column(_PGUUID(as_uuid=True), **kwargs)


def _new_uuid():
    """Default factory — returns str for SQLite, UUID obj for PostgreSQL."""
    _url = os.getenv("DATABASE_URL", "")
    if _url.startswith("sqlite"):
        return str(uuid.uuid4())
    return uuid.uuid4()


class User(Base):
    __tablename__ = "users"

    id            = _UUID_col(primary_key=True, default=_new_uuid)
    name          = Column(String(255), nullable=False)
    email         = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(String(50), nullable=False)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), default=datetime.datetime.now)
    updated_at    = Column(DateTime(timezone=True), default=datetime.datetime.now, onupdate=datetime.datetime.now)

    # Relationships
    items = relationship("InventoryItem", back_populates="owner")


class FoodCategory(Base):
    __tablename__ = "food_categories"

    id                  = _UUID_col(primary_key=True, default=_new_uuid)
    name                = Column(String(100), unique=True, nullable=False)
    ideal_temp_min      = Column(Numeric(5, 2), nullable=False)
    ideal_temp_max      = Column(Numeric(5, 2), nullable=False)
    ideal_humidity_min  = Column(Numeric(5, 2), nullable=False)
    ideal_humidity_max  = Column(Numeric(5, 2), nullable=False)
    base_shelf_life_days= Column(Integer, nullable=False)
    created_at          = Column(DateTime(timezone=True), default=datetime.datetime.now)

    # Relationships
    batches = relationship("Batch", back_populates="category")
    items   = relationship("InventoryItem", back_populates="category")


class Batch(Base):
    __tablename__ = "batches"

    id            = _UUID_col(primary_key=True, default=_new_uuid)
    batch_number  = Column(String(100), unique=True, nullable=False, index=True)
    category_id   = Column(String(36), ForeignKey("food_categories.id", ondelete="CASCADE"), nullable=False)
    supplier_name = Column(String(255), nullable=False)
    received_date = Column(DateTime(timezone=True), default=datetime.datetime.now)
    notes         = Column(Text, nullable=True)
    created_at    = Column(DateTime(timezone=True), default=datetime.datetime.now)
    updated_at    = Column(DateTime(timezone=True), default=datetime.datetime.now, onupdate=datetime.datetime.now)

    # Relationships
    category = relationship("FoodCategory", back_populates="batches")
    items    = relationship("InventoryItem", back_populates="batch")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id               = _UUID_col(primary_key=True, default=_new_uuid)
    name             = Column(String(255), nullable=False)
    category_id      = Column(String(36), ForeignKey("food_categories.id", ondelete="CASCADE"), nullable=False)
    user_id          = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    batch_id         = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    quantity         = Column(Numeric(10, 2), nullable=False, default=1.0)
    unit             = Column(String(20), nullable=False, default="pcs")
    added_at         = Column(DateTime(timezone=True), default=datetime.datetime.now)
    expiry_date      = Column(DateTime(timezone=True), nullable=False)
    status           = Column(String(50), default="Fresh")
    freshness_score  = Column(Integer, default=100)
    storage_temp     = Column(Numeric(5, 2), nullable=True)
    storage_humidity = Column(Numeric(5, 2), nullable=True)
    created_at       = Column(DateTime(timezone=True), default=datetime.datetime.now)
    updated_at       = Column(DateTime(timezone=True), default=datetime.datetime.now, onupdate=datetime.datetime.now)

    # Relationships
    category        = relationship("FoodCategory", back_populates="items")
    owner           = relationship("User", back_populates="items")
    batch           = relationship("Batch", back_populates="items")
    storage_logs    = relationship("StorageLog", back_populates="item", cascade="all, delete-orphan")
    analysis_results= relationship("AnalysisResult", back_populates="item", cascade="all, delete-orphan")


class StorageLog(Base):
    __tablename__ = "storage_logs"

    id                = _UUID_col(primary_key=True, default=_new_uuid)
    inventory_item_id = Column(String(36), ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False)
    temperature       = Column(Numeric(5, 2), nullable=False)
    humidity          = Column(Numeric(5, 2), nullable=False)
    recorded_at       = Column(DateTime(timezone=True), default=datetime.datetime.now)

    # Relationships
    item = relationship("InventoryItem", back_populates="storage_logs")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id                       = _UUID_col(primary_key=True, default=_new_uuid)
    inventory_item_id        = Column(String(36), ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False)
    image_url                = Column(String(500), nullable=False)
    color_score              = Column(Numeric(5, 2), nullable=False)
    texture_score            = Column(Numeric(5, 2), nullable=False)
    mold_detected            = Column(Boolean, default=False)
    bruise_detected          = Column(Boolean, default=False)
    damage_detected          = Column(Boolean, default=False)
    freshness_score          = Column(Integer, nullable=False)
    spoilage_probability     = Column(Numeric(5, 4), nullable=False)
    remaining_shelf_life_days= Column(Numeric(6, 2), nullable=False)
    analyzed_at              = Column(DateTime(timezone=True), default=datetime.datetime.now)

    # Relationships
    item = relationship("InventoryItem", back_populates="analysis_results")
