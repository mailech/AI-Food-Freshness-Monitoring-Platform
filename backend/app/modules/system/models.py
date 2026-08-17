from datetime import datetime
from typing import Optional, Any
from beanie import Document
from pydantic import Field

class SystemLog(Document):
    action: str
    user_id: Optional[str] = None
    details: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "system_logs"
