from fastapi import APIRouter, Depends
from app.schemas.meeting_schema import CreateMeetingRequest, MeetingResponse
from app.services.meeting_service import create_meeting, get_class_meetings, get_meeting, end_meeting
from app.core.dependencies import get_current_user, require_educator
from app.models.user import User
from typing import List

router = APIRouter(tags=["Meetings"])


@router.post("/classes/{class_id}/meetings", response_model=MeetingResponse)
async def create(
    class_id: str,
    data: CreateMeetingRequest,
    educator: User = Depends(require_educator),
):
    return await create_meeting(class_id, data, educator)


@router.get("/classes/{class_id}/meetings", response_model=List[MeetingResponse])
async def list_meetings(
    class_id: str,
    current_user: User = Depends(get_current_user),
):
    return await get_class_meetings(class_id, current_user)


@router.get("/meetings/{meeting_id}", response_model=MeetingResponse)
async def get_one(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
):
    return await get_meeting(meeting_id, current_user)


@router.patch("/meetings/{meeting_id}/end", response_model=MeetingResponse)
async def end(
    meeting_id: str,
    educator: User = Depends(require_educator),
):
    return await end_meeting(meeting_id, educator)