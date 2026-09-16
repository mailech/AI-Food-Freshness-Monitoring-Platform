"""Analytics endpoints."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from app.analytics import service as analytics_service
from app.core.enums import Permission, RoleName
from app.deps import CurrentUser, DbSession, is_privileged, require_permissions
from app.schemas.analysis import DashboardOut

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _owner_scope(user) -> int | None:
    """Consumers are scoped to their own data; other roles see the tenant."""
    return None if is_privileged(user) else user.id


@router.get(
    "/dashboard",
    response_model=DashboardOut,
    summary="Role-aware dashboard payload",
    description=(
        "Returns exactly the blocks the caller's dashboard needs:\n\n"
        "* CONSUMER - inventory overview, upcoming expiries, recommendations, rotation\n"
        "* RETAIL_MANAGER - freshness distribution, trends, waste risk, category quality\n"
        "* WAREHOUSE_OPERATOR - storage compliance, environment trends, locations\n"
        "* QUALITY_INSPECTOR - inspection queue, indicator summary, spoilage metrics\n"
        "* ADMIN - platform stats, users by role, system/ML status"
    ),
)
def dashboard(db: DbSession, user: CurrentUser) -> DashboardOut:
    return DashboardOut.model_validate(analytics_service.dashboard(db, user))


@router.get(
    "",
    response_model=dict,
    summary="Full analytics payload",
)
def full_analytics(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYTICS_READ))],
    days: int = Query(default=30, ge=1, le=365),
) -> dict:
    return analytics_service.full_analytics(db, days=days, owner_id=_owner_scope(user))


@router.get("/freshness-distribution", response_model=dict, summary="Freshness distribution")
def freshness_distribution(db: DbSession, user: CurrentUser) -> dict:
    return analytics_service.freshness_distribution(db, owner_id=_owner_scope(user))


@router.get("/freshness-trend", response_model=dict, summary="Average freshness over time")
def freshness_trend(
    db: DbSession, user: CurrentUser, days: int = Query(default=30, ge=1, le=365)
) -> dict:
    return analytics_service.average_freshness_over_time(
        db, days=days, owner_id=_owner_scope(user)
    )


@router.get("/spoilage", response_model=dict, summary="Spoilage metrics")
def spoilage(db: DbSession, user: CurrentUser) -> dict:
    return analytics_service.spoilage_metrics(db, owner_id=_owner_scope(user))


@router.get("/shelf-life-distribution", response_model=dict, summary="Shelf-life distribution")
def shelf_life_distribution(db: DbSession, user: CurrentUser) -> dict:
    return analytics_service.shelf_life_distribution(db, owner_id=_owner_scope(user))


@router.get("/inventory-health", response_model=dict, summary="Inventory health")
def inventory_health(db: DbSession, user: CurrentUser) -> dict:
    return analytics_service.inventory_health(db, owner_id=_owner_scope(user))


@router.get("/category-quality", response_model=list[dict], summary="Category-level quality")
def category_quality(db: DbSession, user: CurrentUser) -> list[dict]:
    return analytics_service.category_quality(db, owner_id=_owner_scope(user))


@router.get("/waste-risk", response_model=dict, summary="Waste risk and value at risk")
def waste_risk(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYTICS_READ))],
) -> dict:
    return analytics_service.waste_risk(db, owner_id=_owner_scope(user))


@router.get(
    "/storage-compliance",
    response_model=dict,
    summary="Storage compliance summary",
)
def storage_compliance(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.STORAGE_READ))],
) -> dict:
    return analytics_service.storage_compliance_summary(db)


@router.get(
    "/environment-trends",
    response_model=dict,
    summary="Temperature and humidity trends",
)
def environment_trends(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.STORAGE_READ))],
    days: int = Query(default=14, ge=1, le=180),
) -> dict:
    return analytics_service.environment_trends(db, days=days)


@router.get("/alert-trends", response_model=dict, summary="Alert trends")
def alert_trends(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ALERT_READ))],
    days: int = Query(default=30, ge=1, le=365),
) -> dict:
    return analytics_service.alert_trends(db, days=days)


@router.get(
    "/indicators",
    response_model=list[dict],
    summary="Spoilage indicator frequency",
)
def indicators(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_READ))],
    days: int = Query(default=30, ge=1, le=365),
) -> list[dict]:
    return analytics_service.indicator_summary(db, days=days)


@router.get(
    "/inspection-queue",
    response_model=list[dict],
    summary="Batches needing inspection",
)
def inspection_queue(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.ANALYSIS_READ))],
    limit: int = Query(default=20, ge=1, le=100),
) -> list[dict]:
    return analytics_service.inspection_queue(db, limit=limit)


@router.get(
    "/platform",
    response_model=dict,
    summary="Platform statistics (admin)",
)
def platform(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.SYSTEM_MANAGE))],
) -> dict:
    return analytics_service.platform_stats(db)
