"""FastAPI application factory and entrypoint.

Run locally:
    uvicorn app.main:app --reload --port 8000

Interactive docs:
    http://localhost:8000/docs   (Swagger UI)
    http://localhost:8000/redoc  (ReDoc)
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging_config import configure_logging, get_logger
from app.middleware.rate_limit import RateLimitMiddleware, SecurityHeadersMiddleware
from app.middleware.request_logging import RequestLoggingMiddleware
from app.routers import (
    admin,
    analysis,
    analytics,
    auth,
    batches,
    catalogue,
    engagement,
    health,
    images,
    inventory,
    reports,
    storage,
    users,
)

logger = get_logger("app.main")

DESCRIPTION = """
AI-powered platform that analyses food images, storage conditions and product age to
estimate freshness, predict remaining shelf life, detect spoilage indicators, monitor
storage compliance and generate actionable recommendations.

### Getting started
1. `POST /api/v1/auth/register` or log in with a seeded demo account.
2. Click **Authorize** and paste the `access_token`, or use the OAuth2 password flow.
3. Create a product and a batch, upload an image, then call
   `POST /api/v1/analysis/image`.

### Roles
`CONSUMER`, `RETAIL_MANAGER`, `WAREHOUSE_OPERATOR`, `QUALITY_INSPECTOR`, `ADMIN`.
Every sensitive endpoint enforces a permission grant server-side - frontend role checks
are never trusted.

### On AI honesty
When `DEMO_MODE=true` (or when a trained artefact is absent) the vision and shelf-life
components are **transparent computer-vision / rule-based baselines**, not trained neural
networks. Responses are labelled accordingly (`assessment.model.is_demo`,
`analysis_label`) and **no accuracy metrics are claimed** for them. Check
`GET /api/v1/system/models` for the exact provenance of every inference role.

### Error format
```json
{"success": false, "error": {"code": "INVALID_IMAGE", "message": "..."}}
```
"""

TAGS_METADATA = [
    {"name": "System", "description": "Health checks and ML model provenance."},
    {"name": "Authentication", "description": "Registration, JWT login, refresh, logout."},
    {"name": "Users", "description": "Profile self-service."},
    {"name": "Catalogue", "description": "Food categories and products."},
    {"name": "Batches", "description": "Batch lifecycle, search and FIFO/FEFO rotation."},
    {"name": "Inventory", "description": "A user's own holdings, consumption and waste."},
    {"name": "Images", "description": "Validated image upload and retrieval."},
    {
        "name": "Analysis",
        "description": "The freshness pipeline: image analysis, scoring, shelf life.",
    },
    {"name": "Storage Monitoring", "description": "Conditions, readings, compliance, sensors."},
    {"name": "Recommendations", "description": "Explainable rule-based suggestions."},
    {"name": "Alerts", "description": "Risk alerts with severity and lifecycle."},
    {"name": "Notifications", "description": "In-app notification centre."},
    {"name": "Analytics", "description": "Dashboards and aggregate analytics."},
    {"name": "Reports", "description": "PDF and XLSX report generation."},
    {"name": "Administration", "description": "Users, audit trail, system settings."},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown."""
    configure_logging()
    settings.ensure_directories()

    logger.info(
        "starting %s v%s (env=%s, demo_mode=%s, db=%s)",
        settings.APP_NAME,
        settings.APP_VERSION,
        settings.ENVIRONMENT,
        settings.DEMO_MODE,
        "sqlite" if settings.is_sqlite else "postgresql",
    )

    # Warn loudly if a production deployment kept the development secret.
    if settings.ENVIRONMENT == "production" and settings.JWT_SECRET_KEY.startswith("dev-only"):
        logger.error(
            "JWT_SECRET_KEY is still the development default in a production "
            "environment. Set a strong secret via the environment immediately."
        )

    # Load the ML registry once so the first request is not slowed down, and so
    # the startup log states plainly which components are baselines.
    from app.ml.registry import get_registry

    registry = get_registry()
    described = registry.describe()
    logger.info("ML mode: %s | analysis label: %s", described["mode"], registry.analysis_label())
    for note in described["fallback_notes"]:
        logger.warning("ML fallback -> %s", note)

    from app.services.storage_backend import get_storage

    get_storage()

    yield
    logger.info("shutting down %s", settings.APP_NAME)


def create_app() -> FastAPI:
    configure_logging()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=DESCRIPTION,
        openapi_tags=TAGS_METADATA,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        contact={"name": "Platform team", "url": "https://example.local/support"},
        license_info={"name": "MIT"},
    )

    # ---- middleware (outermost first) -------------------------------
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Response-Time-ms", "Content-Disposition"],
        max_age=3600,
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(RequestLoggingMiddleware)

    register_exception_handlers(app)

    # ---- routers ----------------------------------------------------
    app.include_router(health.router)

    prefix = settings.API_V1_PREFIX
    app.include_router(auth.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)
    app.include_router(catalogue.router, prefix=prefix)
    app.include_router(batches.router, prefix=prefix)
    app.include_router(inventory.router, prefix=prefix)
    app.include_router(images.router, prefix=prefix)
    app.include_router(analysis.router, prefix=prefix)
    app.include_router(storage.router, prefix=prefix)
    app.include_router(engagement.recommendations_router, prefix=prefix)
    app.include_router(engagement.alerts_router, prefix=prefix)
    app.include_router(engagement.notifications_router, prefix=prefix)
    app.include_router(analytics.router, prefix=prefix)
    app.include_router(reports.router, prefix=prefix)
    app.include_router(admin.router, prefix=prefix)

    @app.get("/", include_in_schema=False)
    def root() -> RedirectResponse:
        return RedirectResponse(url="/docs")

    @app.get(f"{prefix}/meta", tags=["System"], summary="Platform metadata for the UI")
    def meta() -> dict:
        """Everything the frontend needs to render enums and honesty labels."""
        from app.core.category_rules import all_profiles
        from app.core.enums import (
            AirCirculation,
            AlertSeverity,
            AlertType,
            FreshnessCategory,
            InventoryStatus,
            LightExposure,
            NotificationType,
            PackagingType,
            RecommendationType,
            ReportFormat,
            ReportType,
            RiskLevel,
            RoleName,
            RotationStrategy,
        )
        from app.ml.registry import get_registry

        def options(enum_cls) -> list[dict]:
            return [
                {"value": m.value, "label": m.value.replace("_", " ").title()}
                for m in enum_cls
            ]

        registry = get_registry()
        return {
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "demo_mode": settings.DEMO_MODE,
            "analysis_label": registry.analysis_label(),
            "ml": registry.status_summary(),
            "scoring": {
                "weights": settings.score_weights,
                "thresholds": settings.score_thresholds,
            },
            "enums": {
                "roles": options(RoleName),
                "freshness_categories": options(FreshnessCategory),
                "inventory_statuses": options(InventoryStatus),
                "packaging_types": options(PackagingType),
                "air_circulation": options(AirCirculation),
                "light_exposure": options(LightExposure),
                "alert_types": options(AlertType),
                "alert_severities": options(AlertSeverity),
                "notification_types": options(NotificationType),
                "recommendation_types": options(RecommendationType),
                "report_types": options(ReportType),
                "report_formats": options(ReportFormat),
                "risk_levels": options(RiskLevel),
                "rotation_strategies": options(RotationStrategy),
            },
            "categories": [profile.as_dict() for profile in all_profiles()],
            "upload": {
                "max_mb": settings.MAX_UPLOAD_SIZE_MB,
                "allowed_extensions": settings.ALLOWED_IMAGE_EXTENSIONS,
                "allowed_mime_types": settings.ALLOWED_IMAGE_MIME_TYPES,
            },
            "disclaimer": (
                "Freshness and shelf-life outputs are AI estimates, not laboratory "
                "measurements or food-safety guarantees."
            ),
        }

    return app


app = create_app()
