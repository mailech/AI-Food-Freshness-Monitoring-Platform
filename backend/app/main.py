from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.db.session import engine, Base
from app.db.seed import seed_database
from app.ml.model_service import MLInferenceEngine

# Import all route modules
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.inventory import router as inventory_router
from app.api.routes.storage import router as storage_router
from app.api.routes.ml_vision import router as ml_router
from app.api.routes.freshness import router as freshness_router
from app.api.routes.shelf_life import router_shelf, router_rec
from app.api.routes.recommendations import router as rec_router
from app.api.routes.alerts import router as alerts_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.reports import router as reports_router
from app.api.routes.audit import router as audit_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Powered Food Freshness Monitoring, Quality Assessment & Shelf-Life Management Platform",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file mounts
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

sample_dir = settings.BASE_DIR.parent / "frontend" / "public" / "samples"
if sample_dir.exists():
    app.mount("/samples", StaticFiles(directory=str(sample_dir)), name="samples")

# Register routers under /api
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(inventory_router, prefix=settings.API_V1_STR)
app.include_router(storage_router, prefix=settings.API_V1_STR)
app.include_router(ml_router, prefix=settings.API_V1_STR)
app.include_router(freshness_router, prefix=settings.API_V1_STR)
app.include_router(router_shelf, prefix=settings.API_V1_STR)
app.include_router(rec_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def startup_event():
    print("Initializing Database schema and seeding default records...")
    Base.metadata.create_all(bind=engine)
    seed_database()
    print("Pre-loading ML Inference Engine into memory...")
    try:
        MLInferenceEngine.get_instance()
        print("ML Inference Engine ready!")
    except Exception as e:
        print(f"Notice: ML Engine lazy-init: {e}")

@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "api_docs": f"{settings.API_V1_STR}/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Food Freshness Monitoring API",
        "database": "connected",
        "ml_engine": "active"
    }
