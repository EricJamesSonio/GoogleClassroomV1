from fastapi import WebSocket, WebSocketDisconnect
from typing import Optional
from app.core.security import decode_access_token
from app.models.user import User
from app.models.meeting import Meeting
from app.models.message import MeetingMessage
from app.models.meeting_invitation import MeetingInvitation
from beanie import PydanticObjectId
from datetime import datetime, timezone


class ConnectionManager:
    def __init__(self):
        # meeting_id → list of (websocket, user) tuples
        self.active: dict[str, list[tuple[WebSocket, User]]] = {}

    async def connect(self, meeting_id: str, ws: WebSocket, user: User):
        await ws.accept()
        if meeting_id not in self.active:
            self.active[meeting_id] = []
        self.active[meeting_id].append((ws, user))

    def disconnect(self, meeting_id: str, ws: WebSocket):
        if meeting_id in self.active:
            self.active[meeting_id] = [
                (w, u) for w, u in self.active[meeting_id] if w != ws
            ]

    async def broadcast(self, meeting_id: str, message: dict):
        if meeting_id not in self.active:
            return
        dead = []
        for ws, user in self.active[meeting_id]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        # Clean up dead connections
        for ws in dead:
            self.disconnect(meeting_id, ws)

    def get_online_users(self, meeting_id: str) -> list[dict]:
        if meeting_id not in self.active:
            return []
        return [
            {"user_id": str(u.id), "name": u.name, "avatar_url": u.avatar_url}
            for _, u in self.active[meeting_id]
        ]


manager = ConnectionManager()


async def _authenticate(token: str) -> User | None:
    """Decode JWT and return User, or None if invalid."""
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return await User.get(user_id)


async def _can_join_chat(meeting: Meeting, user: User) -> bool:
    """Check user is allowed in this meeting chat."""
    # Meeting creator always allowed
    if str(meeting.created_by) == str(user.id):
        return True

    # Must have accepted invitation
    invitation = await MeetingInvitation.find_one(
        MeetingInvitation.meeting_id == meeting.id,
        MeetingInvitation.user_id == user.id,
        MeetingInvitation.status.in_(["accepted", "invited"]),
    )
    return invitation is not None


async def handle_meeting_chat(websocket: WebSocket, meeting_id: str, token: str):
    # Authenticate
    user = await _authenticate(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Validate meeting
    meeting = await Meeting.get(meeting_id)
    if not meeting:
        await websocket.close(code=4004, reason="Meeting not found")
        return

    if meeting.status == "ended":
        await websocket.close(code=4003, reason="Meeting has ended")
        return

    # Authorize
    allowed = await _can_join_chat(meeting, user)
    if not allowed:
        await websocket.close(code=4003, reason="Not invited to this meeting")
        return

    # Connect
    await manager.connect(meeting_id, websocket, user)

    # Send last 50 messages as history on connect
    history = await MeetingMessage.find(
        MeetingMessage.meeting_id == meeting.id
    ).sort("+created_at").limit(50).to_list()

    await websocket.send_json({
        "type": "history",
        "messages": [
            {
                "id": str(m.id),
                "sender_id": str(m.sender_id),
                "sender_name": m.sender_name,
                "message": m.message,
                "created_at": m.created_at.isoformat(),
            }
            for m in history
        ],
        "online_users": manager.get_online_users(meeting_id),
    })

    # Broadcast join event to others
    await manager.broadcast(meeting_id, {
        "type": "user_joined",
        "user_id": str(user.id),
        "name": user.name,
        "online_users": manager.get_online_users(meeting_id),
    })

    try:
        while True:
            data = await websocket.receive_json()
            msg_text = data.get("message", "").strip()

            if not msg_text:
                continue

            # Persist to DB
            msg = MeetingMessage(
                meeting_id=meeting.id,
                sender_id=user.id,
                sender_name=user.name,
                message=msg_text,
                created_at=datetime.now(timezone.utc),
            )
            await msg.insert()

            # Broadcast to all in meeting
            await manager.broadcast(meeting_id, {
                "type": "message",
                "id": str(msg.id),
                "sender_id": str(user.id),
                "sender_name": user.name,
                "message": msg_text,
                "created_at": msg.created_at.isoformat(),
            })

    except WebSocketDisconnect:
        manager.disconnect(meeting_id, websocket)
        await manager.broadcast(meeting_id, {
            "type": "user_left",
            "user_id": str(user.id),
            "name": user.name,
            "online_users": manager.get_online_users(meeting_id),
        })