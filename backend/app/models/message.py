from beanie import Document
from bson import ObjectId
from datetime import datetime, timezone


class MeetingMessage(Document):
    meeting_id: ObjectId
    sender_id: ObjectId
    sender_name: str
    message: str
    created_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "meeting_messages"