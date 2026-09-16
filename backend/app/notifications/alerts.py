"""Alert generation and lifecycle.

Alerts are deduplicated by a stable `dedupe_key`: while an alert of the same kind
is open for the same batch it is *updated* rather than re-raised, so a warehouse
operator does not receive one alert per sensor poll.

Every raised alert also fans out to in-app notifications for the users who should
see it (batch owner + the relevant operational roles).
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any, Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.enums import (
    AlertSeverity,
    AlertType,
    ComplianceStatus,
    FreshnessCategory,
    NotificationType,
    RoleName,
)
from app.core.logging_config import get_logger
from app.models import Alert, FoodBatch, InventoryItem, Role, User
from app.notifications.service import notify_users

logger = get_logger("app.notifications.alerts")

# Which roles should be notified about each alert family.
_ROLE_ROUTING: dict[str, tuple[str, ...]] = {
    AlertType.TEMPERATURE_VIOLATION.value: (
        RoleName.WAREHOUSE_OPERATOR.value, RoleName.RETAIL_MANAGER.value, RoleName.ADMIN.value,
    ),
    AlertType.HUMIDITY_VIOLATION.value: (
        RoleName.WAREHOUSE_OPERATOR.value, RoleName.RETAIL_MANAGER.value, RoleName.ADMIN.value,
    ),
    AlertType.STORAGE_NON_COMPLIANCE.value: (
        RoleName.WAREHOUSE_OPERATOR.value, RoleName.QUALITY_INSPECTOR.value, RoleName.ADMIN.value,
    ),
    AlertType.SPOILAGE.value: (
        RoleName.QUALITY_INSPECTOR.value, RoleName.RETAIL_MANAGER.value,
        RoleName.WAREHOUSE_OPERATOR.value, RoleName.ADMIN.value,
    ),
    AlertType.NEAR_SPOILAGE.value: (
        RoleName.QUALITY_INSPECTOR.value, RoleName.RETAIL_MANAGER.value, RoleName.ADMIN.value,
    ),
    AlertType.FRESHNESS_DEGRADATION.value: (
        RoleName.QUALITY_INSPECTOR.value, RoleName.RETAIL_MANAGER.value,
    ),
    AlertType.SHELF_LIFE_WARNING.value: (RoleName.RETAIL_MANAGER.value,),
    AlertType.EXPIRY_APPROACHING.value: (RoleName.RETAIL_MANAGER.value,),
    AlertType.INVENTORY_RISK.value: (RoleName.RETAIL_MANAGER.value, RoleName.ADMIN.value),
}

_NOTIFICATION_TYPE: dict[str, NotificationType] = {
    AlertType.FRESHNESS_DEGRADATION.value: NotificationType.FRESHNESS_ALERT,
    AlertType.NEAR_SPOILAGE.value: NotificationType.SPOILAGE_ALERT,
    AlertType.SPOILAGE.value: NotificationType.SPOILAGE_ALERT,
    AlertType.SHELF_LIFE_WARNING.value: NotificationType.SHELF_LIFE_WARNING,
    AlertType.EXPIRY_APPROACHING.value: NotificationType.SHELF_LIFE_WARNING,
    AlertType.TEMPERATURE_VIOLATION.value: NotificationType.STORAGE_ALERT,
    AlertType.HUMIDITY_VIOLATION.value: NotificationType.STORAGE_ALERT,
    AlertType.STORAGE_NON_COMPLIANCE.value: NotificationType.STORAGE_ALERT,
    AlertType.INVENTORY_RISK.value: NotificationType.INVENTORY_ALERT,
}


# ------------------------------------------------------------------ helpers
def _recipients(db: Session, batch: FoodBatch | None, alert_type: str) -> list[User]:
    """Batch owners plus the roles responsible for this alert family."""
    users: dict[int, User] = {}

    if batch is not None:
        owner_ids = set(
            db.scalars(
                select(InventoryItem.owner_id).where(InventoryItem.batch_id == batch.id)
            ).all()
        )
        if batch.created_by_id:
            owner_ids.add(batch.created_by_id)
        for user in db.scalars(select(User).where(User.id.in_(owner_ids or {-1}))).all():
            if user.is_active:
                users[user.id] = user

    role_names = _ROLE_ROUTING.get(alert_type, (RoleName.ADMIN.value,))
    role_ids = list(db.scalars(select(Role.id).where(Role.name.in_(role_names))).all())
    if role_ids:
        for user in db.scalars(
            select(User).where(User.role_id.in_(role_ids), User.is_active.is_(True))
        ).all():
            users[user.id] = user
    return list(users.values())


def raise_alert(
    db: Session,
    *,
    alert_type: AlertType | str,
    severity: AlertSeverity | str,
    title: str,
    message: str,
    batch: FoodBatch | None = None,
    context: dict[str, Any] | None = None,
    dedupe_key: str | None = None,
    triggered_by: User | None = None,
    notify: bool = True,
) -> Alert:
    """Create or refresh an alert, then fan out notifications."""
    type_value = str(alert_type.value if isinstance(alert_type, AlertType) else alert_type)
    severity_value = str(severity.value if isinstance(severity, AlertSeverity) else severity)
    key = dedupe_key or f"{type_value}:{batch.id if batch else 'global'}"

    existing = db.scalar(
        select(Alert).where(
            Alert.dedupe_key == key,
            Alert.resolved.is_(False),
        ).order_by(Alert.created_at.desc())
    )

    if existing is not None:
        escalated = (
            AlertSeverity.parse(severity_value, AlertSeverity.INFO).rank
            > AlertSeverity.parse(existing.severity, AlertSeverity.INFO).rank
        )
        existing.title = title
        existing.message = message
        existing.context = context
        existing.updated_at = datetime.now(UTC)
        if escalated:
            existing.severity = severity_value
            existing.is_read = False  # re-surface when the situation worsens
        db.flush()
        if escalated and notify:
            _fan_out(db, existing, batch)
        return existing

    alert = Alert(
        batch_id=batch.id if batch else None,
        triggered_by_id=triggered_by.id if triggered_by else None,
        alert_type=type_value,
        severity=severity_value,
        title=title,
        message=message,
        dedupe_key=key,
        context=context,
    )
    db.add(alert)
    db.flush()
    logger.info(
        "alert raised type=%s severity=%s batch=%s",
        type_value, severity_value, batch.id if batch else None,
    )
    if notify:
        _fan_out(db, alert, batch)
    return alert


def _fan_out(db: Session, alert: Alert, batch: FoodBatch | None) -> None:
    recipients = _recipients(db, batch, alert.alert_type)
    if not recipients:
        return
    notify_users(
        db,
        users=recipients,
        notification_type=_NOTIFICATION_TYPE.get(
            alert.alert_type, NotificationType.SYSTEM_NOTIFICATION
        ),
        title=alert.title,
        message=alert.message,
        severity=alert.severity,
        alert=alert,
        link=f"/batches/{batch.id}" if batch else "/alerts",
        payload={"alert_type": alert.alert_type, "batch_id": batch.id if batch else None},
    )


def resolve_alerts(
    db: Session,
    *,
    batch: FoodBatch,
    alert_types: Iterable[AlertType | str],
    note: str | None = None,
    user: User | None = None,
) -> int:
    """Auto-resolve open alerts that no longer apply (e.g. temperature restored)."""
    values = [str(t.value if isinstance(t, AlertType) else t) for t in alert_types]
    open_alerts = db.scalars(
        select(Alert).where(
            Alert.batch_id == batch.id,
            Alert.alert_type.in_(values),
            Alert.resolved.is_(False),
        )
    ).all()
    now = datetime.now(UTC)
    for alert in open_alerts:
        alert.resolved = True
        alert.resolved_at = now
        alert.resolved_by_id = user.id if user else None
        alert.resolution_note = note or "Condition returned to the acceptable range."
    if open_alerts:
        db.flush()
    return len(open_alerts)


# ------------------------------------------------------------- alert rules
def raise_storage_alerts(
    db: Session, batch: FoodBatch, evaluation: dict[str, Any], user: User | None = None
) -> list[Alert]:
    """Temperature / humidity / general compliance alerts from an evaluation."""
    alerts: list[Alert] = []
    status = evaluation.get("compliance_status")
    product_name = batch.product.name if batch.product else "batch"

    by_parameter = {v.get("parameter"): v for v in evaluation.get("violations", [])}

    temp = by_parameter.get("temperature")
    if temp and temp.get("status") in {
        ComplianceStatus.WARNING.value, ComplianceStatus.NON_COMPLIANT.value
    }:
        severity = (
            AlertSeverity.HIGH
            if temp["status"] == ComplianceStatus.NON_COMPLIANT.value
            else AlertSeverity.MEDIUM
        )
        alerts.append(
            raise_alert(
                db,
                alert_type=AlertType.TEMPERATURE_VIOLATION,
                severity=severity,
                title=f"Temperature out of range - {product_name}",
                message=temp["message"] + f" Batch {batch.batch_number}.",
                batch=batch,
                context={"violation": temp, "recommendation": evaluation.get("recommendation")},
                triggered_by=user,
            )
        )
    else:
        resolve_alerts(db, batch=batch, alert_types=[AlertType.TEMPERATURE_VIOLATION], user=user)

    humidity = by_parameter.get("humidity")
    if humidity and humidity.get("status") in {
        ComplianceStatus.WARNING.value, ComplianceStatus.NON_COMPLIANT.value
    }:
        severity = (
            AlertSeverity.MEDIUM
            if humidity["status"] == ComplianceStatus.NON_COMPLIANT.value
            else AlertSeverity.LOW
        )
        alerts.append(
            raise_alert(
                db,
                alert_type=AlertType.HUMIDITY_VIOLATION,
                severity=severity,
                title=f"Humidity out of range - {product_name}",
                message=humidity["message"] + f" Batch {batch.batch_number}.",
                batch=batch,
                context={"violation": humidity},
                triggered_by=user,
            )
        )
    else:
        resolve_alerts(db, batch=batch, alert_types=[AlertType.HUMIDITY_VIOLATION], user=user)

    if status == ComplianceStatus.NON_COMPLIANT.value:
        alerts.append(
            raise_alert(
                db,
                alert_type=AlertType.STORAGE_NON_COMPLIANCE,
                severity=AlertSeverity.HIGH,
                title=f"Storage non-compliance - {product_name}",
                message=(
                    f"Batch {batch.batch_number} is stored outside its recommended envelope. "
                    + str(evaluation.get("recommendation", ""))
                ),
                batch=batch,
                context={"evaluation": {k: evaluation[k] for k in ("required", "current", "violations")}},
                triggered_by=user,
            )
        )
    else:
        resolve_alerts(db, batch=batch, alert_types=[AlertType.STORAGE_NON_COMPLIANCE], user=user)

    return alerts


def raise_freshness_alerts(
    db: Session,
    batch: FoodBatch,
    *,
    freshness_score: float,
    freshness_category: str,
    spoilage_probability: float | None = None,
    detected_indicators: list[str] | None = None,
    previous_score: float | None = None,
    user: User | None = None,
) -> list[Alert]:
    """Alerts derived from a freshness assessment."""
    alerts: list[Alert] = []
    product_name = batch.product.name if batch.product else "batch"
    category = FreshnessCategory.parse(freshness_category, FreshnessCategory.ACCEPTABLE)

    if category == FreshnessCategory.SPOILED:
        alerts.append(
            raise_alert(
                db,
                alert_type=AlertType.SPOILAGE,
                severity=AlertSeverity.CRITICAL,
                title=f"Spoilage detected - {product_name}",
                message=(
                    f"Batch {batch.batch_number} scored {freshness_score:.0f}/100 and is "
                    f"classified as SPOILED. Remove it from stock and inspect immediately. "
                    f"Indicators: {', '.join(detected_indicators or []) or 'see assessment'}."
                ),
                batch=batch,
                context={
                    "freshness_score": freshness_score,
                    "spoilage_probability": spoilage_probability,
                    "indicators": detected_indicators,
                },
                triggered_by=user,
            )
        )
    elif category == FreshnessCategory.NEAR_SPOILAGE:
        alerts.append(
            raise_alert(
                db,
                alert_type=AlertType.NEAR_SPOILAGE,
                severity=AlertSeverity.HIGH,
                title=f"Near spoilage - {product_name}",
                message=(
                    f"Batch {batch.batch_number} scored {freshness_score:.0f}/100 and is "
                    "approaching spoilage. Prioritise it for immediate sale or consumption."
                ),
                batch=batch,
                context={"freshness_score": freshness_score, "indicators": detected_indicators},
                triggered_by=user,
            )
        )
    else:
        resolve_alerts(
            db,
            batch=batch,
            alert_types=[AlertType.SPOILAGE, AlertType.NEAR_SPOILAGE],
            note=f"Latest assessment scored {freshness_score:.0f}/100 ({category}).",
            user=user,
        )

    # Degradation trend: a meaningful drop since the previous assessment.
    if previous_score is not None and previous_score - freshness_score >= 12:
        alerts.append(
            raise_alert(
                db,
                alert_type=AlertType.FRESHNESS_DEGRADATION,
                severity=AlertSeverity.MEDIUM,
                title=f"Freshness dropping - {product_name}",
                message=(
                    f"Batch {batch.batch_number} fell from {previous_score:.0f} to "
                    f"{freshness_score:.0f}/100 since the previous assessment "
                    f"({previous_score - freshness_score:.0f} point drop)."
                ),
                batch=batch,
                context={"previous_score": previous_score, "current_score": freshness_score},
                dedupe_key=f"{AlertType.FRESHNESS_DEGRADATION.value}:{batch.id}:{date.today()}",
                triggered_by=user,
            )
        )
    return alerts


def raise_shelf_life_alerts(
    db: Session,
    batch: FoodBatch,
    *,
    remaining_days: float,
    predicted_expiry: date | None,
    risk_level: str,
    user: User | None = None,
) -> list[Alert]:
    alerts: list[Alert] = []
    product_name = batch.product.name if batch.product else "batch"

    if remaining_days <= settings.SHELF_LIFE_WARNING_DAYS:
        severity = AlertSeverity.CRITICAL if remaining_days <= 0.5 else AlertSeverity.HIGH
        alerts.append(
            raise_alert(
                db,
                alert_type=AlertType.SHELF_LIFE_WARNING,
                severity=severity,
                title=f"Shelf life almost exhausted - {product_name}",
                message=(
                    f"Batch {batch.batch_number} has an estimated {remaining_days:.1f} day(s) "
                    f"of shelf life left"
                    + (f" (predicted expiry {predicted_expiry:%d %b %Y})" if predicted_expiry else "")
                    + f". Risk level: {risk_level}."
                ),
                batch=batch,
                context={"remaining_days": remaining_days, "risk_level": risk_level},
                triggered_by=user,
            )
        )
    else:
        resolve_alerts(db, batch=batch, alert_types=[AlertType.SHELF_LIFE_WARNING], user=user)
    return alerts


def raise_expiry_alerts(db: Session, batch: FoodBatch, user: User | None = None) -> list[Alert]:
    """Label-date driven alert, independent of any AI prediction."""
    if batch.expected_expiry_date is None:
        return []
    days_left = (batch.expected_expiry_date - date.today()).days
    product_name = batch.product.name if batch.product else "batch"

    if days_left < 0:
        return [
            raise_alert(
                db,
                alert_type=AlertType.EXPIRY_APPROACHING,
                severity=AlertSeverity.CRITICAL,
                title=f"Expired - {product_name}",
                message=(
                    f"Batch {batch.batch_number} passed its best-before date "
                    f"({batch.expected_expiry_date:%d %b %Y}) {abs(days_left)} day(s) ago."
                ),
                batch=batch,
                context={"days_overdue": abs(days_left)},
                triggered_by=user,
            )
        ]
    if days_left <= settings.EXPIRY_WARNING_DAYS:
        return [
            raise_alert(
                db,
                alert_type=AlertType.EXPIRY_APPROACHING,
                severity=AlertSeverity.HIGH if days_left <= 1 else AlertSeverity.MEDIUM,
                title=f"Expiring soon - {product_name}",
                message=(
                    f"Batch {batch.batch_number} expires in {days_left} day(s) on "
                    f"{batch.expected_expiry_date:%d %b %Y}."
                ),
                batch=batch,
                context={"days_left": days_left},
                triggered_by=user,
            )
        ]
    resolve_alerts(db, batch=batch, alert_types=[AlertType.EXPIRY_APPROACHING], user=user)
    return []


def raise_inventory_risk_alert(
    db: Session, batch: FoodBatch, *, reason: str, severity: AlertSeverity = AlertSeverity.MEDIUM,
    context: dict[str, Any] | None = None, user: User | None = None,
) -> Alert:
    product_name = batch.product.name if batch.product else "batch"
    return raise_alert(
        db,
        alert_type=AlertType.INVENTORY_RISK,
        severity=severity,
        title=f"Inventory risk - {product_name}",
        message=f"Batch {batch.batch_number}: {reason}",
        batch=batch,
        context=context,
        triggered_by=user,
    )


def scan_all_batches(db: Session, user: User | None = None) -> dict[str, int]:
    """Sweep every active batch and refresh expiry / shelf-life / storage alerts.

    Called by the seeder and available as an admin endpoint; in production this
    would run on a schedule.
    """
    from app.storage.service import batch_storage_snapshot

    batches = list(
        db.scalars(select(FoodBatch).where(FoodBatch.is_archived.is_(False))).unique().all()
    )
    counts = {"expiry": 0, "shelf_life": 0, "storage": 0, "inventory": 0}

    for batch in batches:
        counts["expiry"] += len(raise_expiry_alerts(db, batch, user))

        if batch.remaining_shelf_life_days is not None:
            counts["shelf_life"] += len(
                raise_shelf_life_alerts(
                    db,
                    batch,
                    remaining_days=float(batch.remaining_shelf_life_days),
                    predicted_expiry=batch.predicted_expiry_date,
                    risk_level="MEDIUM",
                    user=user,
                )
            )

        snapshot = batch_storage_snapshot(db, batch)
        if snapshot["compliance_status"] in {
            ComplianceStatus.WARNING.value, ComplianceStatus.NON_COMPLIANT.value
        }:
            counts["storage"] += len(raise_storage_alerts(db, batch, snapshot, user))

        # Large quantity + short life == waste risk.
        if (
            batch.remaining_shelf_life_days is not None
            and float(batch.remaining_shelf_life_days) <= 2
            and float(batch.quantity or 0) >= 20
        ):
            raise_inventory_risk_alert(
                db,
                batch,
                reason=(
                    f"{float(batch.quantity):.0f} {batch.unit} remaining with only "
                    f"{float(batch.remaining_shelf_life_days):.1f} day(s) of shelf life - "
                    "high waste risk."
                ),
                severity=AlertSeverity.HIGH,
                context={"quantity": float(batch.quantity or 0)},
                user=user,
            )
            counts["inventory"] += 1

    db.flush()
    return counts
