from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    item_id: Optional[int]
    type: str
    severity: str
    title: str
    message: str
    is_read: bool
    emailed: bool
    created_at: datetime


class SyncResult(BaseModel):
    created: int
    emailed: bool
    active_alerts: int
