"""Food-category service.

Bridges the *code* profiles in `app.core.category_rules` with the *database*
rows in `food_categories`. Deployments can override any numeric default per
category without redeploying, while the code keeps a sensible fallback.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.core.category_rules import CategoryProfile, all_profiles, get_profile
from app.core.errors import ConflictError, NotFoundError
from app.models import FoodCategory
from app.repositories.food import CategoryRepository


def sync_categories(db: Session) -> list[FoodCategory]:
    """Create any missing category rows from the code profiles.

    Existing rows are left untouched apart from descriptive fields, so operator
    overrides to the numeric thresholds survive restarts.
    """
    repo = CategoryRepository(db)
    result: list[FoodCategory] = []
    for profile in all_profiles():
        row = repo.by_slug(profile.slug)
        rule = profile.storage_rule
        if row is None:
            row = FoodCategory(
                slug=profile.slug,
                name=profile.name,
                description=profile.description,
                icon=profile.icon,
                default_shelf_life_days=profile.baseline_shelf_life_days,
                ideal_temp_min_c=rule.temp_min_c,
                ideal_temp_max_c=rule.temp_max_c,
                ideal_humidity_min_pct=rule.humidity_min_pct,
                ideal_humidity_max_pct=rule.humidity_max_pct,
                perishability=profile.perishability,
                is_active=True,
            )
            db.add(row)
        else:
            row.name = profile.name
            row.description = profile.description
            row.icon = profile.icon
        result.append(row)
    db.flush()
    return result


def effective_rule(category: FoodCategory | None, profile: CategoryProfile | None = None) -> dict[str, Any]:
    """Merge DB overrides over the code defaults for a category."""
    prof = profile or get_profile(category.slug if category else None)
    rule = prof.storage_rule
    return {
        "temp_min_c": (category.ideal_temp_min_c if category and category.ideal_temp_min_c is not None else rule.temp_min_c),
        "temp_max_c": (category.ideal_temp_max_c if category and category.ideal_temp_max_c is not None else rule.temp_max_c),
        "humidity_min_pct": (
            category.ideal_humidity_min_pct
            if category and category.ideal_humidity_min_pct is not None
            else rule.humidity_min_pct
        ),
        "humidity_max_pct": (
            category.ideal_humidity_max_pct
            if category and category.ideal_humidity_max_pct is not None
            else rule.humidity_max_pct
        ),
        "recommended_circulation": str(rule.recommended_circulation),
        "max_light_exposure": str(rule.max_light_exposure),
        "temp_sensitivity": rule.temp_sensitivity,
        "humidity_sensitivity": rule.humidity_sensitivity,
        "notes": rule.notes,
    }


def base_shelf_life_days(category: FoodCategory | None, product_days: float | None = None) -> float:
    """Precedence: product override > category override > code default."""
    if product_days:
        return float(product_days)
    if category and category.default_shelf_life_days:
        return float(category.default_shelf_life_days)
    return float(get_profile(category.slug if category else None).baseline_shelf_life_days)


def serialise_category(category: FoodCategory, product_count: int = 0) -> dict[str, Any]:
    profile = get_profile(category.slug)
    rule = effective_rule(category, profile)
    return {
        "id": category.id,
        "slug": category.slug,
        "name": category.name,
        "description": category.description,
        "icon": category.icon,
        "default_shelf_life_days": base_shelf_life_days(category),
        "ideal_temp_min_c": rule["temp_min_c"],
        "ideal_temp_max_c": rule["temp_max_c"],
        "ideal_humidity_min_pct": rule["humidity_min_pct"],
        "ideal_humidity_max_pct": rule["humidity_max_pct"],
        "perishability": category.perishability if category.perishability is not None else profile.perishability,
        "is_active": category.is_active,
        "product_count": product_count,
        "storage_rule": {
            "temp_min_c": rule["temp_min_c"],
            "temp_max_c": rule["temp_max_c"],
            "humidity_min_pct": rule["humidity_min_pct"],
            "humidity_max_pct": rule["humidity_max_pct"],
            "recommended_circulation": rule["recommended_circulation"],
            "max_light_exposure": rule["max_light_exposure"],
            "notes": rule["notes"],
        },
        "key_indicators": list(profile.key_indicators),
    }


def resolve_category(
    db: Session, *, category_id: int | None = None, category_slug: str | None = None
) -> FoodCategory:
    repo = CategoryRepository(db)
    if category_id is not None:
        category = repo.get(category_id)
        if category is None:
            raise NotFoundError(f"Category {category_id} was not found.", code="CATEGORY_NOT_FOUND")
        return category
    if category_slug:
        category = repo.by_slug(category_slug)
        if category is None:
            raise NotFoundError(
                f"Category '{category_slug}' was not found.", code="CATEGORY_NOT_FOUND"
            )
        return category
    raise NotFoundError("A category must be specified.", code="CATEGORY_REQUIRED")


def create_category(db: Session, payload: dict[str, Any]) -> FoodCategory:
    repo = CategoryRepository(db)
    slug = str(payload["slug"]).upper()
    if repo.by_slug(slug):
        raise ConflictError(f"Category '{slug}' already exists.", code="CATEGORY_EXISTS")
    category = FoodCategory(**{**payload, "slug": slug})
    db.add(category)
    db.flush()
    return category
