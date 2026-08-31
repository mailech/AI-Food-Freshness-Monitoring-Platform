from contextlib import asynccontextmanager
from pathlib import Path
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

import app.models  # noqa: F401  (register models with Base.metadata)
from app.core.config import get_settings
from app.db import Base, SessionLocal, engine
from app.models.inventory import FoodCategory
from app.routers import analytics, auth, images, inventory, notifications, recommendations, reports, storage
from app.services.scheduler import start_notification_scheduler, stop_notification_scheduler

settings = get_settings()

CATEGORY_NAMES = [
    "Fruits",
    "Vegetables",
    "Dairy",
    "Meat & Poultry",
    "Seafood",
    "Bakery",
    "Packaged Foods",
    "Beverages",
]


def run_light_migrations() -> None:
    from sqlalchemy import text

    statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(40)",
        "UPDATE users SET hashed_password = '' WHERE hashed_password IS NULL",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0",
    ]
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))


def seed_categories() -> None:
    with SessionLocal() as db:
        existing = {name for (name,) in db.query(FoodCategory.name).all()}
        for name in CATEGORY_NAMES:
            if name not in existing:
                db.add(FoodCategory(name=name))
        db.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_light_migrations()
    seed_categories()
    scheduler_task = start_notification_scheduler()
    try:
        yield
    finally:
        await stop_notification_scheduler(scheduler_task)


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(inventory.router, prefix=settings.API_V1_PREFIX)
app.include_router(images.router, prefix=settings.API_V1_PREFIX)
app.include_router(storage.router, prefix=settings.API_V1_PREFIX)
app.include_router(recommendations.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)
app.include_router(notifications.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)

Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/healthz", tags=["system"])
def healthz():
    return {"status": "ok"}


@app.get("/readyz", tags=["system"])
def readyz():
    return {"status": "ready"}


@app.get("/", tags=["system"])
def root():
    return {
        "app": settings.APP_NAME,
        "api": f"{settings.API_V1_PREFIX}",
        "docs": "/docs",
    }
