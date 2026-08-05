from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
from uuid import UUID
from datetime import datetime

from ..database import get_db
from ..models.sql_models import User
from ..schemas.pydantic_schemas import UserResponse
from ..utils.security import RoleChecker
from ..mongodb import get_mongo_db

router = APIRouter(prefix="/api/admin", tags=["System Administration"])
admin_check = RoleChecker(["admin"])

@router.get("/users", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    admin: User = Depends(admin_check)
):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.put("/users/{user_id}/status")
def toggle_user_active(
    user_id: UUID,
    is_active: bool,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_check)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot modify their own active status."
        )
    user.is_active = is_active
    db.commit()
    return {"status": "success", "message": f"User status set to {is_active}."}

@router.get("/system-logs")
def get_system_activity_logs(
    limit: int = 100,
    admin: User = Depends(admin_check)
):
    mongo_db = get_mongo_db()
    if mongo_db is None:
        return [
            {
                "user_id": "system",
                "action": "FALLBACK_LOG",
                "details": "MongoDB not connected. Running in simulation mode.",
                "timestamp": datetime.now().isoformat()
            }
        ]
        
    logs = list(mongo_db.activity_logs.find().sort("timestamp", -1).limit(limit))
    for log in logs:
        log["id"] = str(log["_id"])
        del log["_id"]
        if isinstance(log["timestamp"], datetime):
            log["timestamp"] = log["timestamp"].isoformat()
            
    return logs

@router.get("/api-monitoring")
def get_api_latency_logs(
    limit: int = 100,
    admin: User = Depends(admin_check)
):
    mongo_db = get_mongo_db()
    if mongo_db is None:
        # Mock some sample API request data
        return [
            {"endpoint": "/api/predict/upload", "method": "POST", "status_code": 200, "latency_ms": 128.5, "timestamp": datetime.now().isoformat()},
            {"endpoint": "/api/inventory", "method": "GET", "status_code": 200, "latency_ms": 12.1, "timestamp": datetime.now().isoformat()},
            {"endpoint": "/api/auth/profile", "method": "GET", "status_code": 200, "latency_ms": 6.8, "timestamp": datetime.now().isoformat()}
        ]
        
    logs = list(mongo_db.api_monitoring.find().sort("timestamp", -1).limit(limit))
    for log in logs:
        log["id"] = str(log["_id"])
        del log["_id"]
        if isinstance(log["timestamp"], datetime):
            log["timestamp"] = log["timestamp"].isoformat()
            
    return logs

@router.get("/model-performance")
def get_model_inference_logs(
    limit: int = 100,
    admin: User = Depends(admin_check)
):
    mongo_db = get_mongo_db()
    if mongo_db is None:
        # Return mock metrics
        return [
            {"model_name": "FoodFreshnessCNN", "predicted_category": "Fruits", "freshness_score": 85, "spoilage_probability": 0.05, "remaining_shelf_life_days": 8.5, "timestamp": datetime.now().isoformat()},
            {"model_name": "FoodFreshnessCNN", "predicted_category": "Meat", "freshness_score": 42, "spoilage_probability": 0.58, "remaining_shelf_life_days": 1.2, "timestamp": datetime.now().isoformat()}
        ]
        
    logs = list(mongo_db.model_performance.find().sort("timestamp", -1).limit(limit))
    for log in logs:
        log["id"] = str(log["_id"])
        del log["_id"]
        if isinstance(log["timestamp"], datetime):
            log["timestamp"] = log["timestamp"].isoformat()
            
    return logs
