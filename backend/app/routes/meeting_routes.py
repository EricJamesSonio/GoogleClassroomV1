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


# ── Meeting Invitations ───────────────────────────────────────
from app.schemas.meeting_schema import InviteToMeetingRequest, MeetingInvitationResponse
from app.services.meeting_invitation_service import (
    invite_all, invite_selected, request_join_meeting,
    get_meeting_requests, accept_meeting_invitation, reject_meeting_invitation,
    accept_meeting_request, reject_meeting_request, get_my_meeting_invitations,
)
from app.core.dependencies import require_student


@router.post("/meetings/{meeting_id}/invite-all")
async def invite_all_members(
    meeting_id: str,
    educator: User = Depends(require_educator),
):
    return await invite_all(meeting_id, educator)


@router.post("/meetings/{meeting_id}/invite")
async def invite_selected_students(
    meeting_id: str,
    data: InviteToMeetingRequest,
    educator: User = Depends(require_educator),
):
    return await invite_selected(meeting_id, data, educator)


@router.post("/meetings/{meeting_id}/request-join")
async def request_join(
    meeting_id: str,
    student: User = Depends(require_student),
):
    return await request_join_meeting(meeting_id, student)


@router.get("/meetings/{meeting_id}/requests", response_model=List[MeetingInvitationResponse])
async def view_requests(
    meeting_id: str,
    educator: User = Depends(require_educator),
):
    return await get_meeting_requests(meeting_id, educator)


@router.get("/meeting-invitations", response_model=List[MeetingInvitationResponse])
async def my_meeting_invitations(
    student: User = Depends(require_student),
):
    return await get_my_meeting_invitations(student)


@router.post("/meeting-invitations/{invitation_id}/accept")
async def accept_inv(
    invitation_id: str,
    student: User = Depends(require_student),
):
    return await accept_meeting_invitation(invitation_id, student)


@router.post("/meeting-invitations/{invitation_id}/reject")
async def reject_inv(
    invitation_id: str,
    student: User = Depends(require_student),
):
    return await reject_meeting_invitation(invitation_id, student)


@router.post("/meeting-requests/{invitation_id}/accept")
async def accept_req(
    invitation_id: str,
    educator: User = Depends(require_educator),
):
    return await accept_meeting_request(invitation_id, educator)


@router.post("/meeting-requests/{invitation_id}/reject")
async def reject_req(
    invitation_id: str,
    educator: User = Depends(require_educator),
):
    return await reject_meeting_request(invitation_id, educator)


# ── Agora Token ───────────────────────────────────────────────
from app.services.agora_service import get_agora_token


@router.get("/meetings/{meeting_id}/agora-token")
async def agora_token(
    meeting_id: str,
    current_user: User = Depends(get_current_user),
):
    return await get_agora_token(meeting_id, current_user)