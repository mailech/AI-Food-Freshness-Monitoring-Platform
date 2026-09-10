from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from . import models
from .routes import alerts, analysis, auth, dashboard, inventory, recommendations, reports, shelf_life, storage

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FreshAI API",
    description="Backend API for the FreshAI Food Freshness Monitoring Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this to your frontend URL in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(inventory.router)
app.include_router(analysis.router)
app.include_router(shelf_life.router)
app.include_router(storage.router)
app.include_router(recommendations.router)
app.include_router(dashboard.router)
app.include_router(alerts.router)
app.include_router(reports.router)


@app.get("/")
def root():
    return {"message": "FreshAI backend is running!"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
