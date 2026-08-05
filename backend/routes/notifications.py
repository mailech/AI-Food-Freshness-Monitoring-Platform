from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict
from datetime import datetime
from bson import ObjectId

from ..mongodb import get_mongo_db
from ..models.sql_models import User
from ..utils.security import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("")
def get_user_notifications(
    current_user: User = Depends(get_current_user)
):
    mongo_db = get_mongo_db()
    if mongo_db is None:
        # Mock responses if MongoDB isn't reachable
        return [
            {
                "id": "mock_notif_1",
                "title": "Welcome Alert",
                "message": "Welcome to the AI Food Freshness Monitoring Platform! Track inventory and detect decay using computer vision.",
                "channel": "System",
                "is_read": False,
                "created_at": datetime.now().isoformat()
            }
        ]
        
    try:
        notifications = list(mongo_db.notifications.find(
            {"user_id": str(current_user.id)}
        ).sort("created_at", -1).limit(50))
        
        serializable_notifications = []
        for n in notifications:
            n["id"] = str(n["_id"])
            del n["_id"]
            if isinstance(n["created_at"], datetime):
                n["created_at"] = n["created_at"].isoformat()
            serializable_notifications.append(n)
            
        return serializable_notifications
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch alerts from log store: {str(e)}"
        )

@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    mongo_db = get_mongo_db()
    if mongo_db is None:
        return {"status": "success", "message": "Marked read (mock)"}
        
    try:
        # Check if ID is a valid ObjectId
        if not ObjectId.is_valid(notification_id):
            # For mock or client generated ids
            result = mongo_db.notifications.update_one(
                {"id": notification_id, "user_id": str(current_user.id)},
                {"$set": {"is_read": True}}
            )
        else:
            result = mongo_db.notifications.update_one(
                {"_id": ObjectId(notification_id), "user_id": str(current_user.id)},
                {"$set": {"is_read": True}}
            )
            
        return {"status": "success", "modified_count": result.modified_count}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update alert state: {str(e)}"
        )

@router.post("/test-trigger")
def trigger_test_alert(
    title: str,
    message: str,
    channel: str = "Test",
    current_user: User = Depends(get_current_user)
):
    # Triggers a manual alert for validation
    mongo_db = get_mongo_db()
    if mongo_db is not None:
        try:
            mongo_db.notifications.insert_one({
                "user_id": str(current_user.id),
                "title": title,
                "message": message,
                "channel": channel,
                "is_read": False,
                "created_at": datetime.utcnow()
            })
            return {"status": "success", "message": "Alert injected."}
        except Exception as e:
            pass
            
    return {"status": "failed", "message": "Mongo DB connection unavailable."}
