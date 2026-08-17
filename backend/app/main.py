import os
from contextlib import asynccontextmanager
from typing import Any
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.database import init_databases, get_db
from app.modules.auth.router import router as auth_router
from app.modules.inventory.router import router as inventory_router
from app.modules.image_analysis.router import router as image_analysis_router
from app.modules.freshness.router import router as freshness_router
from app.modules.shelf_life.router import router as shelf_life_router
from app.modules.storage.router import router as storage_router
from app.modules.scoring.router import router as scoring_router
from app.modules.recommendation.router import router as recommendation_router
from app.modules.notification.router import router as notification_router
from app.modules.analytics.router import router as analytics_router
from app.modules.report.router import router as report_router
from app.modules.admin.router import router as admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    await init_databases()
    yield
    # Shutdown actions (if any needed in future phases)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Food Freshness Monitoring Platform API Layer",
    version="1.0.0",
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files for Uploads
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include modules routers
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(inventory_router, prefix=f"{settings.API_V1_STR}/inventory", tags=["Inventory"])
app.include_router(image_analysis_router, prefix=f"{settings.API_V1_STR}/image-analysis", tags=["Image Analysis"])
app.include_router(freshness_router, prefix=f"{settings.API_V1_STR}/freshness", tags=["Freshness Assessment"])
app.include_router(shelf_life_router, prefix=f"{settings.API_V1_STR}/shelf-life", tags=["Shelf-Life Prediction"])
app.include_router(storage_router, prefix=f"{settings.API_V1_STR}/storage", tags=["Storage Monitoring"])
app.include_router(scoring_router, prefix=f"{settings.API_V1_STR}/scoring", tags=["Scoring"])
app.include_router(recommendation_router, prefix=f"{settings.API_V1_STR}/recommendation", tags=["Recommendation"])
app.include_router(notification_router, prefix=f"{settings.API_V1_STR}/notification", tags=["Notification"])
app.include_router(analytics_router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Analytics"])
app.include_router(report_router, prefix=f"{settings.API_V1_STR}/report", tags=["Report"])
app.include_router(admin_router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin"])

@app.get("/")
async def root() -> dict[str, str]:
    return {
        "message": f"Welcome to the {settings.PROJECT_NAME} API. Access documentation at /docs"
    }

@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    postgres_status = "down"
    mongodb_status = "down"
    
    try:
        await db.execute(text("SELECT 1"))
        postgres_status = "up"
    except Exception as e:
        postgres_status = f"down (error: {str(e)})"

    try:
        mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
        await mongo_client[settings.MONGODB_DB].command("ping")
        mongodb_status = "up"
    except Exception as e:
        mongodb_status = f"down (error: {str(e)})"

    is_healthy = postgres_status == "up" and mongodb_status == "up"
    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "services": {
            "postgres": postgres_status,
            "mongodb": mongodb_status
        }
    }
