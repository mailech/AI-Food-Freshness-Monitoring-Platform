from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from config import UPLOAD_DIR
from auth.router import router as auth_router
from inventory.router import router as inventory_router
from analysis.router import router as analysis_router
from storage.router import router as storage_router
from recommendations.router import router as recommendations_router
from notifications.router import router as notifications_router
from reports.router import router as reports_router
from dashboard.router import router as dashboard_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Food Freshness Monitoring Platform API",
    description="AI-powered food freshness detection, shelf-life prediction, and storage monitoring",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth_router)
app.include_router(inventory_router)
app.include_router(analysis_router)
app.include_router(storage_router)
app.include_router(recommendations_router)
app.include_router(notifications_router)
app.include_router(reports_router)
app.include_router(dashboard_router)

@app.get("/")
def root():
    return {"message": "Food Freshness Monitoring Platform API", "version": "2.0.0", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy", "modules": ["auth", "inventory", "analysis", "storage", "recommendations", "notifications", "reports", "dashboard"]}
