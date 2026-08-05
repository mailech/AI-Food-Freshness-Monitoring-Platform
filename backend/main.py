from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from datetime import datetime
import time

from .config import settings
from .database import engine, Base
from .mongodb import get_mongo_db

# Import routers
from .routes import auth, batches, inventory, prediction, analytics, reports, notifications, admin

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-powered Food Freshness Monitoring Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 1. Create SQL Database tables on startup (if not already existing)
try:
    Base.metadata.create_all(bind=engine)
    print("PostgreSQL tables checked/created.")
except Exception as e:
    print(f"Error initializing PostgreSQL tables: {e}")

# 2. CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for development, specialize in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Mount uploaded static files (ensure dir exists first)
import os as _os
_os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
try:
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
except Exception as _e:
    print(f"Warning: Could not mount /uploads — {_e}")

# 4. Latency and HTTP logging middleware (MongoDB logs)
@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000.0
    
    # Avoid logging static upload calls to reduce noise
    if not request.url.path.startswith("/uploads"):
        mongo_db = get_mongo_db()
        if mongo_db is not None:
            try:
                mongo_db.api_monitoring.insert_one({
                    "endpoint": request.url.path,
                    "method": request.method,
                    "status_code": response.status_code,
                    "latency_ms": round(duration_ms, 2),
                    "timestamp": datetime.utcnow()
                })
            except Exception:
                pass
                
    return response

# 5. Include API Routers
app.include_router(auth.router)
app.include_router(batches.router)
app.include_router(inventory.router)
app.include_router(prediction.router)
app.include_router(analytics.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "docs_url": "/docs"
    }
