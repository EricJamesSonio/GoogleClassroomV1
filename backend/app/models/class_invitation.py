from beanie import Document
from bson import ObjectId
from datetime import datetime, timezone


class ClassInvitation(Document):
    class_id: ObjectId
    student_id: ObjectId
    invited_by: ObjectId
    # "pending"   = educator invited student
    # "requested" = student requested to join
    # "accepted" | "rejected"
    status: str = "pending"
    created_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "class_invitations"