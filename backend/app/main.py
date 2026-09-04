from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import user, food_item, analysis
from app.routers import auth, food_items, analysis as analysis_router

# Create Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Food Freshness Monitoring API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(food_items.router)
app.include_router(analysis_router.router)

@app.get("/")
def root():
    return {"message": "Food Freshness API is running"}