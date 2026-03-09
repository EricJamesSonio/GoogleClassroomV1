from beanie import Document, PydanticObjectId
from datetime import datetime, timezone


class MeetingMessage(Document):
    meeting_id: PydanticObjectId
    sender_id: PydanticObjectId
    sender_name: str
    message: str
    created_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "meeting_messages"