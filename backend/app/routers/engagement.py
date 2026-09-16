"""Alerts, notifications and recommendation endpoints."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from app.core.enums import AlertSeverity, AlertType, Permission, RoleName
from app.core.errors import NotFoundError
from app.deps import CurrentUser, DbSession, Pagination, RequestMeta, require_permissions
from app.inventory import service as inventory_service
from app.models import Alert, Recommendation
from app.notifications import service as notification_service
from app.recommendations.engine import (
    active_for_batch,
    generate_for_batch,
    registered_rule_count,
    serialise_recommendation,
)
from app.repositories.food import BatchRepository
from app.schemas.analysis import (
    AlertOut,
    AlertSummaryOut,
    AlertUpdate,
    BroadcastRequest,
    NotificationListOut,
    NotificationOut,
    RecommendationOut,
    alert_type_catalogue,
    notification_type_catalogue,
)
from app.schemas.common import Message, Page

alerts_router = APIRouter(prefix="/alerts", tags=["Alerts"])
notifications_router = APIRouter(prefix="/notifications", tags=["Notifications"])
recommendations_router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


# ================================================================== alerts
def _serialise_alert(alert: Alert) -> dict[str, Any]:
    payload = {c.name: getattr(alert, c.name) for c in alert.__table__.columns}
    batch = alert.batch
    payload["batch_number"] = batch.batch_number if batch else None
    payload["product_name"] = batch.product.name if batch and batch.product else None
    return payload


def _alert_scope(user, stmt):
    """Consumers only see alerts about batches they hold."""
    if user.role_name != RoleName.CONSUMER.value:
        return stmt
    from sqlalchemy import or_, select

    from app.models import InventoryItem

    return stmt.where(
        or_(
            Alert.batch_id.is_(None),
            Alert.batch_id.in_(
                select(InventoryItem.batch_id).where(InventoryItem.owner_id == user.id)
            ),
        )
    )


@alerts_router.get(
    "",
    response_model=Page[AlertOut],
    summary="List alerts",
    description="Filter by type, severity, read/resolved state and batch.",
)
def list_alerts(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ALERT_READ))],
    pagination: Pagination,
    alert_type: list[str] | None = Query(default=None),
    severity: list[str] | None = Query(default=None),
    is_read: bool | None = None,
    resolved: bool | None = Query(default=None),
    batch_id: int | None = None,
    sort_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
) -> Page[AlertOut]:
    from sqlalchemy import func, select

    stmt = select(Alert)
    if alert_type:
        stmt = stmt.where(Alert.alert_type.in_([t.upper() for t in alert_type]))
    if severity:
        stmt = stmt.where(Alert.severity.in_([s.upper() for s in severity]))
    if is_read is not None:
        stmt = stmt.where(Alert.is_read.is_(is_read))
    if resolved is not None:
        stmt = stmt.where(Alert.resolved.is_(resolved))
    if batch_id is not None:
        stmt = stmt.where(Alert.batch_id == batch_id)
    stmt = _alert_scope(user, stmt)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = int(db.scalar(count_stmt) or 0)

    ordering = Alert.created_at.asc() if sort_dir == "asc" else Alert.created_at.desc()
    rows = db.scalars(
        stmt.order_by(ordering, Alert.id.desc())
        .limit(pagination.page_size)
        .offset(pagination.offset)
    ).unique().all()

    return Page.build(
        [AlertOut.model_validate(_serialise_alert(a)) for a in rows],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@alerts_router.get("/summary", response_model=AlertSummaryOut, summary="Alert counters")
def alert_summary(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ALERT_READ))],
) -> AlertSummaryOut:
    from sqlalchemy import func, select

    base = _alert_scope(user, select(Alert))
    subquery = base.subquery()

    total = int(db.scalar(select(func.count()).select_from(subquery)) or 0)
    unread = int(
        db.scalar(
            select(func.count()).select_from(_alert_scope(user, select(Alert)).where(
                Alert.is_read.is_(False)
            ).subquery())
        )
        or 0
    )
    open_count = int(
        db.scalar(
            select(func.count()).select_from(_alert_scope(user, select(Alert)).where(
                Alert.resolved.is_(False)
            ).subquery())
        )
        or 0
    )

    severity_rows = db.execute(
        select(Alert.severity, func.count(Alert.id)).group_by(Alert.severity)
    ).all()
    type_rows = db.execute(
        select(Alert.alert_type, func.count(Alert.id)).group_by(Alert.alert_type)
    ).all()

    by_severity = {s.value: 0 for s in AlertSeverity}
    for severity, count in severity_rows:
        by_severity[str(severity)] = int(count)
    by_type = {t.value: 0 for t in AlertType}
    for alert_type, count in type_rows:
        by_type[str(alert_type)] = int(count)

    return AlertSummaryOut(
        total=total, unread=unread, open=open_count, by_severity=by_severity, by_type=by_type
    )


@alerts_router.get("/types", response_model=list[dict], summary="Alert type catalogue")
def alert_types(user: CurrentUser) -> list[dict]:
    return [t.model_dump() for t in alert_type_catalogue()]


@alerts_router.get("/{alert_id}", response_model=AlertOut, summary="Get an alert")
def get_alert(
    alert_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ALERT_READ))],
) -> AlertOut:
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise NotFoundError("Alert not found.", code="ALERT_NOT_FOUND")
    return AlertOut.model_validate(_serialise_alert(alert))


@alerts_router.patch(
    "/{alert_id}",
    response_model=AlertOut,
    summary="Mark an alert read and/or resolved",
)
def update_alert(
    alert_id: int,
    payload: AlertUpdate,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ALERT_WRITE))],
) -> AlertOut:
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise NotFoundError("Alert not found.", code="ALERT_NOT_FOUND")

    now = datetime.now(UTC)
    if payload.is_read is not None and payload.is_read != alert.is_read:
        alert.is_read = payload.is_read
        alert.read_at = now if payload.is_read else None
    if payload.resolved is not None and payload.resolved != alert.resolved:
        alert.resolved = payload.resolved
        alert.resolved_at = now if payload.resolved else None
        alert.resolved_by_id = user.id if payload.resolved else None
    if payload.resolution_note is not None:
        alert.resolution_note = payload.resolution_note
    db.commit()
    db.refresh(alert)
    return AlertOut.model_validate(_serialise_alert(alert))


@alerts_router.post("/read-all", response_model=Message, summary="Mark all alerts read")
def mark_all_alerts_read(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ALERT_WRITE))],
) -> Message:
    from sqlalchemy import update

    result = db.execute(
        update(Alert).where(Alert.is_read.is_(False)).values(
            is_read=True, read_at=datetime.now(UTC)
        )
    )
    db.commit()
    return Message(message=f"{result.rowcount or 0} alert(s) marked read.")


@alerts_router.post(
    "/scan",
    response_model=dict,
    summary="Re-scan all batches for alert conditions",
    description="Sweeps every active batch and refreshes expiry, shelf-life and storage "
    "alerts. In production this would run on a schedule.",
)
def scan_alerts(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ALERT_WRITE))],
) -> dict:
    from app.notifications.alerts import scan_all_batches

    counts = scan_all_batches(db, user)
    db.commit()
    return {"raised": counts, "message": "Alert scan complete."}


# =========================================================== notifications
@notifications_router.get(
    "",
    response_model=NotificationListOut,
    summary="My notification centre",
)
def list_notifications(
    db: DbSession,
    user: CurrentUser,
    pagination: Pagination,
    unread_only: bool = False,
    notification_type: str | None = None,
) -> NotificationListOut:
    rows, total, unread = notification_service.list_notifications(
        db,
        user,
        unread_only=unread_only,
        notification_type=notification_type,
        page=pagination.page,
        page_size=pagination.page_size,
    )
    return NotificationListOut(
        items=[NotificationOut.model_validate(n) for n in rows],
        total=total,
        unread=unread,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@notifications_router.get(
    "/unread-count", response_model=dict, summary="Unread notification count"
)
def unread(db: DbSession, user: CurrentUser) -> dict:
    return {"unread": notification_service.unread_count(db, user)}


@notifications_router.get("/types", response_model=list[dict], summary="Notification types")
def notification_types(user: CurrentUser) -> list[dict]:
    return [t.model_dump() for t in notification_type_catalogue()]


@notifications_router.patch(
    "/{notification_id}/read", response_model=NotificationOut, summary="Mark one read"
)
def read_notification(notification_id: int, db: DbSession, user: CurrentUser) -> NotificationOut:
    notification = notification_service.mark_read(db, user, notification_id)
    db.commit()
    db.refresh(notification)
    return NotificationOut.model_validate(notification)


@notifications_router.post("/read-all", response_model=Message, summary="Mark all read")
def read_all_notifications(db: DbSession, user: CurrentUser) -> Message:
    count = notification_service.mark_all_read(db, user)
    db.commit()
    return Message(message=f"{count} notification(s) marked read.")


@notifications_router.delete(
    "/{notification_id}", response_model=Message, summary="Delete a notification"
)
def delete_notification(notification_id: int, db: DbSession, user: CurrentUser) -> Message:
    notification_service.delete_notification(db, user, notification_id)
    db.commit()
    return Message(message="Notification deleted.")


@notifications_router.post(
    "/broadcast",
    response_model=Message,
    summary="Broadcast a system notification (admin)",
)
def broadcast(
    payload: BroadcastRequest,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.SYSTEM_MANAGE))],
) -> Message:
    count = notification_service.broadcast_system_notification(
        db,
        title=payload.title,
        message=payload.message,
        severity=payload.severity,
        role_names=payload.role_names,
    )
    db.commit()
    return Message(message=f"Notification sent to {count} user(s).")


# ========================================================= recommendations
@recommendations_router.get(
    "/rules",
    response_model=dict,
    summary="Recommendation engine information",
)
def engine_info(user: CurrentUser) -> dict:
    return {
        "engine": "rule-based",
        "registered_rules": registered_rule_count(),
        "categories": [
            "STORAGE",
            "CONSUMPTION",
            "INVENTORY_ROTATION",
            "WASTE_REDUCTION",
            "QUALITY_IMPROVEMENT",
        ],
        "note": (
            "Every recommendation carries a rule_id, a rationale and the evidence that "
            "triggered it, so suggestions remain explainable and auditable."
        ),
    }


@recommendations_router.get(
    "/{batch_id}",
    response_model=list[RecommendationOut],
    summary="Recommendations for a batch",
)
def batch_recommendations(
    batch_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.RECOMMENDATION_READ))],
    refresh: bool = Query(default=False, description="Re-run the rule engine first"),
    recommendation_type: str | None = None,
) -> list[RecommendationOut]:
    batch = BatchRepository(db).get_or_404(batch_id, "Batch")
    inventory_service.assert_batch_access(user, batch, db)

    if refresh:
        generate_for_batch(db, batch)
        db.commit()

    rows = active_for_batch(db, batch_id)
    if recommendation_type:
        rows = [
            r for r in rows if r.recommendation_type == recommendation_type.upper()
        ]
    return [RecommendationOut.model_validate(serialise_recommendation(r)) for r in rows]


@recommendations_router.post(
    "/{recommendation_id}/acknowledge",
    response_model=RecommendationOut,
    summary="Acknowledge a recommendation",
)
def acknowledge(
    recommendation_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.RECOMMENDATION_READ))],
) -> RecommendationOut:
    row = db.get(Recommendation, recommendation_id)
    if row is None:
        raise NotFoundError("Recommendation not found.", code="RECOMMENDATION_NOT_FOUND")
    row.acknowledged = True
    row.acknowledged_at = datetime.now(UTC)
    db.commit()
    db.refresh(row)
    return RecommendationOut.model_validate(serialise_recommendation(row))
