from fastapi import HTTPException
from datetime import datetime, timedelta, timezone
from app.models.meeting import Meeting
from app.models.class_model import Class
from app.models.class_member import ClassMember
from app.models.user import User
from app.schemas.meeting_schema import CreateMeetingRequest, MeetingResponse
from app.scheduler.meeting_scheduler import schedule_meeting_start
import uuid


def _meeting_to_response(m: Meeting) -> MeetingResponse:
    return MeetingResponse(
        id=str(m.id),
        class_id=str(m.class_id),
        created_by=str(m.created_by),
        title=m.title,
        status=m.status,
        scheduled_at=m.scheduled_at,
        started_at=m.started_at,
        ended_at=m.ended_at,
        agora_channel=m.agora_channel,
        recording_url=m.recording_url,
        created_at=m.created_at,
    )


async def create_meeting(class_id: str, data: CreateMeetingRequest, educator: User) -> MeetingResponse:
    # Validate class exists and belongs to this educator
    cls = await Class.get(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    if str(cls.educator_id) != str(educator.id):
        raise HTTPException(status_code=403, detail="Only the class educator can create meetings")

    # Resolve scheduled_at
    if data.scheduled_at:
        scheduled_at = data.scheduled_at
    elif data.start_in_minutes is not None:
        scheduled_at = datetime.now(timezone.utc) + timedelta(minutes=data.start_in_minutes)
    else:
        raise HTTPException(status_code=400, detail="Provide either 'scheduled_at' or 'start_in_minutes'")

    if scheduled_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")

    # Generate unique Agora channel name
    agora_channel = f"meeting_{uuid.uuid4().hex[:16]}"

    meeting = Meeting(
        class_id=cls.id,
        created_by=educator.id,
        title=data.title,
        status="scheduled",
        scheduled_at=scheduled_at,
        agora_channel=agora_channel,
    )
    await meeting.insert()

    # Register auto-start job with APScheduler
    schedule_meeting_start(str(meeting.id), scheduled_at)

    return _meeting_to_response(meeting)


async def get_class_meetings(class_id: str, current_user: User) -> list[MeetingResponse]:
    # Must be a class member
    cls = await Class.get(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    membership = await ClassMember.find_one(
        ClassMember.class_id == cls.id,
        ClassMember.user_id == current_user.id,
    )
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this class")

    meetings = await Meeting.find(Meeting.class_id == cls.id).to_list()
    return [_meeting_to_response(m) for m in meetings]


async def get_meeting(meeting_id: str, current_user: User) -> MeetingResponse:
    meeting = await Meeting.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Must be a class member
    membership = await ClassMember.find_one(
        ClassMember.class_id == meeting.class_id,
        ClassMember.user_id == current_user.id,
    )
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this class")

    return _meeting_to_response(meeting)


async def end_meeting(meeting_id: str, educator: User) -> MeetingResponse:
    meeting = await Meeting.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if str(meeting.created_by) != str(educator.id):
        raise HTTPException(status_code=403, detail="Only the meeting creator can end it")

    if meeting.status == "ended":
        raise HTTPException(status_code=400, detail="Meeting already ended")

    meeting.status = "ended"
    meeting.ended_at = datetime.now(timezone.utc)
    await meeting.save()

    return _meeting_to_response(meeting)