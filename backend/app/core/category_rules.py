"""Extensible food-category profiles.

Every category-specific behaviour in the platform (storage compliance ranges,
baseline shelf life, sensitivity to temperature abuse, expected colour palette)
is declared here **once** as data, instead of being scattered as `if category
== "DAIRY"` branches through the codebase.

IMPORTANT / HONESTY NOTE
------------------------
The numbers below are *reasonable engineering defaults* gathered from common
food-handling guidance. They are **not** medically, scientifically or legally
authoritative and must be reviewed by a qualified food-safety professional
before any real-world use. Every value is overridable at runtime:

* per deployment  -> `storage_conditions` / category rows in the database
* per batch       -> the batch's own `StorageCondition` record
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any

from app.core.enums import AirCirculation, LightExposure, PackagingType


@dataclass(frozen=True)
class StorageRule:
    """Recommended storage envelope for a category."""

    temp_min_c: float
    temp_max_c: float
    humidity_min_pct: float
    humidity_max_pct: float
    recommended_circulation: AirCirculation = AirCirculation.GOOD
    max_light_exposure: LightExposure = LightExposure.LOW
    # How strongly a 1 degree C deviation degrades shelf life (multiplier/degree).
    temp_sensitivity: float = 0.08
    humidity_sensitivity: float = 0.02
    notes: str = ""

    def as_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["recommended_circulation"] = str(self.recommended_circulation)
        data["max_light_exposure"] = str(self.max_light_exposure)
        return data


@dataclass(frozen=True)
class CategoryProfile:
    """Everything the platform needs to know about a food category."""

    slug: str
    name: str
    description: str
    icon: str
    storage_rule: StorageRule
    # Baseline shelf life in days at the *ideal* storage temperature.
    baseline_shelf_life_days: float
    # Highly perishable categories get more aggressive alerting.
    perishability: float  # 0..1, 1 == extremely perishable
    # Packaging types that extend shelf life, and by what multiplier.
    packaging_multipliers: dict[str, float] = field(default_factory=dict)
    # Spoilage indicators that matter most for this category.
    key_indicators: tuple[str, ...] = ()
    default_unit: str = "kg"

    def as_dict(self) -> dict[str, Any]:
        return {
            "slug": self.slug,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "storage_rule": self.storage_rule.as_dict(),
            "baseline_shelf_life_days": self.baseline_shelf_life_days,
            "perishability": self.perishability,
            "packaging_multipliers": self.packaging_multipliers,
            "key_indicators": list(self.key_indicators),
            "default_unit": self.default_unit,
        }


# Multipliers reused across categories.
_COMMON_PACKAGING: dict[str, float] = {
    PackagingType.NONE.value: 0.85,
    PackagingType.LOOSE.value: 0.9,
    PackagingType.PAPER.value: 1.0,
    PackagingType.PLASTIC_WRAP.value: 1.1,
    PackagingType.PLASTIC_CONTAINER.value: 1.15,
    PackagingType.VACUUM_SEALED.value: 1.6,
    PackagingType.MODIFIED_ATMOSPHERE.value: 1.8,
    PackagingType.CANNED.value: 4.0,
    PackagingType.GLASS_JAR.value: 1.5,
    PackagingType.TETRA_PACK.value: 2.2,
}


CATEGORY_PROFILES: dict[str, CategoryProfile] = {
    "FRUITS": CategoryProfile(
        slug="FRUITS",
        name="Fruits",
        description="Fresh whole and cut fruit.",
        icon="apple",
        storage_rule=StorageRule(
            temp_min_c=2.0, temp_max_c=8.0,
            humidity_min_pct=85.0, humidity_max_pct=95.0,
            recommended_circulation=AirCirculation.MODERATE,
            temp_sensitivity=0.07, humidity_sensitivity=0.015,
            notes="Most fruit keeps best cold and humid; some tropical fruit prefers 10-13 C.",
        ),
        baseline_shelf_life_days=7.0,
        perishability=0.7,
        packaging_multipliers=_COMMON_PACKAGING,
        key_indicators=("BRUISING", "MOLD", "COLOR_DEGRADATION", "SURFACE_DEGRADATION"),
        default_unit="kg",
    ),
    "VEGETABLES": CategoryProfile(
        slug="VEGETABLES",
        name="Vegetables",
        description="Leafy greens, roots and other fresh produce.",
        icon="carrot",
        storage_rule=StorageRule(
            temp_min_c=1.0, temp_max_c=7.0,
            humidity_min_pct=88.0, humidity_max_pct=98.0,
            recommended_circulation=AirCirculation.MODERATE,
            temp_sensitivity=0.07, humidity_sensitivity=0.02,
            notes="Leafy greens wilt quickly below 85% relative humidity.",
        ),
        baseline_shelf_life_days=8.0,
        perishability=0.68,
        packaging_multipliers=_COMMON_PACKAGING,
        key_indicators=("DISCOLORATION", "MOLD", "DRYNESS", "SURFACE_DEGRADATION"),
        default_unit="kg",
    ),
    "DAIRY": CategoryProfile(
        slug="DAIRY",
        name="Dairy Products",
        description="Milk, yoghurt, cheese, butter and cream.",
        icon="milk",
        storage_rule=StorageRule(
            temp_min_c=1.0, temp_max_c=4.0,
            humidity_min_pct=50.0, humidity_max_pct=80.0,
            recommended_circulation=AirCirculation.GOOD,
            max_light_exposure=LightExposure.DARK,
            temp_sensitivity=0.14, humidity_sensitivity=0.01,
            notes="Cold chain critical. Temperature excursions are cumulative.",
        ),
        baseline_shelf_life_days=10.0,
        perishability=0.85,
        packaging_multipliers=_COMMON_PACKAGING,
        key_indicators=("MOLD", "DISCOLORATION", "WETNESS"),
        default_unit="l",
    ),
    "MEAT_POULTRY": CategoryProfile(
        slug="MEAT_POULTRY",
        name="Meat & Poultry",
        description="Red meat, poultry and processed meat products.",
        icon="drumstick",
        storage_rule=StorageRule(
            temp_min_c=-1.0, temp_max_c=4.0,
            humidity_min_pct=75.0, humidity_max_pct=90.0,
            recommended_circulation=AirCirculation.GOOD,
            max_light_exposure=LightExposure.DARK,
            temp_sensitivity=0.18, humidity_sensitivity=0.02,
            notes="Highest risk category. Keep at or below 4 C at all times.",
        ),
        baseline_shelf_life_days=4.0,
        perishability=0.95,
        packaging_multipliers=_COMMON_PACKAGING,
        key_indicators=("DISCOLORATION", "SURFACE_DEGRADATION", "WETNESS", "MOLD"),
        default_unit="kg",
    ),
    "SEAFOOD": CategoryProfile(
        slug="SEAFOOD",
        name="Seafood",
        description="Fish, shellfish and other seafood.",
        icon="fish",
        storage_rule=StorageRule(
            temp_min_c=-1.0, temp_max_c=2.0,
            humidity_min_pct=80.0, humidity_max_pct=95.0,
            recommended_circulation=AirCirculation.GOOD,
            max_light_exposure=LightExposure.DARK,
            temp_sensitivity=0.22, humidity_sensitivity=0.02,
            notes="Extremely perishable; ice or 0-2 C storage strongly recommended.",
        ),
        baseline_shelf_life_days=2.5,
        perishability=1.0,
        packaging_multipliers=_COMMON_PACKAGING,
        key_indicators=("DISCOLORATION", "SURFACE_DEGRADATION", "WETNESS"),
        default_unit="kg",
    ),
    "BAKERY": CategoryProfile(
        slug="BAKERY",
        name="Bakery Products",
        description="Bread, pastries, cakes and baked goods.",
        icon="croissant",
        storage_rule=StorageRule(
            temp_min_c=15.0, temp_max_c=25.0,
            humidity_min_pct=40.0, humidity_max_pct=65.0,
            recommended_circulation=AirCirculation.MODERATE,
            max_light_exposure=LightExposure.MODERATE,
            temp_sensitivity=0.05, humidity_sensitivity=0.035,
            notes="High humidity accelerates mould growth; refrigeration causes staling.",
        ),
        baseline_shelf_life_days=5.0,
        perishability=0.6,
        packaging_multipliers=_COMMON_PACKAGING,
        key_indicators=("MOLD", "DRYNESS", "TEXTURE_CHANGE"),
        default_unit="pcs",
    ),
    "PACKAGED": CategoryProfile(
        slug="PACKAGED",
        name="Packaged Foods",
        description="Shelf-stable packaged and processed foods.",
        icon="package",
        storage_rule=StorageRule(
            temp_min_c=5.0, temp_max_c=25.0,
            humidity_min_pct=30.0, humidity_max_pct=60.0,
            recommended_circulation=AirCirculation.MODERATE,
            max_light_exposure=LightExposure.MODERATE,
            temp_sensitivity=0.02, humidity_sensitivity=0.02,
            notes="Driven mostly by the printed best-before date and packaging integrity.",
        ),
        baseline_shelf_life_days=120.0,
        perishability=0.15,
        packaging_multipliers=_COMMON_PACKAGING,
        key_indicators=("PHYSICAL_DAMAGE", "WETNESS"),
        default_unit="pcs",
    ),
    "BEVERAGES": CategoryProfile(
        slug="BEVERAGES",
        name="Beverages",
        description="Juices, soft drinks, water and other drinks.",
        icon="cup",
        storage_rule=StorageRule(
            temp_min_c=2.0, temp_max_c=18.0,
            humidity_min_pct=30.0, humidity_max_pct=70.0,
            recommended_circulation=AirCirculation.MODERATE,
            max_light_exposure=LightExposure.LOW,
            temp_sensitivity=0.03, humidity_sensitivity=0.01,
            notes="Fresh juices behave like dairy; sealed drinks are shelf stable.",
        ),
        baseline_shelf_life_days=45.0,
        perishability=0.3,
        packaging_multipliers=_COMMON_PACKAGING,
        key_indicators=("DISCOLORATION", "PHYSICAL_DAMAGE"),
        default_unit="l",
    ),
}

# Fallback used when a product's category is unknown or user-created.
DEFAULT_PROFILE = CategoryProfile(
    slug="GENERIC",
    name="Generic Food",
    description="Fallback profile for uncategorised products.",
    icon="utensils",
    storage_rule=StorageRule(
        temp_min_c=2.0, temp_max_c=8.0,
        humidity_min_pct=40.0, humidity_max_pct=85.0,
        temp_sensitivity=0.07, humidity_sensitivity=0.02,
        notes="Conservative default envelope.",
    ),
    baseline_shelf_life_days=7.0,
    perishability=0.6,
    packaging_multipliers=_COMMON_PACKAGING,
    key_indicators=("MOLD", "DISCOLORATION", "SURFACE_DEGRADATION"),
)


def get_profile(slug: str | None) -> CategoryProfile:
    """Look up a category profile, falling back to a conservative default."""
    if not slug:
        return DEFAULT_PROFILE
    return CATEGORY_PROFILES.get(str(slug).strip().upper(), DEFAULT_PROFILE)


def all_profiles() -> list[CategoryProfile]:
    return list(CATEGORY_PROFILES.values())


def packaging_multiplier(slug: str | None, packaging: str | None) -> float:
    """Shelf-life multiplier for a packaging type within a category."""
    profile = get_profile(slug)
    if not packaging:
        return 1.0
    return profile.packaging_multipliers.get(str(packaging).upper(), 1.0)
