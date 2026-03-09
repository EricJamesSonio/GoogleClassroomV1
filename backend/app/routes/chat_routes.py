from fastapi import APIRouter, WebSocket, Query, Depends
from app.websocket.meeting_chat import handle_meeting_chat, manager
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.message import MeetingMessage
from app.models.meeting import Meeting
from fastapi import HTTPException
from typing import List

router = APIRouter(tags=["Chat"])


@router.websocket("/ws/meetings/{meeting_id}")
async def meeting_chat_ws(
    websocket: WebSocket,
    meeting_id: str,
    token: str = Query(..., description="JWT access token"),
):
    await handle_meeting_chat(websocket, meeting_id, token)


@router.get("/meetings/{meeting_id}/messages")
async def get_chat_history(
    meeting_id: str,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
):
    meeting = await Meeting.get(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    skip = (page - 1) * limit
    messages = await MeetingMessage.find(
        MeetingMessage.meeting_id == meeting.id
    ).sort("+created_at").skip(skip).limit(limit).to_list()

    return {
        "page": page,
        "limit": limit,
        "messages": [
            {
                "id": str(m.id),
                "sender_id": str(m.sender_id),
                "sender_name": m.sender_name,
                "message": m.message,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
        "online_users": manager.get_online_users(meeting_id),
    }