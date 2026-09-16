"""Inventory rotation: FIFO and FEFO.

FIFO - First In,     First Out  -> ordered by arrival (storage/purchase date)
FEFO - First Expire, First Out  -> ordered by expiry risk

`rotation_priority` is a 0-100 score where **higher means pick sooner**. It is
persisted on `inventory_items` so lists can be sorted in SQL without recomputing.

Priority inputs (FEFO):
    * days until expiry            (dominant)
    * predicted remaining shelf life
    * current freshness score
    * category perishability
    * quantity at risk
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.category_rules import get_profile
from app.core.enums import RotationStrategy
from app.models import FoodBatch, FoodProduct, InventoryItem


def _days_until(target: date | None) -> int | None:
    return None if target is None else (target - date.today()).days


def compute_priority(
    *,
    strategy: RotationStrategy,
    days_until_expiry: int | None,
    remaining_shelf_life_days: float | None,
    freshness_score: float | None,
    perishability: float,
    quantity: float,
    age_days: float | None,
) -> tuple[float, str]:
    """Return `(priority 0-100, human-readable reason)`."""
    reasons: list[str] = []

    if strategy == RotationStrategy.FIFO:
        # Purely arrival-driven: the oldest stock scores highest.
        age = age_days if age_days is not None else 0.0
        priority = min(100.0, age * 6.0)
        reasons.append(f"in storage for {age:.0f} day(s)")
        if days_until_expiry is not None and days_until_expiry <= 2:
            priority = min(100.0, priority + 20.0)
            reasons.append(f"also expires in {days_until_expiry} day(s)")
        return round(priority, 2), "FIFO: " + "; ".join(reasons)

    # ---- FEFO ---------------------------------------------------------
    priority = 0.0

    if days_until_expiry is not None:
        if days_until_expiry < 0:
            priority += 60.0
            reasons.append(f"already {abs(days_until_expiry)} day(s) past its date")
        elif days_until_expiry == 0:
            priority += 55.0
            reasons.append("expires today")
        else:
            # 1 day -> ~48, 7 days -> ~21, 30 days -> ~8
            priority += 55.0 / (1.0 + days_until_expiry * 0.55)
            reasons.append(f"expires in {days_until_expiry} day(s)")
    else:
        priority += 12.0
        reasons.append("no expiry date recorded")

    if remaining_shelf_life_days is not None:
        remaining = max(0.0, float(remaining_shelf_life_days))
        priority += 25.0 / (1.0 + remaining * 0.7)
        reasons.append(f"{remaining:.1f} day(s) predicted shelf life")

    if freshness_score is not None:
        deficit = max(0.0, 100.0 - float(freshness_score))
        priority += min(15.0, deficit * 0.18)
        if freshness_score < 75:
            reasons.append(f"freshness {float(freshness_score):.0f}/100")

    priority += perishability * 6.0
    if perishability >= 0.85:
        reasons.append("highly perishable category")

    # Larger quantities are slightly prioritised: more value at risk.
    if quantity > 0:
        priority += min(6.0, quantity / 25.0)

    return round(min(100.0, priority), 2), "FEFO: " + "; ".join(reasons)


def default_strategy_for(category_slug: str | None) -> RotationStrategy:
    """Perishable categories default to FEFO; shelf-stable ones to FIFO."""
    return (
        RotationStrategy.FEFO
        if get_profile(category_slug).perishability >= 0.5
        else RotationStrategy.FIFO
    )


def build_rotation_plan(
    db: Session,
    *,
    strategy: RotationStrategy | str = RotationStrategy.FEFO,
    owner_id: int | None = None,
    storage_location: str | None = None,
    category_slug: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    """Ranked pick list: which batches should leave the shelf first."""
    chosen = (
        strategy
        if isinstance(strategy, RotationStrategy)
        else RotationStrategy.parse(strategy, RotationStrategy.FEFO)
    )

    stmt = (
        select(FoodBatch)
        .options(joinedload(FoodBatch.product).joinedload(FoodProduct.category))
        .where(FoodBatch.is_archived.is_(False), FoodBatch.quantity > 0)
    )
    if storage_location:
        stmt = stmt.where(FoodBatch.storage_location == storage_location)
    if owner_id is not None:
        stmt = stmt.where(
            FoodBatch.id.in_(
                select(InventoryItem.batch_id).where(
                    InventoryItem.owner_id == owner_id,
                    InventoryItem.consumed.is_(False),
                    InventoryItem.discarded.is_(False),
                )
            )
        )
    if category_slug:
        from app.models import FoodCategory

        stmt = stmt.where(
            FoodBatch.product_id.in_(
                select(FoodProduct.id)
                .join(FoodCategory)
                .where(FoodCategory.slug == str(category_slug).upper())
            )
        )

    batches = list(db.scalars(stmt).unique().all())
    from app.inventory.service import age_in_days

    rows: list[dict[str, Any]] = []
    for batch in batches:
        product = batch.product
        category = product.category if product else None
        profile = get_profile(category.slug if category else None)
        expiry = batch.expected_expiry_date or batch.predicted_expiry_date

        priority, reason = compute_priority(
            strategy=chosen,
            days_until_expiry=_days_until(expiry),
            remaining_shelf_life_days=batch.remaining_shelf_life_days,
            freshness_score=batch.current_freshness_score,
            perishability=profile.perishability,
            quantity=float(batch.quantity or 0),
            age_days=age_in_days(batch),
        )
        rows.append(
            {
                "batch_id": batch.id,
                "batch_number": batch.batch_number,
                "product_name": product.name if product else "-",
                "category_slug": category.slug if category else None,
                "quantity": float(batch.quantity or 0),
                "unit": batch.unit,
                "storage_location": batch.storage_location,
                "expiry_date": expiry,
                "days_until_expiry": _days_until(expiry),
                "freshness_score": batch.current_freshness_score,
                "freshness_category": batch.current_freshness_category,
                "remaining_shelf_life_days": batch.remaining_shelf_life_days,
                "rotation_priority": priority,
                "reason": reason,
            }
        )

    rows.sort(key=lambda r: -r["rotation_priority"])
    for index, row in enumerate(rows, start=1):
        row["rank"] = index

    return {
        "strategy": str(chosen),
        "generated_at": datetime.now(UTC),
        "total_batches": len(rows),
        "items": rows[:limit],
        "note": (
            "Higher rotation priority means the batch should be picked sooner. "
            "FEFO ranks by expiry risk; FIFO ranks by time in storage."
        ),
    }


def refresh_rotation_priorities(db: Session, *, owner_id: int | None = None) -> int:
    """Persist `rotation_priority` on inventory rows for SQL-side sorting."""
    stmt = (
        select(InventoryItem)
        .options(
            joinedload(InventoryItem.batch)
            .joinedload(FoodBatch.product)
            .joinedload(FoodProduct.category)
        )
        .where(InventoryItem.consumed.is_(False), InventoryItem.discarded.is_(False))
    )
    if owner_id is not None:
        stmt = stmt.where(InventoryItem.owner_id == owner_id)

    items = list(db.scalars(stmt).unique().all())
    from app.inventory.service import age_in_days

    for item in items:
        batch = item.batch
        if batch is None:
            continue
        category = batch.product.category if batch.product else None
        profile = get_profile(category.slug if category else None)
        strategy = default_strategy_for(category.slug if category else None)
        expiry = item.expected_expiry_date or batch.expected_expiry_date or batch.predicted_expiry_date
        priority, _ = compute_priority(
            strategy=strategy,
            days_until_expiry=_days_until(expiry),
            remaining_shelf_life_days=batch.remaining_shelf_life_days,
            freshness_score=batch.current_freshness_score,
            perishability=profile.perishability,
            quantity=float(item.quantity or 0),
            age_days=age_in_days(batch),
        )
        item.rotation_priority = priority
    db.flush()
    return len(items)
