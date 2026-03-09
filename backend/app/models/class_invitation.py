from beanie import Document, PydanticObjectId
from datetime import datetime, timezone


class ClassInvitation(Document):
    class_id: PydanticObjectId
    student_id: PydanticObjectId
    invited_by: PydanticObjectId
    # "pending"   = educator invited student
    # "requested" = student requested to join
    # "accepted" | "rejected"
    status: str = "pending"
    created_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "class_invitations"