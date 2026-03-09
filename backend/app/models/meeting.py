from beanie import Document
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional


class Meeting(Document):
    class_id: ObjectId
    created_by: ObjectId
    title: str
    status: str = "scheduled"  # "scheduled" | "live" | "ended"
    scheduled_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    agora_channel: str
    recording_resource_id: Optional[str] = None
    recording_sid: Optional[str] = None
    recording_url: Optional[str] = None
    created_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "meetings"