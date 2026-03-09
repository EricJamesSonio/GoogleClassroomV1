from fastapi import HTTPException
from app.models.meeting import Meeting
from app.models.meeting_invitation import MeetingInvitation
from app.models.class_member import ClassMember
from app.models.class_model import Class
from app.models.user import User
from app.schemas.meeting_schema import MeetingInvitationResponse, InviteToMeetingRequest


def _inv_to_response(inv: MeetingInvitation, meeting_title: str) -> MeetingInvitationResponse:
    return MeetingInvitationResponse(
        id=str(inv.id),
        meeting_id=str(inv.meeting_id),
        meeting_title=meeting_title,
        user_id=str(inv.user_id),
        invited_by=str(inv.invited_by),
        status=inv.status,
        created_at=inv.created_at,
    )


async def _get_meeting_or_404(meeting_id: str) -> Meeting:
    meeting = await Meeting.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


async def _assert_educator_owns_meeting(meeting: Meeting, educator: User):
    if str(meeting.created_by) != str(educator.id):
        raise HTTPException(status_code=403, detail="Only the meeting creator can manage invitations")


# ── Invite all class members ──────────────────────────────────

async def invite_all(meeting_id: str, educator: User):
    meeting = await _get_meeting_or_404(meeting_id)
    await _assert_educator_owns_meeting(meeting, educator)

    # Get all students in the class (exclude educator)
    memberships = await ClassMember.find(
        ClassMember.class_id == meeting.class_id,
        ClassMember.role == "student",
    ).to_list()

    if not memberships:
        return {"message": "No students in this class to invite"}

    inserted = 0
    for m in memberships:
        # Skip if already invited
        existing = await MeetingInvitation.find_one(
            MeetingInvitation.meeting_id == meeting.id,
            MeetingInvitation.user_id == m.user_id,
        )
        if not existing:
            await MeetingInvitation(
                meeting_id=meeting.id,
                user_id=m.user_id,
                invited_by=educator.id,
                status="invited",
            ).insert()
            inserted += 1

    return {"message": f"Invited {inserted} students"}


# ── Invite selected students ──────────────────────────────────

async def invite_selected(meeting_id: str, data: InviteToMeetingRequest, educator: User):
    meeting = await _get_meeting_or_404(meeting_id)
    await _assert_educator_owns_meeting(meeting, educator)

    inserted = 0
    for user_id in data.user_ids:
        student = await User.get(user_id)
        if not student or student.role != "student":
            continue

        existing = await MeetingInvitation.find_one(
            MeetingInvitation.meeting_id == meeting.id,
            MeetingInvitation.user_id == student.id,
        )
        if not existing:
            await MeetingInvitation(
                meeting_id=meeting.id,
                user_id=student.id,
                invited_by=educator.id,
                status="invited",
            ).insert()
            inserted += 1

    return {"message": f"Invited {inserted} students"}


# ── Student requests to join a meeting ───────────────────────

async def request_join_meeting(meeting_id: str, student: User):
    meeting = await _get_meeting_or_404(meeting_id)

    # Must be a class member to request
    membership = await ClassMember.find_one(
        ClassMember.class_id == meeting.class_id,
        ClassMember.user_id == student.id,
    )
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this class")

    existing = await MeetingInvitation.find_one(
        MeetingInvitation.meeting_id == meeting.id,
        MeetingInvitation.user_id == student.id,
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"You already have a {existing.status} invitation for this meeting")

    await MeetingInvitation(
        meeting_id=meeting.id,
        user_id=student.id,
        invited_by=student.id,
        status="requested",
    ).insert()

    return {"message": "Join request sent"}


# ── Educator views join requests ──────────────────────────────

async def get_meeting_requests(meeting_id: str, educator: User) -> list[MeetingInvitationResponse]:
    meeting = await _get_meeting_or_404(meeting_id)
    await _assert_educator_owns_meeting(meeting, educator)

    requests = await MeetingInvitation.find(
        MeetingInvitation.meeting_id == meeting.id,
        MeetingInvitation.status == "requested",
    ).to_list()

    return [_inv_to_response(r, meeting.title) for r in requests]


# ── Accept / Reject meeting invitation (by student) ──────────

async def accept_meeting_invitation(invitation_id: str, student: User):
    inv = await MeetingInvitation.get(invitation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if str(inv.user_id) != str(student.id):
        raise HTTPException(status_code=403, detail="Not your invitation")

    if inv.status != "invited":
        raise HTTPException(status_code=400, detail=f"Invitation is already {inv.status}")

    inv.status = "accepted"
    await inv.save()
    return {"message": "Invitation accepted"}


async def reject_meeting_invitation(invitation_id: str, student: User):
    inv = await MeetingInvitation.get(invitation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if str(inv.user_id) != str(student.id):
        raise HTTPException(status_code=403, detail="Not your invitation")

    if inv.status != "invited":
        raise HTTPException(status_code=400, detail=f"Invitation is already {inv.status}")

    inv.status = "rejected"
    await inv.save()
    return {"message": "Invitation rejected"}


# ── Educator accepts/rejects a join request ───────────────────

async def accept_meeting_request(invitation_id: str, educator: User):
    inv = await MeetingInvitation.get(invitation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Request not found")

    meeting = await _get_meeting_or_404(str(inv.meeting_id))
    await _assert_educator_owns_meeting(meeting, educator)

    if inv.status != "requested":
        raise HTTPException(status_code=400, detail=f"Request is already {inv.status}")

    inv.status = "accepted"
    await inv.save()
    return {"message": "Join request accepted"}


async def reject_meeting_request(invitation_id: str, educator: User):
    inv = await MeetingInvitation.get(invitation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Request not found")

    meeting = await _get_meeting_or_404(str(inv.meeting_id))
    await _assert_educator_owns_meeting(meeting, educator)

    if inv.status != "requested":
        raise HTTPException(status_code=400, detail=f"Request is already {inv.status}")

    inv.status = "rejected"
    await inv.save()
    return {"message": "Join request rejected"}


# ── Student views their meeting invitations ───────────────────

async def get_my_meeting_invitations(student: User) -> list[MeetingInvitationResponse]:
    invitations = await MeetingInvitation.find(
        MeetingInvitation.user_id == student.id,
        MeetingInvitation.status == "invited",
    ).to_list()

    result = []
    for inv in invitations:
        meeting = await Meeting.get(inv.meeting_id)
        if meeting:
            result.append(_inv_to_response(inv, meeting.title))
    return result