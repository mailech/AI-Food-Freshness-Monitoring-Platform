from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from database.connection import engine, Base
from models.user import User
from routes.auth import router as auth_router
from routes.prediction import router as prediction_router
from security import get_current_user


app = FastAPI(
    title="Food Freshness Monitoring API",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5175",
        "http://127.0.0.1:5175"
        ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)
app.include_router(auth_router)
app.include_router(prediction_router)


@app.get("/")
def home():
    return {
        "message": "Food Freshness Monitoring API is running!"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }

@app.get("/protected")
def protected_route(
    current_user: str = Depends(get_current_user)
):
    return {
        "message": "You are authenticated!",
        "user_id": current_user
    }