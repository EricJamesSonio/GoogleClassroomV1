from fastapi import APIRouter, Depends
from app.schemas.class_schema import (
    CreateClassRequest, ClassResponse, ClassDetailResponse,
    InviteStudentRequest, InvitationResponse, JoinRequestResponse
)
from app.services.class_service import (
    create_class, get_my_classes, get_class_detail,
    invite_student, get_my_invitations, accept_invitation, reject_invitation,
    request_to_join, get_join_requests, accept_join_request, reject_join_request,
)
from app.core.dependencies import get_current_user, require_educator, require_student
from app.models.user import User
from typing import List

router = APIRouter(tags=["Classes"])


# ── Classes ───────────────────────────────────────────────────

@router.post("/classes", response_model=ClassResponse)
async def create(
    data: CreateClassRequest,
    educator: User = Depends(require_educator),
):
    return await create_class(data, educator)


@router.get("/classes", response_model=List[ClassResponse])
async def list_classes(current_user: User = Depends(get_current_user)):
    return await get_my_classes(current_user)


@router.get("/classes/{class_id}", response_model=ClassDetailResponse)
async def get_detail(
    class_id: str,
    current_user: User = Depends(get_current_user),
):
    return await get_class_detail(class_id, current_user)


# ── Educator: Invite & Manage Requests ───────────────────────

@router.post("/classes/{class_id}/invite")
async def invite(
    class_id: str,
    data: InviteStudentRequest,
    educator: User = Depends(require_educator),
):
    return await invite_student(class_id, data, educator)


@router.get("/classes/{class_id}/join-requests", response_model=List[JoinRequestResponse])
async def view_join_requests(
    class_id: str,
    educator: User = Depends(require_educator),
):
    return await get_join_requests(class_id, educator)


@router.post("/join-requests/{request_id}/accept")
async def accept_request(
    request_id: str,
    educator: User = Depends(require_educator),
):
    return await accept_join_request(request_id, educator)


@router.post("/join-requests/{request_id}/reject")
async def reject_request(
    request_id: str,
    educator: User = Depends(require_educator),
):
    return await reject_join_request(request_id, educator)


# ── Student: Invitations & Join Requests ─────────────────────

@router.get("/invitations", response_model=List[InvitationResponse])
async def my_invitations(student: User = Depends(require_student)):
    return await get_my_invitations(student)


@router.post("/invitations/{invitation_id}/accept")
async def accept_inv(
    invitation_id: str,
    student: User = Depends(require_student),
):
    return await accept_invitation(invitation_id, student)


@router.post("/invitations/{invitation_id}/reject")
async def reject_inv(
    invitation_id: str,
    student: User = Depends(require_student),
):
    return await reject_invitation(invitation_id, student)


@router.post("/classes/{class_id}/request-join")
async def request_join(
    class_id: str,
    student: User = Depends(require_student),
):
    return await request_to_join(class_id, student)