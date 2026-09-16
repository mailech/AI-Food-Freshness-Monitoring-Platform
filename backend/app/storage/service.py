"""Storage condition monitoring, compliance evaluation and trend analysis.

Compliance rules come from `app.core.category_rules` (code defaults) overlaid
with any per-category database overrides, then any per-batch override. Nothing is
hard-coded at the call site.

DISCLAIMER: the recommended ranges are configurable engineering defaults, not
medically or legally authoritative limits. See `core/category_rules.py`.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.category_rules import get_profile
from app.core.enums import (
    AuditAction,
    ComplianceStatus,
    RiskLevel,
    SensorSource,
)
from app.core.errors import NotFoundError
from app.inventory.categories import effective_rule
from app.models import FoodBatch, StorageCondition, StorageReading, User
from app.services.audit import record_audit


# ------------------------------------------------------------------ helpers
def rule_for_batch(batch: FoodBatch) -> dict[str, Any]:
    """The effective storage envelope for a batch."""
    category = batch.product.category if batch.product else None
    return effective_rule(category)


def evaluate_compliance(
    *,
    temperature_c: float | None,
    humidity_pct: float | None,
    rule: dict[str, Any],
    air_circulation: str | None = None,
    light_exposure: str | None = None,
) -> dict[str, Any]:
    """Compare observed conditions against the required envelope.

    Returns compliance status, risk level, a per-parameter breakdown and a
    human-readable recommendation. A small tolerance band produces WARNING rather
    than NON_COMPLIANT so sensor jitter does not spam alerts.
    """
    temp_tol = settings.STORAGE_TEMP_TOLERANCE_C
    hum_tol = settings.STORAGE_HUMIDITY_TOLERANCE_PCT

    violations: list[dict[str, Any]] = []
    worst = ComplianceStatus.COMPLIANT
    recommendations: list[str] = []

    def escalate(status: ComplianceStatus) -> None:
        nonlocal worst
        order = {
            ComplianceStatus.COMPLIANT: 0,
            ComplianceStatus.WARNING: 1,
            ComplianceStatus.NON_COMPLIANT: 2,
        }
        if order.get(status, 0) > order.get(worst, 0):
            worst = status

    # ---- temperature -------------------------------------------------
    if temperature_c is None:
        violations.append(
            {
                "parameter": "temperature",
                "status": "UNKNOWN",
                "message": "No temperature reading recorded for this batch.",
            }
        )
        recommendations.append("Record the current storage temperature.")
    else:
        low, high = rule["temp_min_c"], rule["temp_max_c"]
        if temperature_c > high:
            excess = temperature_c - high
            status = ComplianceStatus.WARNING if excess <= temp_tol else ComplianceStatus.NON_COMPLIANT
            escalate(status)
            violations.append(
                {
                    "parameter": "temperature",
                    "status": str(status),
                    "current": round(temperature_c, 2),
                    "required_min": low,
                    "required_max": high,
                    "deviation": round(excess, 2),
                    "message": (
                        f"Temperature {temperature_c:.1f} C exceeds the recommended maximum "
                        f"of {high:.1f} C by {excess:.1f} C."
                    ),
                }
            )
            recommendations.append(
                f"Move this batch to a cooler area or lower the set point to "
                f"{low:.0f}-{high:.0f} C."
            )
        elif temperature_c < low:
            deficit = low - temperature_c
            status = ComplianceStatus.WARNING if deficit <= temp_tol else ComplianceStatus.NON_COMPLIANT
            escalate(status)
            violations.append(
                {
                    "parameter": "temperature",
                    "status": str(status),
                    "current": round(temperature_c, 2),
                    "required_min": low,
                    "required_max": high,
                    "deviation": round(-deficit, 2),
                    "message": (
                        f"Temperature {temperature_c:.1f} C is {deficit:.1f} C below the "
                        f"recommended minimum of {low:.1f} C (chill-damage risk)."
                    ),
                }
            )
            recommendations.append(f"Raise the set point into the {low:.0f}-{high:.0f} C band.")

    # ---- humidity ----------------------------------------------------
    if humidity_pct is None:
        violations.append(
            {
                "parameter": "humidity",
                "status": "UNKNOWN",
                "message": "No humidity reading recorded for this batch.",
            }
        )
    else:
        low, high = rule["humidity_min_pct"], rule["humidity_max_pct"]
        if humidity_pct > high:
            excess = humidity_pct - high
            status = ComplianceStatus.WARNING if excess <= hum_tol else ComplianceStatus.NON_COMPLIANT
            escalate(status)
            violations.append(
                {
                    "parameter": "humidity",
                    "status": str(status),
                    "current": round(humidity_pct, 1),
                    "required_min": low,
                    "required_max": high,
                    "deviation": round(excess, 1),
                    "message": (
                        f"Humidity {humidity_pct:.0f}% exceeds the recommended maximum of "
                        f"{high:.0f}% - elevated mould risk."
                    ),
                }
            )
            recommendations.append("Improve ventilation or dehumidify the storage area.")
        elif humidity_pct < low:
            deficit = low - humidity_pct
            status = ComplianceStatus.WARNING if deficit <= hum_tol else ComplianceStatus.NON_COMPLIANT
            escalate(status)
            violations.append(
                {
                    "parameter": "humidity",
                    "status": str(status),
                    "current": round(humidity_pct, 1),
                    "required_min": low,
                    "required_max": high,
                    "deviation": round(-deficit, 1),
                    "message": (
                        f"Humidity {humidity_pct:.0f}% is below the recommended minimum of "
                        f"{low:.0f}% - dehydration risk."
                    ),
                }
            )
            recommendations.append("Increase humidity or cover the produce to limit moisture loss.")

    # ---- air circulation / light -------------------------------------
    if air_circulation and str(air_circulation).upper() == "POOR":
        escalate(ComplianceStatus.WARNING)
        violations.append(
            {
                "parameter": "air_circulation",
                "status": str(ComplianceStatus.WARNING),
                "current": str(air_circulation).upper(),
                "required": rule["recommended_circulation"],
                "message": "Poor air circulation promotes localised warm, humid pockets.",
            }
        )
        recommendations.append("Improve air circulation around the batch.")

    if light_exposure:
        order = {"DARK": 0, "LOW": 1, "MODERATE": 2, "HIGH": 3}
        current = order.get(str(light_exposure).upper(), 1)
        allowed = order.get(str(rule["max_light_exposure"]).upper(), 1)
        if current > allowed:
            escalate(ComplianceStatus.WARNING)
            violations.append(
                {
                    "parameter": "light_exposure",
                    "status": str(ComplianceStatus.WARNING),
                    "current": str(light_exposure).upper(),
                    "required": rule["max_light_exposure"],
                    "message": "Light exposure above the recommended level accelerates degradation.",
                }
            )
            recommendations.append("Shield the batch from direct light.")

    # ---- score + risk -------------------------------------------------
    from app.freshness.scoring import storage_score_from_deviation

    profile_slug = None  # rule already merged; use a synthetic profile below
    score, notes = storage_score_from_deviation(
        temperature_c,
        humidity_pct,
        profile=_synthetic_profile(rule),
        air_circulation=air_circulation,
        light_exposure=light_exposure,
    )

    if worst == ComplianceStatus.NON_COMPLIANT:
        risk = RiskLevel.HIGH if score >= 45 else RiskLevel.CRITICAL
    elif worst == ComplianceStatus.WARNING:
        risk = RiskLevel.MEDIUM
    else:
        risk = RiskLevel.LOW

    if temperature_c is None and humidity_pct is None:
        worst = ComplianceStatus.UNKNOWN
        risk = RiskLevel.MEDIUM

    return {
        "compliance_status": str(worst),
        "risk_level": str(risk),
        "storage_score": round(score, 2),
        "violations": violations,
        "notes": notes,
        "recommendation": " ".join(recommendations)
        or "Storage conditions are within the recommended envelope.",
        "required": {
            "temp_min_c": rule["temp_min_c"],
            "temp_max_c": rule["temp_max_c"],
            "humidity_min_pct": rule["humidity_min_pct"],
            "humidity_max_pct": rule["humidity_max_pct"],
            "recommended_circulation": rule["recommended_circulation"],
            "max_light_exposure": rule["max_light_exposure"],
        },
        "current": {
            "temperature_c": temperature_c,
            "humidity_pct": humidity_pct,
            "air_circulation": air_circulation,
            "light_exposure": light_exposure,
        },
        "disclaimer": (
            "Recommended ranges are configurable engineering defaults, not medically or "
            "legally authoritative limits."
        ),
    }


def _synthetic_profile(rule: dict[str, Any]):
    """Adapt a merged rule dict back into the dataclass the scorer expects."""
    from app.core.category_rules import CategoryProfile, StorageRule
    from app.core.enums import AirCirculation, LightExposure

    storage_rule = StorageRule(
        temp_min_c=rule["temp_min_c"],
        temp_max_c=rule["temp_max_c"],
        humidity_min_pct=rule["humidity_min_pct"],
        humidity_max_pct=rule["humidity_max_pct"],
        recommended_circulation=AirCirculation.parse(
            rule.get("recommended_circulation"), AirCirculation.GOOD
        ),
        max_light_exposure=LightExposure.parse(rule.get("max_light_exposure"), LightExposure.LOW),
        temp_sensitivity=rule.get("temp_sensitivity", 0.08),
        humidity_sensitivity=rule.get("humidity_sensitivity", 0.02),
        notes=rule.get("notes", ""),
    )
    return CategoryProfile(
        slug="MERGED",
        name="Merged rule",
        description="",
        icon="",
        storage_rule=storage_rule,
        baseline_shelf_life_days=7.0,
        perishability=0.6,
    )


# ---------------------------------------------------------- storage records
def get_active_condition(db: Session, batch_id: int) -> StorageCondition | None:
    return db.scalar(
        select(StorageCondition)
        .where(StorageCondition.batch_id == batch_id, StorageCondition.is_active.is_(True))
        .order_by(StorageCondition.created_at.desc())
    )


def upsert_storage_condition(
    db: Session,
    batch: FoodBatch,
    *,
    temperature_c: float | None = None,
    humidity_pct: float | None = None,
    air_circulation: str | None = None,
    light_exposure: str | None = None,
    location_name: str | None = None,
    zone: str | None = None,
) -> StorageCondition:
    """Create or update the batch's active storage condition and evaluate it."""
    from app.inventory.service import storage_duration_days

    rule = rule_for_batch(batch)
    condition = get_active_condition(db, batch.id)
    if condition is None:
        condition = StorageCondition(batch_id=batch.id, is_active=True)
        db.add(condition)

    if temperature_c is not None:
        condition.temperature_c = float(temperature_c)
    if humidity_pct is not None:
        condition.humidity_pct = float(humidity_pct)
    if air_circulation is not None:
        condition.air_circulation = str(air_circulation).upper()
    if light_exposure is not None:
        condition.light_exposure = str(light_exposure).upper()
    condition.location_name = location_name or condition.location_name or batch.storage_location
    condition.zone = zone or condition.zone
    condition.storage_duration_days = storage_duration_days(batch)

    condition.required_temp_min_c = rule["temp_min_c"]
    condition.required_temp_max_c = rule["temp_max_c"]
    condition.required_humidity_min_pct = rule["humidity_min_pct"]
    condition.required_humidity_max_pct = rule["humidity_max_pct"]

    evaluation = evaluate_compliance(
        temperature_c=condition.temperature_c,
        humidity_pct=condition.humidity_pct,
        rule=rule,
        air_circulation=condition.air_circulation,
        light_exposure=condition.light_exposure,
    )
    condition.compliance_status = evaluation["compliance_status"]
    condition.storage_score = evaluation["storage_score"]
    condition.risk_level = evaluation["risk_level"]
    condition.violations = evaluation["violations"]
    condition.recommendation = evaluation["recommendation"]
    condition.evaluated_at = datetime.now(UTC)

    db.flush()
    return condition


def record_reading(
    db: Session,
    *,
    batch: FoodBatch | None,
    temperature_c: float | None,
    humidity_pct: float | None,
    air_circulation: str | None = None,
    light_exposure: str | None = None,
    co2_ppm: float | None = None,
    location_name: str | None = None,
    sensor_id: str | None = None,
    source: SensorSource | str = SensorSource.MANUAL,
    recorded_at: datetime | None = None,
    note: str | None = None,
    user: User | None = None,
    request_meta: dict | None = None,
    generate_alerts: bool = True,
) -> StorageReading:
    """Persist an environmental sample, evaluate it and raise alerts if needed."""
    rule = rule_for_batch(batch) if batch else effective_rule(None)
    evaluation = evaluate_compliance(
        temperature_c=temperature_c,
        humidity_pct=humidity_pct,
        rule=rule,
        air_circulation=air_circulation,
        light_exposure=light_exposure,
    )

    condition = None
    if batch is not None:
        condition = upsert_storage_condition(
            db,
            batch,
            temperature_c=temperature_c,
            humidity_pct=humidity_pct,
            air_circulation=air_circulation,
            light_exposure=light_exposure,
            location_name=location_name,
        )

    reading = StorageReading(
        batch_id=batch.id if batch else None,
        storage_condition_id=condition.id if condition else None,
        recorded_by_id=user.id if user else None,
        location_name=location_name or (batch.storage_location if batch else None),
        sensor_id=sensor_id,
        source=str(source.value if isinstance(source, SensorSource) else source),
        temperature_c=temperature_c,
        humidity_pct=humidity_pct,
        air_circulation=str(air_circulation).upper() if air_circulation else None,
        light_exposure=str(light_exposure).upper() if light_exposure else None,
        co2_ppm=co2_ppm,
        compliance_status=evaluation["compliance_status"],
        is_violation=evaluation["compliance_status"]
        in {ComplianceStatus.NON_COMPLIANT.value, ComplianceStatus.WARNING.value},
        note=note,
        recorded_at=recorded_at or datetime.now(UTC),
    )
    db.add(reading)
    db.flush()

    if generate_alerts and batch is not None:
        from app.notifications.alerts import raise_storage_alerts

        raise_storage_alerts(db, batch, evaluation, user=user)

    if user is not None:
        record_audit(
            db,
            action=AuditAction.STORAGE_READING,
            user=user,
            entity_type="storage_reading",
            entity_id=str(reading.id),
            description=(
                f"Recorded storage reading "
                f"({temperature_c if temperature_c is not None else '-'} C, "
                f"{humidity_pct if humidity_pct is not None else '-'}%)"
                + (f" for batch {batch.batch_number}" if batch else "")
            ),
            metadata={"compliance": evaluation["compliance_status"], "source": reading.source},
            request_meta=request_meta,
        )
    return reading


def batch_storage_snapshot(db: Session, batch: FoodBatch) -> dict[str, Any]:
    """Current condition + required range + compliance for one batch."""
    condition = get_active_condition(db, batch.id)
    rule = rule_for_batch(batch)
    evaluation = evaluate_compliance(
        temperature_c=condition.temperature_c if condition else None,
        humidity_pct=condition.humidity_pct if condition else None,
        rule=rule,
        air_circulation=condition.air_circulation if condition else None,
        light_exposure=condition.light_exposure if condition else None,
    )
    latest = db.scalar(
        select(StorageReading)
        .where(StorageReading.batch_id == batch.id)
        .order_by(StorageReading.recorded_at.desc())
    )
    return {
        "batch_id": batch.id,
        "batch_number": batch.batch_number,
        "product_name": batch.product.name if batch.product else None,
        "category_slug": batch.product.category.slug if batch.product and batch.product.category else None,
        "location_name": condition.location_name if condition else batch.storage_location,
        "zone": condition.zone if condition else None,
        "storage_duration_days": condition.storage_duration_days if condition else None,
        "last_reading_at": latest.recorded_at if latest else None,
        **evaluation,
    }


def reading_history(
    db: Session,
    *,
    batch_id: int | None = None,
    location_name: str | None = None,
    days: int = 14,
    limit: int = 500,
) -> list[StorageReading]:
    since = datetime.now(UTC) - timedelta(days=max(1, days))
    stmt = select(StorageReading).where(StorageReading.recorded_at >= since)
    if batch_id is not None:
        stmt = stmt.where(StorageReading.batch_id == batch_id)
    if location_name:
        stmt = stmt.where(StorageReading.location_name == location_name)
    return list(
        db.scalars(stmt.order_by(StorageReading.recorded_at.asc()).limit(limit)).all()
    )


def reading_trends(
    db: Session, *, batch_id: int | None = None, location_name: str | None = None, days: int = 14
) -> dict[str, Any]:
    """Daily min/avg/max temperature and humidity for trend graphs."""
    readings = reading_history(db, batch_id=batch_id, location_name=location_name, days=days)
    buckets: dict[str, dict[str, list[float]]] = {}
    for reading in readings:
        key = reading.recorded_at.date().isoformat()
        bucket = buckets.setdefault(key, {"temperature": [], "humidity": []})
        if reading.temperature_c is not None:
            bucket["temperature"].append(float(reading.temperature_c))
        if reading.humidity_pct is not None:
            bucket["humidity"].append(float(reading.humidity_pct))

    def stats(values: list[float]) -> dict[str, float | None]:
        if not values:
            return {"min": None, "avg": None, "max": None}
        return {
            "min": round(min(values), 2),
            "avg": round(sum(values) / len(values), 2),
            "max": round(max(values), 2),
        }

    points = [
        {
            "date": day,
            "temperature": stats(data["temperature"]),
            "humidity": stats(data["humidity"]),
            "reading_count": len(data["temperature"]) or len(data["humidity"]),
        }
        for day, data in sorted(buckets.items())
    ]
    violations = sum(1 for r in readings if r.is_violation)
    return {
        "days": days,
        "reading_count": len(readings),
        "violation_count": violations,
        "compliance_rate": round(
            (1 - violations / len(readings)) * 100, 1
        ) if readings else None,
        "points": points,
    }


def compliance_overview(db: Session, *, location_name: str | None = None) -> dict[str, Any]:
    """Compliance roll-up across all active batches (warehouse dashboard)."""
    stmt = select(FoodBatch).where(FoodBatch.is_archived.is_(False))
    if location_name:
        stmt = stmt.where(FoodBatch.storage_location == location_name)
    batches = list(db.scalars(stmt).unique().all())

    counts = {status.value: 0 for status in ComplianceStatus}
    snapshots: list[dict[str, Any]] = []
    scores: list[float] = []
    for batch in batches:
        snapshot = batch_storage_snapshot(db, batch)
        counts[snapshot["compliance_status"]] = counts.get(snapshot["compliance_status"], 0) + 1
        if snapshot.get("storage_score") is not None:
            scores.append(float(snapshot["storage_score"]))
        snapshots.append(snapshot)

    non_compliant = [
        s for s in snapshots
        if s["compliance_status"] in {ComplianceStatus.NON_COMPLIANT.value, ComplianceStatus.WARNING.value}
    ]
    non_compliant.sort(key=lambda s: s.get("storage_score") or 0)

    return {
        "total_batches": len(batches),
        "counts": counts,
        "average_storage_score": round(sum(scores) / len(scores), 1) if scores else None,
        "compliance_rate": round(
            counts.get(ComplianceStatus.COMPLIANT.value, 0) / len(batches) * 100, 1
        ) if batches else None,
        "attention_required": non_compliant[:20],
    }


def locations(db: Session) -> list[dict[str, Any]]:
    """Distinct storage locations with their latest readings."""
    rows = db.execute(
        select(
            StorageReading.location_name,
            func.count(StorageReading.id),
            func.avg(StorageReading.temperature_c),
            func.avg(StorageReading.humidity_pct),
            func.max(StorageReading.recorded_at),
        )
        .where(StorageReading.location_name.is_not(None))
        .group_by(StorageReading.location_name)
    ).all()
    return [
        {
            "location_name": name,
            "reading_count": int(count),
            "avg_temperature_c": round(float(avg_t), 2) if avg_t is not None else None,
            "avg_humidity_pct": round(float(avg_h), 1) if avg_h is not None else None,
            "last_reading_at": last,
        }
        for name, count, avg_t, avg_h, last in rows
    ]


def get_batch_or_404(db: Session, batch_id: int) -> FoodBatch:
    batch = db.get(FoodBatch, batch_id)
    if batch is None:
        raise NotFoundError(f"Batch {batch_id} was not found.", code="BATCH_NOT_FOUND")
    return batch
