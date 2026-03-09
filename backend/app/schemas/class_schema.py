from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Request Schemas ──────────────────────────────────────────

class CreateClassRequest(BaseModel):
    name: str
    description: Optional[str] = None


# ── Response Schemas ─────────────────────────────────────────

class MemberResponse(BaseModel):
    user_id: str
    name: str
    email: str
    role: str
    avatar_url: Optional[str] = None


class ClassResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    educator_id: str
    cover_image_url: Optional[str] = None
    created_at: datetime


class ClassDetailResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    educator_id: str
    cover_image_url: Optional[str] = None
    created_at: datetime
    members: List[MemberResponse] = []