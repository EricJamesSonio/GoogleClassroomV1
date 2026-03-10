import time
import hashlib
from fastapi import HTTPException
from app.core.config import settings
from app.models.meeting import Meeting
from app.models.meeting_invitation import MeetingInvitation
from app.models.user import User

try:
    from agora_token_builder import RtcTokenBuilder
    Role_Publisher = 1  # agora-token-builder v1.0.0 uses integer roles
    AGORA_AVAILABLE = True
except ImportError:
    AGORA_AVAILABLE = False


def _user_id_to_uid(user_id: str) -> int:
    return int(hashlib.md5(user_id.encode()).hexdigest()[:8], 16) % (2**31)


async def get_agora_token(meeting_id: str, current_user: User) -> dict:
    meeting = await Meeting.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if meeting.status != "live":
        raise HTTPException(status_code=400, detail=f"Meeting is not live yet — status is '{meeting.status}'")

    if str(meeting.created_by) != str(current_user.id):
        invitation = await MeetingInvitation.find_one(
            MeetingInvitation.meeting_id == meeting.id,
            MeetingInvitation.user_id == current_user.id,
            MeetingInvitation.status == "accepted",
        )
        if invitation is None:
            invited = await MeetingInvitation.find_one(
                MeetingInvitation.meeting_id == meeting.id,
                MeetingInvitation.user_id == current_user.id,
                MeetingInvitation.status == "invited",
            )
            if invited:
                invited.status = "accepted"
                await invited.save()
            else:
                raise HTTPException(status_code=403, detail="You are not invited to this meeting")

    uid = _user_id_to_uid(str(current_user.id))

    if not AGORA_AVAILABLE or not settings.AGORA_APP_ID or not settings.AGORA_APP_CERT:
        return {
            "token": "dev_mock_token",
            "channel": meeting.agora_channel,
            "app_id": settings.AGORA_APP_ID or "dev_app_id",
            "uid": uid,
            "warning": "Agora keys not configured — using mock token for dev",
        }

    expiry = int(time.time()) + 3600
    token = RtcTokenBuilder.buildTokenWithUid(
        settings.AGORA_APP_ID,
        settings.AGORA_APP_CERT,
        meeting.agora_channel,
        uid,
        Role_Publisher,
        expiry,
    )

    return {
        "token": token,
        "channel": meeting.agora_channel,
        "app_id": settings.AGORA_APP_ID,
        "uid": uid,
    }