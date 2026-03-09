from beanie import Document
from pydantic import EmailStr
from datetime import datetime, timezone
from typing import Optional


class User(Document):
    name: str
    email: EmailStr
    password_hash: str
    role: str  # "student" | "educator"
    avatar_url: Optional[str] = None
    created_at: datetime = datetime.now(timezone.utc)

    class Settings:
        name = "users"