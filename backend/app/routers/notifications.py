from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.food_item import FoodItem
from app.models.notification import Notification
from app.models.user import User, UserRole
from app.schemas.notification import NotificationListResponse, NotificationResponse, UnreadCountResponse
from app.services.shelflife_service import calculate_shelf_life_days

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def sync_notifications_for_user(db: Session, user: User):
    """
    Evaluates current inventory conditions and creates relevant in-app notifications for the user:
    - Strictly focuses on alert messages about food that has very bad spoilage (Spoiled, Near Spoilage, High Spoilage Risk, Expired).
    - For customer (consumer role): notifications come from the system inventory and their own personal storage (unique & isolated per customer).
    - For other roles (staff/admin/retail/warehouse/inspector): notifications come SOLELY from the system inventory (no personal storage).
    - Cleans up any obsolete informational notifications (e.g. promotional shared inventory items or good condition status updates).
    """
    # 0. Clean up obsolete non-spoilage notifications and legacy formatted titles for this user
    db.query(Notification).filter(
        Notification.user_id == user.id,
        or_(
            Notification.type.in_(["shared_inventory", "personal_status"]),
            Notification.title.ilike("%Shared Inventory Expiry%"),
            Notification.title.ilike("%Approaching Expiry%"),
            Notification.title.ilike("%Expired / Critical%")
        )
    ).delete(synchronize_session=False)

    is_customer = (user.role == UserRole.CONSUMER)

    # 1. Personal Storage Spoilage Alerts (Customer role only)
    if is_customer:
        personal_items = db.query(FoodItem).filter(
            FoodItem.user_id == user.id,
            FoodItem.is_personal == True,
            or_(
                FoodItem.freshness_score < 65.0,
                FoodItem.freshness_status.ilike("%spoil%"),
                FoodItem.spoilage_risk.ilike("%high%"),
                FoodItem.spoilage_risk.ilike("%medium%")
            )
        ).all()

        for item in personal_items:
            shelf_days = calculate_shelf_life_days(
                category=item.category,
                temp=item.storage_temperature or 4.0,
                humidity=item.humidity or 85.0
            )
            status_lower = (item.freshness_status or "").strip().lower()
            risk_lower = (item.spoilage_risk or "").strip().lower()

            # 1a. Completely Spoiled / Expired personal food
            is_spoiled = (
                shelf_days <= 0 or
                status_lower == "spoiled" or
                (item.freshness_score is not None and item.freshness_score < 30.0)
            )

            # 1b. Near Spoilage / High Risk
            is_near_spoilage = (
                shelf_days <= 3 or
                "near" in status_lower or
                risk_lower in ["high", "medium"] or
                (item.freshness_score is not None and item.freshness_score < 65.0)
            )

            if is_spoiled:
                existing_exp = db.query(Notification).filter(
                    Notification.user_id == user.id,
                    Notification.item_id == item.id,
                    Notification.type.in_(["personal_expired", "spoilage_critical"])
                ).first()

                if not existing_exp:
                    notif = Notification(
                        user_id=user.id,
                        title=f"Spoiled: {item.name}",
                        message=f"{item.name} in your storage (Lot #{item.batch_id}) has reached critical spoilage ({item.freshness_score or 0}% freshness score). Unsafe for consumption; dispose immediately.",
                        type="personal_expired",
                        scope="personal",
                        item_id=item.id,
                        batch_id=item.batch_id,
                        is_read=False
                    )
                    db.add(notif)
            elif is_near_spoilage:
                existing_warn = db.query(Notification).filter(
                    Notification.user_id == user.id,
                    Notification.item_id == item.id,
                    Notification.type.in_(["personal_expiry", "spoilage_warning"])
                ).first()

                if not existing_warn:
                    notif = Notification(
                        user_id=user.id,
                        title=f"Near Spoilage: {item.name}",
                        message=f"{item.name} in your storage (Lot #{item.batch_id}) is in Near Spoilage condition ({item.freshness_score or 0}% freshness score, ~{shelf_days} day(s) left). Immediate consumption or refrigeration recommended.",
                        type="personal_expiry",
                        scope="personal",
                        item_id=item.id,
                        batch_id=item.batch_id,
                        is_read=False
                    )
                    db.add(notif)
    else:
        # Non-customer roles do not have personal storage; purge any accidental personal notifications
        db.query(Notification).filter(
            Notification.user_id == user.id,
            Notification.scope == "personal"
        ).delete(synchronize_session=False)

    # 2. Shared System Inventory Spoilage Alerts (For ALL roles: customer & other roles)
    shared_spoilage_items = db.query(FoodItem).filter(
        FoodItem.is_personal == False,
        or_(
            FoodItem.freshness_score < 60.0,
            FoodItem.freshness_status.ilike("%spoil%"),
            FoodItem.spoilage_risk.ilike("%high%")
        )
    ).order_by(FoodItem.id.desc()).all()

    for item in shared_spoilage_items:
        shelf_days = calculate_shelf_life_days(
            category=item.category,
            temp=item.storage_temperature or 4.0,
            humidity=item.humidity or 85.0
        )
        status_lower = (item.freshness_status or "").strip().lower()

        is_spoiled = (
            shelf_days <= 0 or
            status_lower == "spoiled" or
            (item.freshness_score is not None and item.freshness_score < 30.0)
        )

        existing_alert = db.query(Notification).filter(
            Notification.user_id == user.id,
            Notification.item_id == item.id,
            Notification.type.in_(["shared_expiry", "spoilage_critical", "spoilage_warning"])
        ).first()

        if not existing_alert:
            if is_spoiled:
                title = f"Spoiled: {item.name}"
                msg = f"{item.name} in shared inventory (Lot #{item.batch_id}) has reached critical spoilage ({item.freshness_score or 0}% freshness score). Immediate quarantine and removal required."
                notif_type = "shared_expiry"
            else:
                title = f"Near Spoilage: {item.name}"
                msg = f"{item.name} in shared inventory (Lot #{item.batch_id}) is in Near Spoilage condition ({item.freshness_score or 0}% freshness score, ~{shelf_days} day(s) left). Discounting or distribution priority recommended."
                notif_type = "shared_expiry"

            notif = Notification(
                user_id=user.id,
                title=title,
                message=msg,
                type=notif_type,
                scope="shared",
                item_id=item.id,
                batch_id=item.batch_id,
                is_read=False
            )
            db.add(notif)

    try:
        db.commit()
    except Exception:
        db.rollback()


@router.get("", response_model=NotificationListResponse)
@router.get("/", response_model=NotificationListResponse)
def get_notifications(
    scope: Optional[str] = Query("all", description="Filter by 'all', 'personal', or 'shared'"),
    unread_only: bool = Query(False, description="Filter unread notifications only"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves in-app notifications for the logged-in user, automatically evaluating active conditions."""
    sync_notifications_for_user(db, current_user)

    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if current_user.role != UserRole.CONSUMER:
        # Non-consumer roles only have access to shared facility inventory notifications
        query = query.filter(Notification.scope == "shared")
    elif scope and scope.lower() in ["personal", "shared"]:
        query = query.filter(Notification.scope == scope.lower())

    if unread_only:
        query = query.filter(Notification.is_read == False)

    total = query.count()
    items = query.order_by(Notification.created_at.desc(), Notification.id.desc()).all()

    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()

    return NotificationListResponse(
        items=[NotificationResponse.model_validate(item) for item in items],
        total=total,
        unread_count=unread_count
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves only the unread count for fast badge polling/rendering."""
    sync_notifications_for_user(db, current_user)
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return UnreadCountResponse(unread_count=count)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marks a single notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification {notification_id} not found"
        )

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return NotificationResponse.model_validate(notif)


@router.post("/mark-all-read", status_code=status.HTTP_200_OK)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marks all notifications for current user as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}", status_code=status.HTTP_200_OK)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dismisses / deletes a notification."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification {notification_id} not found"
        )

    db.delete(notif)
    db.commit()
    return {"message": f"Notification {notification_id} deleted"}
