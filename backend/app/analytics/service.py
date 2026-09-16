"""Analytics aggregation service.

All aggregation happens in SQL (GROUP BY / COUNT / AVG) rather than by loading
rows into Python, so the dashboards stay fast as data grows.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session

from app.core.enums import (
    AlertSeverity,
    ComplianceStatus,
    FreshnessCategory,
    InventoryStatus,
    RoleName,
)
from app.models import (
    Alert,
    FoodBatch,
    FoodCategory,
    FoodProduct,
    FreshnessAssessment,
    InventoryItem,
    Report,
    Role,
    ShelfLifePrediction,
    StorageReading,
    User,
)
from app.utils.dates import ensure_utc


# ------------------------------------------------------------------ helpers
def _day(column):
    """Truncate a timestamp to a day, portably across PostgreSQL and SQLite.

    `CAST(ts AS DATE)` is not portable: SQLite has no DATE type, so the cast
    lands on NUMERIC affinity and returns an integer year. `date()` exists in
    both dialects and returns an ISO day string on SQLite / a date on PostgreSQL.
    """
    return func.date(column)


def _batch_scope(owner_id: int | None):
    """Base filter for batches, optionally limited to one user's holdings."""
    conditions = [FoodBatch.is_archived.is_(False)]
    if owner_id is not None:
        conditions.append(
            FoodBatch.id.in_(
                select(InventoryItem.batch_id).where(InventoryItem.owner_id == owner_id)
            )
        )
    return and_(*conditions)


def _empty_distribution() -> dict[str, int]:
    return {c.value: 0 for c in FreshnessCategory}


# --------------------------------------------------------- core aggregations
def freshness_distribution(db: Session, *, owner_id: int | None = None) -> dict[str, Any]:
    rows = db.execute(
        select(FoodBatch.current_freshness_category, func.count(FoodBatch.id))
        .where(_batch_scope(owner_id), FoodBatch.current_freshness_category.is_not(None))
        .group_by(FoodBatch.current_freshness_category)
    ).all()

    distribution = _empty_distribution()
    for category, count in rows:
        distribution[str(category)] = int(count)

    unassessed = int(
        db.scalar(
            select(func.count(FoodBatch.id)).where(
                _batch_scope(owner_id), FoodBatch.current_freshness_category.is_(None)
            )
        )
        or 0
    )
    total = sum(distribution.values())
    return {
        "distribution": distribution,
        "items": [
            {
                "category": key,
                "count": value,
                "percentage": round(value / total * 100, 1) if total else 0.0,
            }
            for key, value in distribution.items()
        ],
        "total_assessed": total,
        "unassessed": unassessed,
    }


def average_freshness_over_time(
    db: Session, *, days: int = 30, owner_id: int | None = None
) -> dict[str, Any]:
    since = datetime.now(UTC) - timedelta(days=max(1, days))
    day = _day(FreshnessAssessment.created_at)

    stmt = (
        select(
            day.label("day"),
            func.avg(FreshnessAssessment.freshness_score),
            func.min(FreshnessAssessment.freshness_score),
            func.max(FreshnessAssessment.freshness_score),
            func.count(FreshnessAssessment.id),
        )
        .where(FreshnessAssessment.created_at >= since)
        .group_by(day)
        .order_by(day)
    )
    if owner_id is not None:
        stmt = stmt.where(
            FreshnessAssessment.batch_id.in_(
                select(InventoryItem.batch_id).where(InventoryItem.owner_id == owner_id)
            )
        )

    rows = db.execute(stmt).all()
    return {
        "days": days,
        "points": [
            {
                "date": str(d),
                "average_score": round(float(avg), 1) if avg is not None else None,
                "min_score": round(float(mn), 1) if mn is not None else None,
                "max_score": round(float(mx), 1) if mx is not None else None,
                "assessment_count": int(count),
            }
            for d, avg, mn, mx, count in rows
        ],
    }


def spoilage_metrics(db: Session, *, owner_id: int | None = None) -> dict[str, Any]:
    scope = _batch_scope(owner_id)
    total = int(db.scalar(select(func.count(FoodBatch.id)).where(scope)) or 0)

    def count_status(*statuses: str) -> int:
        return int(
            db.scalar(
                select(func.count(FoodBatch.id)).where(scope, FoodBatch.status.in_(statuses))
            )
            or 0
        )

    spoiled = count_status(InventoryStatus.SPOILED.value)
    expired = count_status(InventoryStatus.EXPIRED.value)
    near = count_status(InventoryStatus.NEAR_SPOILAGE.value)
    fresh = count_status(InventoryStatus.FRESH.value, InventoryStatus.GOOD.value)

    avg_spoilage = db.scalar(
        select(func.avg(FreshnessAssessment.spoilage_probability)).where(
            FreshnessAssessment.spoilage_probability.is_not(None)
        )
    )

    return {
        "total_batches": total,
        "spoiled_count": spoiled,
        "expired_count": expired,
        "near_spoilage_count": near,
        "healthy_count": fresh,
        "spoilage_rate_pct": round((spoiled + expired) / total * 100, 1) if total else 0.0,
        "at_risk_rate_pct": round((spoiled + expired + near) / total * 100, 1) if total else 0.0,
        "average_spoilage_probability": round(float(avg_spoilage), 4) if avg_spoilage else 0.0,
    }


def shelf_life_distribution(db: Session, *, owner_id: int | None = None) -> dict[str, Any]:
    """Bucketed remaining shelf life across active batches."""
    buckets = [
        ("expired", None, 0.0),
        ("0-1 days", 0.0, 1.0),
        ("1-3 days", 1.0, 3.0),
        ("3-7 days", 3.0, 7.0),
        ("7-14 days", 7.0, 14.0),
        ("14+ days", 14.0, None),
    ]
    scope = _batch_scope(owner_id)
    results: list[dict[str, Any]] = []
    for label, low, high in buckets:
        conditions = [scope, FoodBatch.remaining_shelf_life_days.is_not(None)]
        if label == "expired":
            conditions.append(FoodBatch.remaining_shelf_life_days <= 0)
        else:
            if low is not None:
                conditions.append(FoodBatch.remaining_shelf_life_days > low)
            if high is not None:
                conditions.append(FoodBatch.remaining_shelf_life_days <= high)
        count = int(db.scalar(select(func.count(FoodBatch.id)).where(*conditions)) or 0)
        results.append({"bucket": label, "count": count})

    avg_remaining = db.scalar(
        select(func.avg(FoodBatch.remaining_shelf_life_days)).where(
            scope, FoodBatch.remaining_shelf_life_days.is_not(None)
        )
    )
    return {
        "buckets": results,
        "average_remaining_days": round(float(avg_remaining), 2) if avg_remaining else None,
    }


def category_quality(db: Session, *, owner_id: int | None = None) -> list[dict[str, Any]]:
    """Per-category batch count, average freshness and at-risk share."""
    scope = _batch_scope(owner_id)
    rows = db.execute(
        select(
            FoodCategory.slug,
            FoodCategory.name,
            func.count(FoodBatch.id),
            func.avg(FoodBatch.current_freshness_score),
            func.sum(
                case(
                    (
                        FoodBatch.status.in_(
                            [
                                InventoryStatus.NEAR_SPOILAGE.value,
                                InventoryStatus.SPOILED.value,
                                InventoryStatus.EXPIRED.value,
                            ]
                        ),
                        1,
                    ),
                    else_=0,
                )
            ),
            func.sum(FoodBatch.quantity),
        )
        .join(FoodProduct, FoodProduct.category_id == FoodCategory.id)
        .join(FoodBatch, FoodBatch.product_id == FoodProduct.id)
        .where(scope)
        .group_by(FoodCategory.slug, FoodCategory.name)
        .order_by(func.count(FoodBatch.id).desc())
    ).all()

    return [
        {
            "category_slug": slug,
            "category_name": name,
            "batch_count": int(count),
            "average_freshness_score": round(float(avg), 1) if avg is not None else None,
            "at_risk_count": int(at_risk or 0),
            "at_risk_pct": round(int(at_risk or 0) / int(count) * 100, 1) if count else 0.0,
            "total_quantity": round(float(quantity or 0), 2),
        }
        for slug, name, count, avg, at_risk, quantity in rows
    ]


def inventory_health(db: Session, *, owner_id: int | None = None) -> dict[str, Any]:
    scope = _batch_scope(owner_id)
    status_rows = db.execute(
        select(FoodBatch.status, func.count(FoodBatch.id)).where(scope).group_by(FoodBatch.status)
    ).all()
    status_counts = {s.value: 0 for s in InventoryStatus}
    for status, count in status_rows:
        status_counts[str(status)] = int(count)

    total = sum(status_counts.values())
    avg_score = db.scalar(
        select(func.avg(FoodBatch.current_freshness_score)).where(
            scope, FoodBatch.current_freshness_score.is_not(None)
        )
    )
    total_quantity = db.scalar(select(func.sum(FoodBatch.quantity)).where(scope))

    today = date.today()
    expiring_soon = int(
        db.scalar(
            select(func.count(FoodBatch.id)).where(
                scope,
                FoodBatch.expected_expiry_date.is_not(None),
                FoodBatch.expected_expiry_date >= today,
                FoodBatch.expected_expiry_date <= today + timedelta(days=3),
            )
        )
        or 0
    )
    expired = int(
        db.scalar(
            select(func.count(FoodBatch.id)).where(
                scope,
                FoodBatch.expected_expiry_date.is_not(None),
                FoodBatch.expected_expiry_date < today,
            )
        )
        or 0
    )

    # Health index: share of batches in a positive state.
    healthy = (
        status_counts[InventoryStatus.FRESH.value]
        + status_counts[InventoryStatus.GOOD.value]
        + status_counts[InventoryStatus.ACCEPTABLE.value] * 0.6
    )
    return {
        "total_batches": total,
        "status_counts": status_counts,
        "average_freshness_score": round(float(avg_score), 1) if avg_score else None,
        "total_quantity": round(float(total_quantity or 0), 2),
        "expiring_soon_count": expiring_soon,
        "expired_count": expired,
        "health_index": round(healthy / total * 100, 1) if total else None,
    }


def waste_risk(db: Session, *, owner_id: int | None = None) -> dict[str, Any]:
    """Quantity and estimated value at risk, plus the top contributing batches."""
    scope = _batch_scope(owner_id)
    at_risk_condition = or_(
        FoodBatch.status.in_(
            [
                InventoryStatus.NEAR_SPOILAGE.value,
                InventoryStatus.SPOILED.value,
                InventoryStatus.EXPIRED.value,
            ]
        ),
        and_(
            FoodBatch.remaining_shelf_life_days.is_not(None),
            FoodBatch.remaining_shelf_life_days <= 2,
        ),
    )

    at_risk_quantity = db.scalar(
        select(func.sum(FoodBatch.quantity)).where(scope, at_risk_condition)
    )
    at_risk_value = db.scalar(
        select(func.sum(FoodBatch.quantity * FoodBatch.cost_per_unit)).where(
            scope, at_risk_condition, FoodBatch.cost_per_unit.is_not(None)
        )
    )
    total_quantity = db.scalar(select(func.sum(FoodBatch.quantity)).where(scope))
    total_value = db.scalar(
        select(func.sum(FoodBatch.quantity * FoodBatch.cost_per_unit)).where(
            scope, FoodBatch.cost_per_unit.is_not(None)
        )
    )

    top_rows = db.execute(
        select(
            FoodBatch.id,
            FoodBatch.batch_number,
            FoodProduct.name,
            FoodBatch.quantity,
            FoodBatch.unit,
            FoodBatch.cost_per_unit,
            FoodBatch.remaining_shelf_life_days,
            FoodBatch.status,
            FoodBatch.expected_expiry_date,
        )
        .join(FoodProduct, FoodProduct.id == FoodBatch.product_id)
        .where(scope, at_risk_condition)
        .order_by((FoodBatch.quantity * func.coalesce(FoodBatch.cost_per_unit, 1)).desc())
        .limit(10)
    ).all()

    return {
        "at_risk_quantity": round(float(at_risk_quantity or 0), 2),
        "total_quantity": round(float(total_quantity or 0), 2),
        "at_risk_value": round(float(at_risk_value or 0), 2),
        "total_value": round(float(total_value or 0), 2),
        "at_risk_share_pct": (
            round(float(at_risk_quantity or 0) / float(total_quantity) * 100, 1)
            if total_quantity
            else 0.0
        ),
        "top_at_risk": [
            {
                "batch_id": bid,
                "batch_number": number,
                "product_name": name,
                "quantity": round(float(quantity or 0), 2),
                "unit": unit,
                "estimated_value": (
                    round(float(quantity or 0) * float(cost), 2) if cost is not None else None
                ),
                "remaining_shelf_life_days": remaining,
                "status": status,
                "expiry_date": expiry,
            }
            for bid, number, name, quantity, unit, cost, remaining, status, expiry in top_rows
        ],
        "note": (
            "Estimated value uses the recorded cost per unit; batches without a cost "
            "are counted in quantity only."
        ),
    }


def alert_trends(db: Session, *, days: int = 30) -> dict[str, Any]:
    since = datetime.now(UTC) - timedelta(days=max(1, days))
    day = _day(Alert.created_at)

    daily = db.execute(
        select(day.label("day"), func.count(Alert.id))
        .where(Alert.created_at >= since)
        .group_by(day)
        .order_by(day)
    ).all()

    by_type = db.execute(
        select(Alert.alert_type, func.count(Alert.id))
        .where(Alert.created_at >= since)
        .group_by(Alert.alert_type)
        .order_by(func.count(Alert.id).desc())
    ).all()

    by_severity = db.execute(
        select(Alert.severity, func.count(Alert.id))
        .where(Alert.created_at >= since)
        .group_by(Alert.severity)
    ).all()

    open_count = int(
        db.scalar(select(func.count(Alert.id)).where(Alert.resolved.is_(False))) or 0
    )
    critical_open = int(
        db.scalar(
            select(func.count(Alert.id)).where(
                Alert.resolved.is_(False),
                Alert.severity.in_([AlertSeverity.CRITICAL.value, AlertSeverity.HIGH.value]),
            )
        )
        or 0
    )

    severity_counts = {s.value: 0 for s in AlertSeverity}
    for severity, count in by_severity:
        severity_counts[str(severity)] = int(count)

    return {
        "days": days,
        "points": [{"date": str(d), "count": int(c)} for d, c in daily],
        "by_type": [{"alert_type": t, "count": int(c)} for t, c in by_type],
        "by_severity": severity_counts,
        "open_count": open_count,
        "critical_open_count": critical_open,
    }


def storage_compliance_summary(db: Session) -> dict[str, Any]:
    from app.storage.service import compliance_overview

    overview = compliance_overview(db)
    since = datetime.now(UTC) - timedelta(days=14)
    total_readings = int(
        db.scalar(select(func.count(StorageReading.id)).where(StorageReading.recorded_at >= since))
        or 0
    )
    violations = int(
        db.scalar(
            select(func.count(StorageReading.id)).where(
                StorageReading.recorded_at >= since, StorageReading.is_violation.is_(True)
            )
        )
        or 0
    )
    return {
        **overview,
        "readings_last_14_days": total_readings,
        "violations_last_14_days": violations,
        "reading_compliance_pct": (
            round((1 - violations / total_readings) * 100, 1) if total_readings else None
        ),
    }


def environment_trends(db: Session, *, days: int = 14) -> dict[str, Any]:
    since = datetime.now(UTC) - timedelta(days=max(1, days))
    day = _day(StorageReading.recorded_at)
    rows = db.execute(
        select(
            day.label("day"),
            func.avg(StorageReading.temperature_c),
            func.min(StorageReading.temperature_c),
            func.max(StorageReading.temperature_c),
            func.avg(StorageReading.humidity_pct),
            func.count(StorageReading.id),
        )
        .where(StorageReading.recorded_at >= since)
        .group_by(day)
        .order_by(day)
    ).all()
    return {
        "days": days,
        "points": [
            {
                "date": str(d),
                "avg_temperature_c": round(float(avg_t), 2) if avg_t is not None else None,
                "min_temperature_c": round(float(min_t), 2) if min_t is not None else None,
                "max_temperature_c": round(float(max_t), 2) if max_t is not None else None,
                "avg_humidity_pct": round(float(avg_h), 1) if avg_h is not None else None,
                "reading_count": int(count),
            }
            for d, avg_t, min_t, max_t, avg_h, count in rows
        ],
    }


def recent_assessments(db: Session, *, limit: int = 10, owner_id: int | None = None) -> list[dict[str, Any]]:
    stmt = (
        select(
            FreshnessAssessment.id,
            FreshnessAssessment.batch_id,
            FoodBatch.batch_number,
            FoodProduct.name,
            FreshnessAssessment.freshness_score,
            FreshnessAssessment.freshness_category,
            FreshnessAssessment.confidence,
            FreshnessAssessment.spoilage_probability,
            FreshnessAssessment.is_demo,
            FreshnessAssessment.created_at,
        )
        .join(FoodBatch, FoodBatch.id == FreshnessAssessment.batch_id)
        .join(FoodProduct, FoodProduct.id == FoodBatch.product_id)
        .order_by(FreshnessAssessment.created_at.desc())
        .limit(limit)
    )
    if owner_id is not None:
        stmt = stmt.where(
            FreshnessAssessment.batch_id.in_(
                select(InventoryItem.batch_id).where(InventoryItem.owner_id == owner_id)
            )
        )
    rows = db.execute(stmt).all()
    return [
        {
            "assessment_id": aid,
            "batch_id": bid,
            "batch_number": number,
            "product_name": name,
            "freshness_score": round(float(score), 1),
            "freshness_category": category,
            "confidence": round(float(confidence), 3) if confidence is not None else None,
            "spoilage_probability": round(float(spoilage), 3) if spoilage is not None else None,
            "is_demo": bool(is_demo),
            "created_at": created,
        }
        for aid, bid, number, name, score, category, confidence, spoilage, is_demo, created in rows
    ]


def upcoming_expiries(
    db: Session, *, days: int = 7, limit: int = 10, owner_id: int | None = None
) -> list[dict[str, Any]]:
    today = date.today()
    stmt = (
        select(
            FoodBatch.id,
            FoodBatch.batch_number,
            FoodProduct.name,
            FoodCategory.slug,
            FoodBatch.quantity,
            FoodBatch.unit,
            FoodBatch.expected_expiry_date,
            FoodBatch.current_freshness_score,
            FoodBatch.current_freshness_category,
            FoodBatch.storage_location,
        )
        .join(FoodProduct, FoodProduct.id == FoodBatch.product_id)
        .join(FoodCategory, FoodCategory.id == FoodProduct.category_id)
        .where(
            _batch_scope(owner_id),
            FoodBatch.expected_expiry_date.is_not(None),
            FoodBatch.expected_expiry_date <= today + timedelta(days=days),
        )
        .order_by(FoodBatch.expected_expiry_date.asc())
        .limit(limit)
    )
    rows = db.execute(stmt).all()
    return [
        {
            "batch_id": bid,
            "batch_number": number,
            "product_name": name,
            "category_slug": slug,
            "quantity": round(float(quantity or 0), 2),
            "unit": unit,
            "expiry_date": expiry,
            "days_until_expiry": (expiry - today).days if expiry else None,
            "freshness_score": score,
            "freshness_category": category,
            "storage_location": location,
        }
        for bid, number, name, slug, quantity, unit, expiry, score, category, location in rows
    ]


# ----------------------------------------------------------- role dashboards
def dashboard(db: Session, user: User) -> dict[str, Any]:
    """Role-aware dashboard payload."""
    role = user.role_name
    owner_id = user.id if role == RoleName.CONSUMER.value else None

    common = {
        "role": role,
        "generated_at": datetime.now(UTC),
        "inventory_health": inventory_health(db, owner_id=owner_id),
        "freshness_distribution": freshness_distribution(db, owner_id=owner_id),
        "recent_assessments": recent_assessments(db, limit=8, owner_id=owner_id),
        "upcoming_expiries": upcoming_expiries(db, days=7, limit=8, owner_id=owner_id),
    }

    if role == RoleName.CONSUMER.value:
        from app.recommendations.rotation import build_rotation_plan

        common.update(
            {
                "my_recommendations": _top_recommendations(db, owner_id=user.id, limit=6),
                "rotation": build_rotation_plan(db, owner_id=user.id, limit=6),
                "open_alerts": _open_alerts(db, limit=6, owner_id=user.id),
            }
        )
    elif role == RoleName.RETAIL_MANAGER.value:
        common.update(
            {
                "spoilage": spoilage_metrics(db),
                "freshness_trend": average_freshness_over_time(db, days=30),
                "shelf_life_distribution": shelf_life_distribution(db),
                "category_quality": category_quality(db),
                "waste_risk": waste_risk(db),
                "alerts": alert_trends(db, days=30),
                "open_alerts": _open_alerts(db, limit=8),
            }
        )
    elif role == RoleName.WAREHOUSE_OPERATOR.value:
        common.update(
            {
                "storage_compliance": storage_compliance_summary(db),
                "environment_trends": environment_trends(db, days=14),
                "locations": _location_summary(db),
                "alerts": alert_trends(db, days=14),
                "open_alerts": _open_alerts(db, limit=8),
            }
        )
    elif role == RoleName.QUALITY_INSPECTOR.value:
        common.update(
            {
                "inspection_queue": inspection_queue(db, limit=10),
                "indicator_summary": indicator_summary(db),
                "spoilage": spoilage_metrics(db),
                "freshness_trend": average_freshness_over_time(db, days=30),
                "open_alerts": _open_alerts(db, limit=8),
            }
        )
    elif role == RoleName.ADMIN.value:
        common.update(
            {
                "platform": platform_stats(db),
                "spoilage": spoilage_metrics(db),
                "freshness_trend": average_freshness_over_time(db, days=30),
                "storage_compliance": storage_compliance_summary(db),
                "alerts": alert_trends(db, days=30),
                "category_quality": category_quality(db),
                "open_alerts": _open_alerts(db, limit=8),
            }
        )
    return common


def _open_alerts(db: Session, *, limit: int = 8, owner_id: int | None = None) -> list[dict[str, Any]]:
    stmt = (
        select(Alert)
        .where(Alert.resolved.is_(False))
        .order_by(
            case(
                (Alert.severity == AlertSeverity.CRITICAL.value, 0),
                (Alert.severity == AlertSeverity.HIGH.value, 1),
                (Alert.severity == AlertSeverity.MEDIUM.value, 2),
                (Alert.severity == AlertSeverity.LOW.value, 3),
                else_=4,
            ),
            Alert.created_at.desc(),
        )
        .limit(limit)
    )
    if owner_id is not None:
        stmt = stmt.where(
            or_(
                Alert.batch_id.is_(None),
                Alert.batch_id.in_(
                    select(InventoryItem.batch_id).where(InventoryItem.owner_id == owner_id)
                ),
            )
        )
    rows = list(db.scalars(stmt).unique().all())
    return [
        {
            "id": a.id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "message": a.message,
            "batch_id": a.batch_id,
            "is_read": a.is_read,
            "created_at": a.created_at,
        }
        for a in rows
    ]


def _top_recommendations(
    db: Session, *, owner_id: int | None = None, limit: int = 6
) -> list[dict[str, Any]]:
    from app.models import Recommendation

    stmt = (
        select(Recommendation)
        .where(Recommendation.is_active.is_(True), Recommendation.acknowledged.is_(False))
        .order_by(
            case(
                (Recommendation.priority == "URGENT", 0),
                (Recommendation.priority == "HIGH", 1),
                (Recommendation.priority == "MEDIUM", 2),
                else_=3,
            ),
            Recommendation.created_at.desc(),
        )
        .limit(limit)
    )
    if owner_id is not None:
        stmt = stmt.where(
            Recommendation.batch_id.in_(
                select(InventoryItem.batch_id).where(InventoryItem.owner_id == owner_id)
            )
        )
    rows = list(db.scalars(stmt).unique().all())
    from app.recommendations.engine import serialise_recommendation

    return [serialise_recommendation(r) for r in rows]


def _location_summary(db: Session) -> list[dict[str, Any]]:
    from app.storage.service import locations

    return locations(db)


def inspection_queue(db: Session, *, limit: int = 20) -> list[dict[str, Any]]:
    """Batches most in need of a quality inspection.

    Ranked by: never assessed > low score > high spoilage probability > stale
    assessment.
    """
    today = date.today()
    stale_cutoff = datetime.now(UTC) - timedelta(days=3)

    rows = db.execute(
        select(
            FoodBatch.id,
            FoodBatch.batch_number,
            FoodProduct.name,
            FoodCategory.slug,
            FoodBatch.current_freshness_score,
            FoodBatch.current_freshness_category,
            FoodBatch.last_assessed_at,
            FoodBatch.expected_expiry_date,
            FoodBatch.quantity,
            FoodBatch.unit,
            FoodBatch.storage_location,
        )
        .join(FoodProduct, FoodProduct.id == FoodBatch.product_id)
        .join(FoodCategory, FoodCategory.id == FoodProduct.category_id)
        .where(FoodBatch.is_archived.is_(False))
        .order_by(
            case((FoodBatch.last_assessed_at.is_(None), 0), else_=1),
            func.coalesce(FoodBatch.current_freshness_score, 0).asc(),
            FoodBatch.expected_expiry_date.asc().nulls_last(),
        )
        .limit(limit)
    ).all()

    queue: list[dict[str, Any]] = []
    for (
        bid, number, name, slug, score, category, last_assessed, expiry, quantity, unit, location
    ) in rows:
        reasons: list[str] = []
        # SQLite returns naive datetimes; normalise before comparing.
        last_assessed_utc = ensure_utc(last_assessed)
        if last_assessed_utc is None:
            reasons.append("never assessed")
        elif last_assessed_utc < stale_cutoff:
            reasons.append("last assessed more than 3 days ago")
        if score is not None and float(score) < 60:
            reasons.append(f"low freshness score ({float(score):.0f}/100)")
        if expiry is not None and (expiry - today).days <= 2:
            reasons.append("expiring within 2 days")
        queue.append(
            {
                "batch_id": bid,
                "batch_number": number,
                "product_name": name,
                "category_slug": slug,
                "freshness_score": score,
                "freshness_category": category,
                "last_assessed_at": last_assessed,
                "expiry_date": expiry,
                "days_until_expiry": (expiry - today).days if expiry else None,
                "quantity": round(float(quantity or 0), 2),
                "unit": unit,
                "storage_location": location,
                "reasons": reasons or ["routine re-inspection"],
                "priority": (
                    "HIGH"
                    if last_assessed_utc is None
                    or (score is not None and float(score) < 60)
                    else "MEDIUM" if reasons else "LOW"
                ),
            }
        )
    return queue


def indicator_summary(db: Session, *, days: int = 30) -> list[dict[str, Any]]:
    """Which spoilage indicators are firing most often."""
    from app.models import SpoilageIndicator

    since = datetime.now(UTC) - timedelta(days=max(1, days))
    rows = db.execute(
        select(
            SpoilageIndicator.indicator_type,
            func.count(SpoilageIndicator.id),
            func.avg(SpoilageIndicator.confidence),
            func.avg(SpoilageIndicator.affected_area_ratio),
        )
        .where(SpoilageIndicator.detected.is_(True), SpoilageIndicator.created_at >= since)
        .group_by(SpoilageIndicator.indicator_type)
        .order_by(func.count(SpoilageIndicator.id).desc())
    ).all()
    return [
        {
            "indicator_type": indicator,
            "detection_count": int(count),
            "average_confidence": round(float(confidence), 3) if confidence else None,
            "average_affected_area": round(float(area), 4) if area else None,
        }
        for indicator, count, confidence, area in rows
    ]


def platform_stats(db: Session) -> dict[str, Any]:
    """Admin overview: users, volumes and model provenance."""
    from app.ml.registry import get_registry

    total_users = int(db.scalar(select(func.count(User.id))) or 0)
    active_users = int(
        db.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
    )
    role_rows = db.execute(
        select(Role.name, func.count(User.id))
        .join(User, User.role_id == Role.id, isouter=True)
        .group_by(Role.name)
    ).all()

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "inactive": total_users - active_users,
            "by_role": {str(name): int(count) for name, count in role_rows},
            "new_last_7_days": int(
                db.scalar(
                    select(func.count(User.id)).where(
                        User.created_at >= datetime.now(UTC) - timedelta(days=7)
                    )
                )
                or 0
            ),
        },
        "catalogue": {
            "categories": int(db.scalar(select(func.count(FoodCategory.id))) or 0),
            "products": int(db.scalar(select(func.count(FoodProduct.id))) or 0),
            "batches": int(db.scalar(select(func.count(FoodBatch.id))) or 0),
            "inventory_items": int(db.scalar(select(func.count(InventoryItem.id))) or 0),
        },
        "analysis": {
            "assessments": int(db.scalar(select(func.count(FreshnessAssessment.id))) or 0),
            "shelf_life_predictions": int(
                db.scalar(select(func.count(ShelfLifePrediction.id))) or 0
            ),
            "assessments_last_7_days": int(
                db.scalar(
                    select(func.count(FreshnessAssessment.id)).where(
                        FreshnessAssessment.created_at >= datetime.now(UTC) - timedelta(days=7)
                    )
                )
                or 0
            ),
            "average_processing_ms": round(
                float(db.scalar(select(func.avg(FreshnessAssessment.processing_ms))) or 0), 1
            ),
        },
        "reports_generated": int(db.scalar(select(func.count(Report.id))) or 0),
        "storage_readings": int(db.scalar(select(func.count(StorageReading.id))) or 0),
        "ml": get_registry().describe(),
    }


def full_analytics(db: Session, *, days: int = 30, owner_id: int | None = None) -> dict[str, Any]:
    """Every analytic in one payload (used by the analytics page)."""
    return {
        "generated_at": datetime.now(UTC),
        "window_days": days,
        "freshness_distribution": freshness_distribution(db, owner_id=owner_id),
        "average_freshness_over_time": average_freshness_over_time(db, days=days, owner_id=owner_id),
        "spoilage": spoilage_metrics(db, owner_id=owner_id),
        "shelf_life_distribution": shelf_life_distribution(db, owner_id=owner_id),
        "inventory_health": inventory_health(db, owner_id=owner_id),
        "category_quality": category_quality(db, owner_id=owner_id),
        "waste_risk": waste_risk(db, owner_id=owner_id),
        "storage_compliance": storage_compliance_summary(db),
        "environment_trends": environment_trends(db, days=min(days, 30)),
        "alert_trends": alert_trends(db, days=days),
        "indicator_summary": indicator_summary(db, days=days),
    }
