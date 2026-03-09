import time
import hashlib
import httpx
from fastapi import HTTPException
from app.core.config import settings
from app.models.meeting import Meeting
from app.models.meeting_invitation import MeetingInvitation
from app.models.user import User
from datetime import datetime, timezone

try:
    from agora_token_builder import RtcTokenBuilder, Role_Publisher
    AGORA_AVAILABLE = True
except ImportError:
    AGORA_AVAILABLE = False


def _user_id_to_uid(user_id: str) -> int:
    return int(hashlib.md5(user_id.encode()).hexdigest()[:8], 16) % (2**31)


async def _assert_can_join(meeting: Meeting, user: User):
    if meeting.status != "live":
        raise HTTPException(
            status_code=400,
            detail=f"Meeting is not live yet — status is '{meeting.status}'"
        )
    if str(meeting.created_by) == str(user.id):
        return

    invitation = await MeetingInvitation.find_one(
        MeetingInvitation.meeting_id == meeting.id,
        MeetingInvitation.user_id == user.id,
        MeetingInvitation.status == "accepted",
    )
    if invitation:
        return

    invited = await MeetingInvitation.find_one(
        MeetingInvitation.meeting_id == meeting.id,
        MeetingInvitation.user_id == user.id,
        MeetingInvitation.status == "invited",
    )
    if invited:
        invited.status = "accepted"
        await invited.save()
        return

    raise HTTPException(status_code=403, detail="You are not invited to this meeting")


async def get_agora_token(meeting_id: str, current_user: User) -> dict:
    meeting = await Meeting.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    await _assert_can_join(meeting, current_user)
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


# ── Cloud Recording ───────────────────────────────────────────

AGORA_RECORDING_URL = "https://api.agora.io/v1/apps/{app_id}/cloud_recording"


def _recording_headers():
    import base64
    credentials = base64.b64encode(
        f"{settings.AGORA_CUSTOMER_KEY}:{settings.AGORA_CUSTOMER_SECRET}".encode()
    ).decode()
    return {
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
    }


async def start_recording(meeting_id: str, educator: User) -> dict:
    meeting = await Meeting.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if str(meeting.created_by) != str(educator.id):
        raise HTTPException(status_code=403, detail="Only the meeting creator can start recording")

    if meeting.status != "live":
        raise HTTPException(status_code=400, detail="Can only record a live meeting")

    if meeting.recording_resource_id:
        raise HTTPException(status_code=409, detail="Recording already in progress")

    if not settings.AGORA_APP_ID or not settings.AGORA_CUSTOMER_KEY:
        # Dev mode — mock recording
        meeting.recording_resource_id = "mock_resource_id"
        meeting.recording_sid = "mock_sid"
        await meeting.save()
        return {"message": "Mock recording started (Agora keys not configured)", "recording": True}

    base_url = AGORA_RECORDING_URL.format(app_id=settings.AGORA_APP_ID)
    uid = _user_id_to_uid(str(educator.id))

    async with httpx.AsyncClient() as client:
        # Step 1: Acquire resource ID
        acquire_res = await client.post(
            f"{base_url}/acquire",
            headers=_recording_headers(),
            json={
                "cname": meeting.agora_channel,
                "uid": str(uid),
                "clientRequest": {"resourceExpiredHour": 24},
            },
        )
        if acquire_res.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Agora acquire failed: {acquire_res.text}")

        resource_id = acquire_res.json()["resourceId"]

        # Step 2: Start recording
        start_res = await client.post(
            f"{base_url}/resourceid/{resource_id}/mode/mix/start",
            headers=_recording_headers(),
            json={
                "cname": meeting.agora_channel,
                "uid": str(uid),
                "clientRequest": {
                    "token": "",
                    "recordingConfig": {
                        "maxIdleTime": 30,
                        "streamTypes": 2,
                        "channelType": 0,
                        "videoStreamType": 0,
                        "transcodingConfig": {
                            "height": 640,
                            "width": 360,
                            "bitrate": 500,
                            "fps": 15,
                            "mixedVideoLayout": 1,
                        },
                    },
                    "storageConfig": {
                        "vendor": settings.AGORA_STORAGE_VENDOR,
                        "region": settings.AGORA_STORAGE_REGION,
                        "bucket": settings.AGORA_STORAGE_BUCKET,
                        "accessKey": settings.AGORA_STORAGE_ACCESS_KEY,
                        "secretKey": settings.AGORA_STORAGE_SECRET_KEY,
                    },
                },
            },
        )
        if start_res.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Agora start failed: {start_res.text}")

        sid = start_res.json()["sid"]

    meeting.recording_resource_id = resource_id
    meeting.recording_sid = sid
    await meeting.save()

    return {"message": "Recording started", "recording": True}


async def stop_recording(meeting_id: str, educator: User) -> dict:
    meeting = await Meeting.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if str(meeting.created_by) != str(educator.id):
        raise HTTPException(status_code=403, detail="Only the meeting creator can stop recording")

    if not meeting.recording_resource_id or not meeting.recording_sid:
        raise HTTPException(status_code=400, detail="No active recording to stop")

    if not settings.AGORA_APP_ID or not settings.AGORA_CUSTOMER_KEY:
        # Dev mode — mock stop
        meeting.recording_resource_id = None
        meeting.recording_sid = None
        meeting.recording_url = "https://mock-recording-url.com/recording.mp4"
        await meeting.save()
        return {"message": "Mock recording stopped", "recording_url": meeting.recording_url}

    base_url = AGORA_RECORDING_URL.format(app_id=settings.AGORA_APP_ID)
    uid = _user_id_to_uid(str(educator.id))

    async with httpx.AsyncClient() as client:
        stop_res = await client.post(
            f"{base_url}/resourceid/{meeting.recording_resource_id}/sid/{meeting.recording_sid}/mode/mix/stop",
            headers=_recording_headers(),
            json={
                "cname": meeting.agora_channel,
                "uid": str(uid),
                "clientRequest": {},
            },
        )
        if stop_res.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Agora stop failed: {stop_res.text}")

        data = stop_res.json()
        file_list = data.get("serverResponse", {}).get("fileList", [])
        recording_url = file_list[0].get("fileName", "") if file_list else ""

    meeting.recording_resource_id = None
    meeting.recording_sid = None
    meeting.recording_url = recording_url
    await meeting.save()

    return {"message": "Recording stopped", "recording_url": recording_url}