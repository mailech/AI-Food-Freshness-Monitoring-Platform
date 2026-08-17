from datetime import datetime
from pydantic import BaseModel, Field

class NotificationCreate(BaseModel):
    user_id: str | None = None
    role: str | None = None
    title: str
    message: str
    type: str

class NotificationResponse(BaseModel):
    id: str
    user_id: str | None = None
    role: str | None = None
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

class PreferenceResponse(BaseModel):
    user_id: str
    email_enabled: bool
    push_enabled: bool
    min_freshness_threshold: float
    storage_alerts_enabled: bool

class PreferenceUpdate(BaseModel):
    email_enabled: bool | None = None
    push_enabled: bool | None = None
    min_freshness_threshold: float | None = None
    storage_alerts_enabled: bool | None = None
