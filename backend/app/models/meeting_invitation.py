from beanie import Document, PydanticObjectId
from datetime import datetime, timezone


class MeetingInvitation(Document):
    meeting_id: PydanticObjectId
    user_id: PydanticObjectId
    invited_by: PydanticObjectId
    # "invited" | "requested" | "accepted" | "rejected"
    status: str = "invited"
    created_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "meeting_invitations"