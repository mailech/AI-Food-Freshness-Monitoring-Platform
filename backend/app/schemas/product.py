"""Food catalogue, batch, inventory and image schemas."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.enums import InventoryStatus, PackagingType
from app.schemas.common import ORMModel


# ------------------------------------------------------------- categories
class StorageRuleOut(BaseModel):
    temp_min_c: float
    temp_max_c: float
    humidity_min_pct: float
    humidity_max_pct: float
    recommended_circulation: str
    max_light_exposure: str
    notes: str | None = None


class CategoryOut(ORMModel):
    id: int
    slug: str
    name: str
    description: str | None = None
    icon: str | None = None
    default_shelf_life_days: float | None = None
    ideal_temp_min_c: float | None = None
    ideal_temp_max_c: float | None = None
    ideal_humidity_min_pct: float | None = None
    ideal_humidity_max_pct: float | None = None
    perishability: float | None = None
    is_active: bool = True
    product_count: int = 0
    storage_rule: StorageRuleOut | None = None
    key_indicators: list[str] = Field(default_factory=list)


class CategoryCreate(BaseModel):
    slug: str = Field(min_length=2, max_length=40)
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    icon: str | None = Field(default=None, max_length=60)
    default_shelf_life_days: float | None = Field(default=None, gt=0, le=3650)
    ideal_temp_min_c: float | None = Field(default=None, ge=-40, le=80)
    ideal_temp_max_c: float | None = Field(default=None, ge=-40, le=80)
    ideal_humidity_min_pct: float | None = Field(default=None, ge=0, le=100)
    ideal_humidity_max_pct: float | None = Field(default=None, ge=0, le=100)
    perishability: float | None = Field(default=None, ge=0, le=1)

    @field_validator("slug")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.strip().upper().replace(" ", "_").replace("-", "_")

    @model_validator(mode="after")
    def _check_ranges(self):
        if (
            self.ideal_temp_min_c is not None
            and self.ideal_temp_max_c is not None
            and self.ideal_temp_min_c > self.ideal_temp_max_c
        ):
            raise ValueError("ideal_temp_min_c cannot exceed ideal_temp_max_c")
        if (
            self.ideal_humidity_min_pct is not None
            and self.ideal_humidity_max_pct is not None
            and self.ideal_humidity_min_pct > self.ideal_humidity_max_pct
        ):
            raise ValueError("ideal_humidity_min_pct cannot exceed ideal_humidity_max_pct")
        return self


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    icon: str | None = Field(default=None, max_length=60)
    default_shelf_life_days: float | None = Field(default=None, gt=0, le=3650)
    ideal_temp_min_c: float | None = Field(default=None, ge=-40, le=80)
    ideal_temp_max_c: float | None = Field(default=None, ge=-40, le=80)
    ideal_humidity_min_pct: float | None = Field(default=None, ge=0, le=100)
    ideal_humidity_max_pct: float | None = Field(default=None, ge=0, le=100)
    perishability: float | None = Field(default=None, ge=0, le=1)
    is_active: bool | None = None


# ---------------------------------------------------------------- products
class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=180, examples=["Alphonso Mango"])
    sku: str | None = Field(default=None, max_length=64)
    brand: str | None = Field(default=None, max_length=120)
    description: str | None = None
    default_unit: str = Field(default="kg", max_length=20)
    shelf_life_days: float | None = Field(default=None, gt=0, le=3650)
    default_packaging: PackagingType | None = None
    storage_instructions: str | None = None


class ProductCreate(ProductBase):
    category_id: int | None = None
    category_slug: str | None = Field(
        default=None, description="Alternative to category_id, e.g. 'FRUITS'"
    )

    @model_validator(mode="after")
    def _require_category(self):
        if self.category_id is None and not self.category_slug:
            raise ValueError("either category_id or category_slug is required")
        return self


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=180)
    sku: str | None = Field(default=None, max_length=64)
    brand: str | None = Field(default=None, max_length=120)
    description: str | None = None
    category_id: int | None = None
    default_unit: str | None = Field(default=None, max_length=20)
    shelf_life_days: float | None = Field(default=None, gt=0, le=3650)
    default_packaging: PackagingType | None = None
    storage_instructions: str | None = None
    is_active: bool | None = None


class ProductOut(ORMModel):
    id: int
    name: str
    sku: str | None = None
    brand: str | None = None
    description: str | None = None
    category_id: int
    category: CategoryOut | None = None
    default_unit: str
    shelf_life_days: float | None = None
    default_packaging: str | None = None
    storage_instructions: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    batch_count: int = 0


# ----------------------------------------------------------------- batches
class BatchBase(BaseModel):
    quantity: float = Field(default=0, ge=0, le=1_000_000)
    unit: str | None = Field(default=None, max_length=20)
    production_date: date | None = None
    purchase_date: date | None = None
    storage_date: date | None = None
    expected_expiry_date: date | None = None
    packaging_type: PackagingType | None = None
    storage_location: str | None = Field(default=None, max_length=160)
    supplier: str | None = Field(default=None, max_length=160)
    cost_per_unit: float | None = Field(default=None, ge=0)
    notes: str | None = None


class BatchCreate(BatchBase):
    product_id: int
    batch_number: str | None = Field(
        default=None,
        max_length=64,
        description="Auto-generated when omitted (BTCH-YYYYMMDD-NNNN).",
    )
    # Optional initial environment; creates the batch's StorageCondition row.
    temperature_c: float | None = Field(default=None, ge=-40, le=80)
    humidity_pct: float | None = Field(default=None, ge=0, le=100)
    air_circulation: str | None = None
    light_exposure: str | None = None
    # Also place the batch into the caller's own inventory.
    add_to_my_inventory: bool = True

    @model_validator(mode="after")
    def _check_dates(self):
        if (
            self.production_date
            and self.expected_expiry_date
            and self.production_date > self.expected_expiry_date
        ):
            raise ValueError("production_date cannot be after expected_expiry_date")
        if self.purchase_date and self.storage_date and self.purchase_date > self.storage_date:
            raise ValueError("purchase_date cannot be after storage_date")
        return self


class BatchUpdate(BatchBase):
    status: InventoryStatus | None = None
    is_archived: bool | None = None


class BatchProductOut(BaseModel):
    """Slim product view embedded in batch responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    brand: str | None = None
    sku: str | None = None
    category_slug: str | None = None
    category_name: str | None = None
    default_unit: str | None = None


class BatchOut(ORMModel):
    id: int
    batch_number: str
    product_id: int
    product: BatchProductOut | None = None
    quantity: float
    unit: str
    production_date: date | None = None
    purchase_date: date | None = None
    storage_date: date | None = None
    expected_expiry_date: date | None = None
    predicted_expiry_date: date | None = None
    packaging_type: str | None = None
    storage_location: str | None = None
    supplier: str | None = None
    cost_per_unit: float | None = None
    status: str
    current_freshness_score: float | None = None
    current_freshness_category: str | None = None
    remaining_shelf_life_days: float | None = None
    last_assessed_at: datetime | None = None
    notes: str | None = None
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    # Derived, computed by the service layer.
    days_until_expiry: int | None = None
    age_days: float | None = None
    image_count: int = 0
    assessment_count: int = 0
    open_alert_count: int = 0

    @field_validator("quantity", "cost_per_unit", mode="before")
    @classmethod
    def _decimal_to_float(cls, v: Any) -> Any:
        return float(v) if v is not None else v


class BatchDetailOut(BatchOut):
    """Batch plus its latest analysis, storage snapshot and recommendations."""

    latest_assessment: dict[str, Any] | None = None
    latest_shelf_life: dict[str, Any] | None = None
    storage_condition: dict[str, Any] | None = None
    recommendations: list[dict[str, Any]] = Field(default_factory=list)
    images: list[dict[str, Any]] = Field(default_factory=list)


# --------------------------------------------------------------- inventory
class InventoryItemCreate(BaseModel):
    batch_id: int
    quantity: float = Field(ge=0, le=1_000_000)
    unit: str | None = Field(default=None, max_length=20)
    storage_location: str | None = Field(default=None, max_length=160)
    purchase_date: date | None = None
    storage_date: date | None = None
    expected_expiry_date: date | None = None
    notes: str | None = None


class InventoryItemUpdate(BaseModel):
    quantity: float | None = Field(default=None, ge=0, le=1_000_000)
    unit: str | None = Field(default=None, max_length=20)
    storage_location: str | None = Field(default=None, max_length=160)
    expected_expiry_date: date | None = None
    status: InventoryStatus | None = None
    consumed: bool | None = None
    discarded: bool | None = None
    notes: str | None = None


class InventoryItemOut(ORMModel):
    id: int
    owner_id: int
    batch_id: int
    quantity: float
    unit: str
    storage_location: str | None = None
    purchase_date: date | None = None
    storage_date: date | None = None
    expected_expiry_date: date | None = None
    status: str
    rotation_priority: float | None = None
    consumed: bool
    discarded: bool
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    batch: BatchOut | None = None
    days_until_expiry: int | None = None

    @field_validator("quantity", mode="before")
    @classmethod
    def _decimal_to_float(cls, v: Any) -> Any:
        return float(v) if v is not None else v


# ------------------------------------------------------------------ images
class ImageOut(ORMModel):
    id: int
    batch_id: int | None = None
    uploaded_by_id: int | None = None
    original_filename: str
    content_type: str
    size_bytes: int
    width: int | None = None
    height: int | None = None
    checksum_sha256: str | None = None
    caption: str | None = None
    is_analyzed: bool
    created_at: datetime
    url: str | None = None
    overlay_url: str | None = None


class ImageUploadResponse(BaseModel):
    image: ImageOut
    message: str = "Image uploaded successfully."


# ------------------------------------------------------------- bulk / misc
class BatchQuantityAdjust(BaseModel):
    delta: float = Field(description="Positive to add, negative to remove")
    reason: str | None = Field(default=None, max_length=200)


class RotationItemOut(BaseModel):
    batch_id: int
    batch_number: str
    product_name: str
    category_slug: str | None = None
    quantity: float
    unit: str
    storage_location: str | None = None
    expiry_date: date | None = None
    days_until_expiry: int | None = None
    freshness_score: float | None = None
    freshness_category: str | None = None
    remaining_shelf_life_days: float | None = None
    rotation_priority: float
    rank: int
    reason: str


class RotationPlanOut(BaseModel):
    strategy: str
    generated_at: datetime
    total_batches: int
    items: list[RotationItemOut]
    note: str
