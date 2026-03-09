from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Request Schemas ──────────────────────────────────────────

class CreateClassRequest(BaseModel):
    name: str
    description: Optional[str] = None


class InviteStudentRequest(BaseModel):
    email: EmailStr  # educator invites by student email


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


class InvitationResponse(BaseModel):
    id: str
    class_id: str
    class_name: str
    invited_by_name: str
    status: str
    created_at: datetime


class JoinRequestResponse(BaseModel):
    id: str
    class_id: str
    student_id: str
    student_name: str
    student_email: str
    status: str
    created_at: datetime