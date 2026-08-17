from datetime import datetime
from app.modules.notification.models import Notification, NotificationPreference
from app.modules.notification.schemas import NotificationCreate, PreferenceUpdate

class NotificationService:
    @staticmethod
    async def create_notification(data: NotificationCreate) -> Notification:
        # Create and save notification document
        notification = Notification(
            user_id=data.user_id,
            role=data.role,
            title=data.title,
            message=data.message,
            type=data.type,
            is_read=False,
            created_at=datetime.utcnow()
        )
        await notification.insert()
        
        # Simulating external Email/Push hook triggers
        # print(f"[PUSH SIMULATION] Alert triggered: {data.title} - {data.message}")
        return notification

    @staticmethod
    async def get_notifications_for_user(user_id: str | None, role: str | None, unread_only: bool = False) -> list[Notification]:
        # Filter matching specific user_id OR the active user role
        filters = {}
        if unread_only:
            filters["is_read"] = False

        # Support both role-gated notifications and direct user-gated notifications
        # Since Beanie find accepts dictionaries
        query = []
        if user_id:
            query.append({"user_id": user_id})
        if role:
            query.append({"role": role})
        
        if query:
            filters["$or"] = query
        else:
            # default fallback: return public platform alerts
            filters["role"] = None
            filters["user_id"] = None

        results = await Notification.find(filters).sort("-created_at").to_list()
        return results

    @staticmethod
    async def mark_as_read(notification_id: str) -> bool:
        notification = await Notification.get(notification_id)
        if not notification:
            return False
        notification.is_read = True
        await notification.save()
        return True

    @staticmethod
    async def mark_all_read(user_id: str | None, role: str | None) -> int:
        filters = {"is_read": False}
        query = []
        if user_id:
            query.append({"user_id": user_id})
        if role:
            query.append({"role": role})
        
        if query:
            filters["$or"] = query
            
        notifications = await Notification.find(filters).to_list()
        count = 0
        for n in notifications:
            n.is_read = True
            await n.save()
            count += 1
        return count

    @staticmethod
    async def get_or_create_preference(user_id: str) -> NotificationPreference:
        pref = await NotificationPreference.find_one({"user_id": user_id})
        if not pref:
            pref = NotificationPreference(
                user_id=user_id,
                email_enabled=True,
                push_enabled=True,
                min_freshness_threshold=50.0,
                storage_alerts_enabled=True
            )
            await pref.insert()
        return pref

    @staticmethod
    async def update_preference(user_id: str, data: PreferenceUpdate) -> NotificationPreference:
        pref = await NotificationService.get_or_create_preference(user_id)
        if data.email_enabled is not None:
            pref.email_enabled = data.email_enabled
        if data.push_enabled is not None:
            pref.push_enabled = data.push_enabled
        if data.min_freshness_threshold is not None:
            pref.min_freshness_threshold = data.min_freshness_threshold
        if data.storage_alerts_enabled is not None:
            pref.storage_alerts_enabled = data.storage_alerts_enabled
        await pref.save()
        return pref
