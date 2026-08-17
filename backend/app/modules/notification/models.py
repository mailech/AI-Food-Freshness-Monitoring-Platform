from datetime import datetime
from beanie import Document
from pydantic import Field

class Notification(Document):
    user_id: str | None = None
    role: str | None = None  # Gated role e.g. WAREHOUSE_OPERATOR, RETAIL_MANAGER
    title: str
    message: str
    type: str  # "freshness", "shelf-life", "spoilage", "storage", "inventory", "platform"
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "notifications"

class NotificationPreference(Document):
    user_id: str
    email_enabled: bool = True
    push_enabled: bool = True
    min_freshness_threshold: float = 50.0  # Alert if score goes below this
    storage_alerts_enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "notification_preferences"
