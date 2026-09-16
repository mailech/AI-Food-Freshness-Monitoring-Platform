"""Canonical role -> permission grant matrix.

This module is the single source of truth for authorisation. Every sensitive
route declares the permission it needs; the frontend only *mirrors* these
grants for UI convenience and is never trusted.
"""

from __future__ import annotations

from app.core.enums import Permission as P
from app.core.enums import RoleName as R

ROLE_PERMISSIONS: dict[str, set[P]] = {
    # -------------------------------------------------------------- consumer
    # Personal pantry: add food, upload an image, see freshness / shelf life
    # and receive recommendations.
    R.CONSUMER.value: {
        P.PRODUCT_READ,
        P.BATCH_READ,
        P.BATCH_WRITE,
        P.INVENTORY_READ,
        P.INVENTORY_WRITE,
        P.ANALYSIS_CREATE,
        P.ANALYSIS_READ,
        P.STORAGE_READ,
        P.STORAGE_WRITE,
        P.RECOMMENDATION_READ,
        P.ALERT_READ,
        P.ALERT_WRITE,
    },
    # -------------------------------------------------------- retail manager
    R.RETAIL_MANAGER.value: {
        P.PRODUCT_READ,
        P.PRODUCT_WRITE,
        P.BATCH_READ,
        P.BATCH_WRITE,
        P.INVENTORY_READ,
        P.INVENTORY_WRITE,
        P.ANALYSIS_CREATE,
        P.ANALYSIS_READ,
        P.STORAGE_READ,
        P.STORAGE_WRITE,
        P.RECOMMENDATION_READ,
        P.ALERT_READ,
        P.ALERT_WRITE,
        P.ANALYTICS_READ,
        P.REPORT_GENERATE,
    },
    # ---------------------------------------------------- warehouse operator
    R.WAREHOUSE_OPERATOR.value: {
        P.PRODUCT_READ,
        P.BATCH_READ,
        P.BATCH_WRITE,
        P.INVENTORY_READ,
        P.INVENTORY_WRITE,
        P.ANALYSIS_READ,
        P.STORAGE_READ,
        P.STORAGE_WRITE,
        P.RECOMMENDATION_READ,
        P.ALERT_READ,
        P.ALERT_WRITE,
        P.ANALYTICS_READ,
        P.REPORT_GENERATE,
    },
    # ----------------------------------------------------- quality inspector
    R.QUALITY_INSPECTOR.value: {
        P.PRODUCT_READ,
        P.BATCH_READ,
        P.INVENTORY_READ,
        P.ANALYSIS_CREATE,
        P.ANALYSIS_READ,
        P.INSPECTION_MANAGE,
        P.STORAGE_READ,
        P.RECOMMENDATION_READ,
        P.ALERT_READ,
        P.ALERT_WRITE,
        P.ANALYTICS_READ,
        P.REPORT_GENERATE,
    },
    # ----------------------------------------------------------------- admin
    R.ADMIN.value: set(P),
}

ROLE_DESCRIPTIONS: dict[str, tuple[str, str]] = {
    R.CONSUMER.value: (
        "Consumer",
        "Tracks personal food items, runs freshness analysis and receives storage "
        "and consumption recommendations.",
    ),
    R.RETAIL_MANAGER.value: (
        "Retail Manager",
        "Manages products, batches and store inventory; monitors quality analytics, "
        "alerts and generates reports.",
    ),
    R.WAREHOUSE_OPERATOR.value: (
        "Warehouse Operator",
        "Monitors storage environments and compliance, records readings and tracks "
        "batch-level inventory health.",
    ),
    R.QUALITY_INSPECTOR.value: (
        "Food Quality Inspector",
        "Inspects batches, uploads analysis images and reviews quality scores and "
        "spoilage indicators.",
    ),
    R.ADMIN.value: (
        "Administrator",
        "Full platform access: user management, system settings, platform analytics "
        "and health monitoring.",
    ),
}


def permissions_for(role_name: str | None) -> set[P]:
    """Return the permission set granted to `role_name` (empty when unknown)."""
    if not role_name:
        return set()
    return set(ROLE_PERMISSIONS.get(str(role_name).upper(), set()))


def permission_strings_for(role_name: str | None) -> list[str]:
    return sorted(p.value for p in permissions_for(role_name))


def role_has_permission(role_name: str | None, permission: P | str) -> bool:
    wanted = permission.value if isinstance(permission, P) else str(permission)
    return any(p.value == wanted for p in permissions_for(role_name))


def all_roles() -> list[str]:
    return [r.value for r in R]
