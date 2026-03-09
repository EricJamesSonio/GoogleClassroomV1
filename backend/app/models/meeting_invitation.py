from beanie import Document
from bson import ObjectId
from datetime import datetime, timezone


class MeetingInvitation(Document):
    meeting_id: ObjectId
    user_id: ObjectId
    invited_by: ObjectId
    # "invited" | "requested" | "accepted" | "rejected"
    status: str = "invited"
    created_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "meeting_invitations"