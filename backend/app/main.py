from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api.auth import router as auth_router
from app.api.foods import router as foods_router
from app.api.analysis import router as analysis_router
from app.api.storage import router as storage_router
from app.api.recommendations import router as recommendations_router
from app.api.alerts import router as alerts_router
from app.api.dashboard import router as dashboard_router
from app.api.reports import router as reports_router

app = FastAPI(
    title="Food Freshness Monitoring Platform API",
    description="Enterprise API for AI-assisted Food Freshness Detection, Shelf-Life Prediction, Storage Sensor Telemetry, and Waste Reduction Management.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads directory
uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include Routers
app.include_router(auth_router, prefix="/api")
app.include_router(foods_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(storage_router, prefix="/api")
app.include_router(recommendations_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(reports_router, prefix="/api")

@app.get("/")
def root():
    return {
        "platform": "Food Freshness Monitoring Platform API",
        "status": "operational",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "ai_engine": "modular_mock_active"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
