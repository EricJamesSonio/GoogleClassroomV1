import time
import hashlib
import logging
from fastapi import HTTPException
from app.core.config import settings
from app.models.meeting import Meeting
from app.models.meeting_invitation import MeetingInvitation
from app.models.class_member import ClassMember
from app.models.user import User

logger = logging.getLogger(__name__)

try:
    from agora_token_builder import RtcTokenBuilder
    Role_Publisher = 1
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

    is_creator = str(meeting.created_by) == str(current_user.id)
    logger.info(f"[agora-token] user={current_user.id} meeting={meeting_id} is_creator={is_creator}")

    if not is_creator:
        invitation = await MeetingInvitation.find_one(
            MeetingInvitation.meeting_id == meeting.id,
            MeetingInvitation.user_id == current_user.id,
        )
        logger.info(f"[agora-token] invitation found: {invitation.status if invitation else 'NONE'}")

        if invitation is None:
            # No invitation — check class membership
            membership = await ClassMember.find_one(
                ClassMember.class_id == meeting.class_id,
                ClassMember.user_id == current_user.id,
            )
            logger.info(f"[agora-token] class membership found: {membership is not None}")
            if not membership:
                raise HTTPException(status_code=403, detail="You are not a member of this class")
            # Auto-create accepted invitation
            invitation = MeetingInvitation(
                meeting_id=meeting.id,
                user_id=current_user.id,
                invited_by=current_user.id,
                status="accepted",
            )
            await invitation.insert()
            logger.info(f"[agora-token] auto-created invitation for class member")

        elif invitation.status == "rejected":
            raise HTTPException(status_code=403, detail="Your invitation was rejected")

        elif invitation.status in ("invited", "requested"):
            invitation.status = "accepted"
            await invitation.save()
            logger.info(f"[agora-token] auto-accepted invitation")

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