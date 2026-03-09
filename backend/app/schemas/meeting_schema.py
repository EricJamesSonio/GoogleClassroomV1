from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Request Schemas ──────────────────────────────────────────

class CreateMeetingRequest(BaseModel):
    title: str
    # Either provide a specific datetime OR relative minutes — not both
    scheduled_at: Optional[datetime] = None
    start_in_minutes: Optional[int] = None


# ── Response Schemas ─────────────────────────────────────────

class MeetingResponse(BaseModel):
    id: str
    class_id: str
    created_by: str
    title: str
    status: str
    scheduled_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    agora_channel: str
    recording_url: Optional[str] = None
    created_at: datetime