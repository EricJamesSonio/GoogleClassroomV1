from fastapi import WebSocket, WebSocketDisconnect
from app.core.security import decode_access_token
from app.models.user import User
from app.models.meeting import Meeting
from app.models.message import MeetingMessage
from app.models.meeting_invitation import MeetingInvitation
from app.models.class_member import ClassMember
from datetime import datetime, timezone


class ConnectionManager:
    def __init__(self):
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
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return await User.get(user_id)


async def _ensure_authorized(meeting: Meeting, user: User) -> bool:
    """
    Allow if:
    - user is the meeting creator, OR
    - user has any non-rejected invitation, OR
    - user is a class member (auto-create accepted invitation)
    """
    if str(meeting.created_by) == str(user.id):
        return True

    invitation = await MeetingInvitation.find_one(
        MeetingInvitation.meeting_id == meeting.id,
        MeetingInvitation.user_id == user.id,
    )

    if invitation:
        if invitation.status == "rejected":
            return False
        if invitation.status in ("invited", "requested"):
            invitation.status = "accepted"
            await invitation.save()
        return True

    # No invitation — check class membership and auto-allow
    membership = await ClassMember.find_one(
        ClassMember.class_id == meeting.class_id,
        ClassMember.user_id == user.id,
    )
    if membership:
        await MeetingInvitation(
            meeting_id=meeting.id,
            user_id=user.id,
            invited_by=user.id,
            status="accepted",
        ).insert()
        return True

    return False


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
    allowed = await _ensure_authorized(meeting, user)
    if not allowed:
        await websocket.close(code=4003, reason="Not authorized for this meeting")
        return

    # Connect
    await manager.connect(meeting_id, websocket, user)

    # Send history
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

    # Announce join
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

            msg = MeetingMessage(
                meeting_id=meeting.id,
                sender_id=user.id,
                sender_name=user.name,
                message=msg_text,
                created_at=datetime.now(timezone.utc),
            )
            await msg.insert()

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