from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    alerts,
    authentication,
    database,
    freshness,
    freshness_scoring,
    inventory,
    recommendations,
    reports,
    shelf_life,
    storage,
)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Return a lightweight status response for uptime checks."""
    return {"status": "ok"}


# Versioned routers keep future API modules organized without changing /health.
api_prefix = settings.api_v1_prefix
app.include_router(authentication.router, prefix=api_prefix)
app.include_router(database.router, prefix=api_prefix)
app.include_router(inventory.router, prefix=api_prefix)
app.include_router(freshness.router, prefix=api_prefix)
app.include_router(freshness_scoring.router, prefix=api_prefix)
app.include_router(shelf_life.router, prefix=api_prefix)
app.include_router(storage.router, prefix=api_prefix)
app.include_router(recommendations.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
