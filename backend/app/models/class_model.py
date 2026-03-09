from beanie import Document
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional


class Class(Document):
    name: str
    description: Optional[str] = None
    educator_id: ObjectId
    cover_image_url: Optional[str] = None
    created_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "classes"