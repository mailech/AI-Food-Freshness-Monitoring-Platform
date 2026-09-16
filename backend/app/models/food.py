"""Food catalogue and inventory models."""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import InventoryStatus
from app.models.base import Base, IdMixin, TimestampMixin

if TYPE_CHECKING:  # pragma: no cover
    from app.models.assessment import FreshnessAssessment, ShelfLifePrediction
    from app.models.engagement import Alert, Recommendation
    from app.models.storage import StorageCondition, StorageReading
    from app.models.user import User


class FoodCategory(Base, IdMixin, TimestampMixin):
    """A food category. `slug` links the row to a `CategoryProfile` in code."""

    __tablename__ = "food_categories"

    slug: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(String(60))
    # Category-level overrides for the code defaults in core.category_rules.
    default_shelf_life_days: Mapped[float | None] = mapped_column(Float)
    ideal_temp_min_c: Mapped[float | None] = mapped_column(Float)
    ideal_temp_max_c: Mapped[float | None] = mapped_column(Float)
    ideal_humidity_min_pct: Mapped[float | None] = mapped_column(Float)
    ideal_humidity_max_pct: Mapped[float | None] = mapped_column(Float)
    perishability: Mapped[float | None] = mapped_column(Float)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    products: Mapped[list["FoodProduct"]] = relationship(back_populates="category")


class FoodProduct(Base, IdMixin, TimestampMixin):
    __tablename__ = "food_products"
    __table_args__ = (
        UniqueConstraint("sku", name="uq_food_products_sku"),
        Index("ix_food_products_category_active", "category_id", "is_active"),
    )

    name: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    sku: Mapped[str | None] = mapped_column(String(64), index=True)
    brand: Mapped[str | None] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("food_categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    default_unit: Mapped[str] = mapped_column(String(20), default="kg", nullable=False)
    # Product-level shelf life at ideal storage; falls back to the category value.
    shelf_life_days: Mapped[float | None] = mapped_column(Float)
    default_packaging: Mapped[str | None] = mapped_column(String(40))
    storage_instructions: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    category: Mapped["FoodCategory"] = relationship(back_populates="products", lazy="joined")
    batches: Mapped[list["FoodBatch"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )


class FoodBatch(Base, IdMixin, TimestampMixin):
    """A physical lot of a product - the central entity most analysis hangs off."""

    __tablename__ = "food_batches"
    __table_args__ = (
        UniqueConstraint("batch_number", name="uq_food_batches_batch_number"),
        Index("ix_food_batches_status_expiry", "status", "expected_expiry_date"),
        Index("ix_food_batches_product_created", "product_id", "created_at"),
        Index("ix_food_batches_location", "storage_location"),
    )

    batch_number: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("food_products.id", ondelete="CASCADE"), nullable=False, index=True
    )

    quantity: Mapped[float] = mapped_column(Numeric(12, 3), default=0, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="kg", nullable=False)

    production_date: Mapped[date | None] = mapped_column(Date)
    purchase_date: Mapped[date | None] = mapped_column(Date, index=True)
    storage_date: Mapped[date | None] = mapped_column(Date)
    expected_expiry_date: Mapped[date | None] = mapped_column(Date, index=True)
    # Updated by the shelf-life service after each analysis.
    predicted_expiry_date: Mapped[date | None] = mapped_column(Date, index=True)

    packaging_type: Mapped[str | None] = mapped_column(String(40))
    storage_location: Mapped[str | None] = mapped_column(String(160))
    supplier: Mapped[str | None] = mapped_column(String(160))
    cost_per_unit: Mapped[float | None] = mapped_column(Numeric(12, 2))

    status: Mapped[str] = mapped_column(
        String(24), default=InventoryStatus.FRESH.value, nullable=False, index=True
    )
    # Denormalised latest assessment values - keeps dashboards fast and avoids
    # re-running inference for read-only views.
    current_freshness_score: Mapped[float | None] = mapped_column(Float, index=True)
    current_freshness_category: Mapped[str | None] = mapped_column(String(24), index=True)
    remaining_shelf_life_days: Mapped[float | None] = mapped_column(Float, index=True)
    last_assessed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    product: Mapped["FoodProduct"] = relationship(back_populates="batches", lazy="joined")
    images: Mapped[list["FoodImage"]] = relationship(
        back_populates="batch", cascade="all, delete-orphan"
    )
    assessments: Mapped[list["FreshnessAssessment"]] = relationship(
        back_populates="batch", cascade="all, delete-orphan"
    )
    shelf_life_predictions: Mapped[list["ShelfLifePrediction"]] = relationship(
        back_populates="batch", cascade="all, delete-orphan"
    )
    storage_conditions: Mapped[list["StorageCondition"]] = relationship(
        back_populates="batch", cascade="all, delete-orphan"
    )
    storage_readings: Mapped[list["StorageReading"]] = relationship(
        back_populates="batch", cascade="all, delete-orphan"
    )
    recommendations: Mapped[list["Recommendation"]] = relationship(
        back_populates="batch", cascade="all, delete-orphan"
    )
    alerts: Mapped[list["Alert"]] = relationship(
        back_populates="batch", cascade="all, delete-orphan"
    )
    inventory_items: Mapped[list["InventoryItem"]] = relationship(
        back_populates="batch", cascade="all, delete-orphan"
    )


class InventoryItem(Base, IdMixin, TimestampMixin):
    """A user's holding of a batch (a consumer pantry item or a store stock line)."""

    __tablename__ = "inventory_items"
    __table_args__ = (
        Index("ix_inventory_items_owner_status", "owner_id", "status"),
        Index("ix_inventory_items_expiry", "expected_expiry_date"),
    )

    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    batch_id: Mapped[int] = mapped_column(
        ForeignKey("food_batches.id", ondelete="CASCADE"), nullable=False, index=True
    )

    quantity: Mapped[float] = mapped_column(Numeric(12, 3), default=0, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="kg", nullable=False)
    storage_location: Mapped[str | None] = mapped_column(String(160), index=True)
    purchase_date: Mapped[date | None] = mapped_column(Date)
    storage_date: Mapped[date | None] = mapped_column(Date)
    expected_expiry_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(
        String(24), default=InventoryStatus.FRESH.value, nullable=False, index=True
    )
    # FIFO/FEFO ordering value produced by the rotation service.
    rotation_priority: Mapped[float | None] = mapped_column(Float, index=True)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    discarded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    owner: Mapped["User"] = relationship(back_populates="inventory_items")
    batch: Mapped["FoodBatch"] = relationship(back_populates="inventory_items", lazy="joined")


class FoodImage(Base, IdMixin, TimestampMixin):
    """Metadata for an uploaded food image. Binary data lives in object storage."""

    __tablename__ = "food_images"
    __table_args__ = (
        Index("ix_food_images_batch_created", "batch_id", "created_at"),
    )

    batch_id: Mapped[int | None] = mapped_column(
        ForeignKey("food_batches.id", ondelete="CASCADE"), index=True
    )
    uploaded_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    # Backend-agnostic key (local relative path, S3 object key, ...).
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_backend: Mapped[str] = mapped_column(String(20), default="local", nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(80), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    checksum_sha256: Mapped[str | None] = mapped_column(String(64), index=True)
    # Optional visual-explanation overlay produced by the analysis engine.
    overlay_storage_key: Mapped[str | None] = mapped_column(String(500))
    caption: Mapped[str | None] = mapped_column(String(255))
    is_analyzed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    batch: Mapped["FoodBatch | None"] = relationship(back_populates="images")
    assessments: Mapped[list["FreshnessAssessment"]] = relationship(back_populates="image")
