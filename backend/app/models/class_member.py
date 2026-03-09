from beanie import Document, PydanticObjectId
from datetime import datetime, timezone


class ClassMember(Document):
    class_id: PydanticObjectId
    user_id: PydanticObjectId
    role: str  # "student" | "educator"
    joined_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "class_members"