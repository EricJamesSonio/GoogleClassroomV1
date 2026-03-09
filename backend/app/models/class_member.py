from beanie import Document
from bson import ObjectId
from datetime import datetime, timezone


class ClassMember(Document):
    class_id: ObjectId
    user_id: ObjectId
    role: str  # "student" | "educator"
    joined_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "class_members"