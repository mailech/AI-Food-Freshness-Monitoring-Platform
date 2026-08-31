"""Dashboards & analytics (SRS Module 9).

Aggregates inventory, freshness, shelf-life, and storage-compliance
signals into role-aware dashboard views.
"""

from collections import Counter

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Assessment, StorageReading, User
from app.models.inventory import FoodItem
from app.models.user import UserRole
from app.routers.auth import get_current_user
from app.schemas.analytics import (
    HEALTH_BANDS,
    AdminStats,
    CategoryBreakdown,
    DashboardOut,
    ItemAlert,
    StorageComplianceSummary,
    WasteInsight,
)
from app.services.scoring import gather_item_state

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _alert(state: dict) -> ItemAlert:
    item = state["item"]
    composite = state["composite"]
    compliance = state.get("compliance")
    return ItemAlert(
        item_id=item.id,
        name=item.name,
        overall_score=composite.overall_score,
        health_category=composite.health_category,
        remaining_days=state["prediction"].remaining_days,
        compliant=compliance["compliant"] if compliance else None,
    )


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(
    expiring_within_days: int = Query(3, ge=0, le=60),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.query(FoodItem).filter(FoodItem.owner_id == user.id).all()
    states = [gather_item_state(db, item) for item in items]

    scores = [s["composite"].overall_score for s in states]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    health_dist: Counter = Counter(s["composite"].health_category for s in states)
    distribution = {band: health_dist.get(band, 0) for band in HEALTH_BANDS}

    by_cat: dict[str, list[float]] = {}
    for s in states:
        by_cat.setdefault(s["item"].category.name, []).append(s["composite"].overall_score)
    categories = sorted(
        (
            CategoryBreakdown(
                category=name,
                count=len(vals),
                avg_score=round(sum(vals) / len(vals), 1),
            )
            for name, vals in by_cat.items()
        ),
        key=lambda c: c.avg_score,
    )

    ranked = sorted(states, key=lambda s: s["prediction"].remaining_days)
    expiring_soon = [
        _alert(s) for s in ranked if s["prediction"].remaining_days <= expiring_within_days
    ]
    consume_first = [_alert(s) for s in sorted(states, key=lambda s: (s["composite"].overall_score, s["prediction"].remaining_days))[:5]]

    with_readings = [s for s in states if s["reading"] is not None]
    compliant_items = [s for s in with_readings if s["compliance"]["compliant"]]
    violation_counter: Counter = Counter()
    for s in with_readings:
        violation_counter.update(s["compliance"]["violations"])
    compliance_summary = StorageComplianceSummary(
        with_readings=len(with_readings),
        compliant_items=len(compliant_items),
        non_compliant_items=len(with_readings) - len(compliant_items),
        top_violations=[v for v, _ in violation_counter.most_common(5)],
    )

    at_risk = [s for s in states if s["composite"].health_category in ("Near Spoilage",) or s["prediction"].remaining_days <= 1]
    spoiled = [s for s in states if s["composite"].health_category == "Spoiled"]
    waste = WasteInsight(
        at_risk_items=len(at_risk),
        spoiled_items=len(spoiled),
        quantity_at_risk=round(sum(float(b.quantity) for s in at_risk for b in s["batches"]), 2),
    )

    admin_stats = None
    if user.role == UserRole.ADMIN:
        admin_stats = AdminStats(
            total_users=db.query(User).count(),
            total_items=db.query(FoodItem).count(),
            total_assessments=db.query(Assessment).count(),
            total_storage_readings=db.query(StorageReading).count(),
        )

    return DashboardOut(
        total_items=len(items),
        average_freshness_score=avg_score,
        health_distribution=distribution,
        categories=categories,
        expiring_soon=expiring_soon,
        consume_first=consume_first,
        storage_compliance=compliance_summary,
        waste_insights=waste,
        admin_stats=admin_stats,
    )
