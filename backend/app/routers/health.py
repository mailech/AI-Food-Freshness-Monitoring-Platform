"""Health and readiness endpoints."""

from __future__ import annotations

import platform
import time
from datetime import UTC, datetime

from fastapi import APIRouter, Response, status
from pydantic import BaseModel

from app.config import settings
from app.database import check_database
from app.ml.registry import get_registry

router = APIRouter(tags=["System"])

_STARTED_AT = time.time()


class ComponentStatus(BaseModel):
    name: str
    status: str
    detail: str | None = None


class HealthResponse(BaseModel):
    status: str
    database: str
    model: str
    version: str
    environment: str
    demo_mode: bool
    uptime_seconds: float
    timestamp: datetime
    components: list[ComponentStatus] = []


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service health",
    description="Reports API, database and ML model status. Returns 503 when a "
    "critical dependency is unavailable.",
)
def health(response: Response) -> HealthResponse:
    db_ok, db_detail = check_database()
    registry = get_registry()
    model_summary = registry.status_summary()

    components = [
        ComponentStatus(name="api", status="up", detail=f"{settings.APP_NAME} {settings.APP_VERSION}"),
        ComponentStatus(name="database", status="up" if db_ok else "down", detail=db_detail),
        ComponentStatus(
            name="ml_models",
            status="up",
            detail=model_summary["mode"],
        ),
        ComponentStatus(
            name="storage",
            status="up",
            detail=f"{settings.STORAGE_BACKEND} backend",
        ),
        ComponentStatus(
            name="runtime",
            status="up",
            detail=f"Python {platform.python_version()} on {platform.system()}",
        ),
    ]

    overall = "healthy" if db_ok else "degraded"
    if not db_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return HealthResponse(
        status=overall,
        database=db_detail if db_ok else "disconnected",
        model=model_summary["mode"],
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        demo_mode=settings.DEMO_MODE,
        uptime_seconds=round(time.time() - _STARTED_AT, 1),
        timestamp=datetime.now(UTC),
        components=components,
    )


@router.get("/health/live", summary="Liveness probe")
def liveness() -> dict[str, str]:
    return {"status": "alive"}


@router.get("/health/ready", summary="Readiness probe")
def readiness(response: Response) -> dict[str, str]:
    db_ok, detail = check_database()
    if not db_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not-ready", "database": detail}
    return {"status": "ready", "database": detail}


@router.get(
    "/api/v1/system/models",
    summary="ML model inventory",
    description="Which inference components are trained artefacts and which are "
    "transparent baselines. Used by the UI to label demo analyses honestly.",
)
def model_inventory() -> dict:
    return get_registry().describe()
