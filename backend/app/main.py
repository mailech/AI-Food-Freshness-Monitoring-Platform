from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models
from .database import engine
from .routers import auth_router, food_router

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Food Freshness Platform API")

app.add_middleware(
    CORSMiddleware,
    # tighten this to the real frontend origin(s) before deploying
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="app/uploads"), name="uploads")

app.include_router(auth_router.router)
app.include_router(food_router.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "Food Freshness Platform API"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}
