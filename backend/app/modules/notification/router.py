from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.dependencies import get_current_user
from app.modules.user.models import User
from app.modules.notification.schemas import (
    NotificationCreate, NotificationResponse,
    PreferenceResponse, PreferenceUpdate
)
from app.modules.notification.service import NotificationService

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    role: Optional[str] = None,
    user_id: Optional[str] = None,
    unread_only: bool = False,
    current_user: Optional[User] = Depends(lambda: None)  # Optional for flexible sandbox testing
) -> Any:
    """
    List alerts filtered by active role or user ID.
    Supports sandbox role overrides via query parameters.
    """
    target_role = role
    target_user_id = user_id
    
    if current_user:
        if not target_role:
            target_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
        if not target_user_id:
            target_user_id = str(current_user.id)

    results = await NotificationService.get_notifications_for_user(
        user_id=target_user_id,
        role=target_role,
        unread_only=unread_only
    )
    
    # Map Beanie documents to Response schemas
    return [
        NotificationResponse(
            id=str(n.id),
            user_id=n.user_id,
            role=n.role,
            title=n.title,
            message=n.message,
            type=n.type,
            is_read=n.is_read,
            created_at=n.created_at
        )
        for n in results
    ]

@router.post("/trigger", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def trigger_mock_notification(data: NotificationCreate) -> Any:
    """
    Manually dispatch a mock notification (system/admin alert trigger).
    """
    n = await NotificationService.create_notification(data)
    return NotificationResponse(
        id=str(n.id),
        user_id=n.user_id,
        role=n.role,
        title=n.title,
        message=n.message,
        type=n.type,
        is_read=n.is_read,
        created_at=n.created_at
    )

@router.patch("/{id}/read")
async def mark_notification_read(id: str) -> Any:
    """
    Mark a single alert as read.
    """
    success = await NotificationService.mark_as_read(id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    return {"status": "success", "message": "Alert marked as read"}

@router.post("/read-all")
async def mark_all_notifications_read(
    role: Optional[str] = None,
    user_id: Optional[str] = None
) -> Any:
    """
    Mark all unread alerts for the specified role or user as read.
    """
    count = await NotificationService.mark_all_read(user_id=user_id, role=role)
    return {"status": "success", "count": count}

@router.get("/preference", response_model=PreferenceResponse)
async def get_user_preference(user_id: str) -> Any:
    """
    Fetch notification thresholds and preferences for a user.
    """
    pref = await NotificationService.get_or_create_preference(user_id)
    return PreferenceResponse(
        user_id=pref.user_id,
        email_enabled=pref.email_enabled,
        push_enabled=pref.push_enabled,
        min_freshness_threshold=pref.min_freshness_threshold,
        storage_alerts_enabled=pref.storage_alerts_enabled
    )

@router.put("/preference", response_model=PreferenceResponse)
async def update_user_preference(user_id: str, data: PreferenceUpdate) -> Any:
    """
    Update alert configuration preferences for a user.
    """
    pref = await NotificationService.update_preference(user_id, data)
    return PreferenceResponse(
        user_id=pref.user_id,
        email_enabled=pref.email_enabled,
        push_enabled=pref.push_enabled,
        min_freshness_threshold=pref.min_freshness_threshold,
        storage_alerts_enabled=pref.storage_alerts_enabled
    )
