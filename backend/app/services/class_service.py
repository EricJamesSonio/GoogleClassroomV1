from fastapi import HTTPException, status
from app.models.class_model import Class
from app.models.class_member import ClassMember
from app.models.class_invitation import ClassInvitation
from app.models.user import User
from app.schemas.class_schema import (
    CreateClassRequest, ClassResponse, ClassDetailResponse,
    MemberResponse, InviteStudentRequest, InvitationResponse, JoinRequestResponse
)


def _class_to_response(c: Class) -> ClassResponse:
    return ClassResponse(
        id=str(c.id),
        name=c.name,
        description=c.description,
        educator_id=str(c.educator_id),
        cover_image_url=c.cover_image_url,
        created_at=c.created_at,
    )


async def create_class(data: CreateClassRequest, educator: User) -> ClassResponse:
    new_class = Class(
        name=data.name,
        description=data.description,
        educator_id=educator.id,
    )
    await new_class.insert()

    # Auto-add educator as member
    await ClassMember(
        class_id=new_class.id,
        user_id=educator.id,
        role="educator",
    ).insert()

    return _class_to_response(new_class)


async def get_my_classes(current_user: User) -> list[ClassResponse]:
    memberships = await ClassMember.find(
        ClassMember.user_id == current_user.id
    ).to_list()

    if not memberships:
        return []

    class_ids = [m.class_id for m in memberships]
    classes = await Class.find({"_id": {"$in": class_ids}}).to_list()
    return [_class_to_response(c) for c in classes]


async def get_class_detail(class_id: str, current_user: User) -> ClassDetailResponse:
    cls = await Class.get(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    membership = await ClassMember.find_one(
        ClassMember.class_id == cls.id,
        ClassMember.user_id == current_user.id,
    )
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this class")

    memberships = await ClassMember.find(ClassMember.class_id == cls.id).to_list()
    user_ids = [m.user_id for m in memberships]
    users = await User.find({"_id": {"$in": user_ids}}).to_list()
    user_map = {str(u.id): u for u in users}

    members = []
    for m in memberships:
        u = user_map.get(str(m.user_id))
        if u:
            members.append(MemberResponse(
                user_id=str(u.id),
                name=u.name,
                email=u.email,
                role=m.role,
                avatar_url=u.avatar_url,
            ))

    return ClassDetailResponse(
        id=str(cls.id),
        name=cls.name,
        description=cls.description,
        educator_id=str(cls.educator_id),
        cover_image_url=cls.cover_image_url,
        created_at=cls.created_at,
        members=members,
    )


# ── Invitations ───────────────────────────────────────────────

async def invite_student(class_id: str, data: InviteStudentRequest, educator: User):
    cls = await Class.get(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    # Must be the class owner
    if str(cls.educator_id) != str(educator.id):
        raise HTTPException(status_code=403, detail="Only the class educator can invite students")

    # Find student by email
    student = await User.find_one(User.email == data.email)
    if not student:
        raise HTTPException(status_code=404, detail="No user found with that email")

    if student.role != "student":
        raise HTTPException(status_code=400, detail="Can only invite students")

    # Check not already a member
    already_member = await ClassMember.find_one(
        ClassMember.class_id == cls.id,
        ClassMember.user_id == student.id,
    )
    if already_member:
        raise HTTPException(status_code=409, detail="Student is already a member")

    # Check no pending invite already
    existing_invite = await ClassInvitation.find_one(
        ClassInvitation.class_id == cls.id,
        ClassInvitation.student_id == student.id,
        ClassInvitation.status == "pending",
    )
    if existing_invite:
        raise HTTPException(status_code=409, detail="Student already has a pending invitation")

    await ClassInvitation(
        class_id=cls.id,
        student_id=student.id,
        invited_by=educator.id,
        status="pending",
    ).insert()

    return {"message": f"Invitation sent to {student.email}"}


async def get_my_invitations(student: User) -> list[InvitationResponse]:
    invitations = await ClassInvitation.find(
        ClassInvitation.student_id == student.id,
        ClassInvitation.status == "pending",
    ).to_list()

    result = []
    for inv in invitations:
        cls = await Class.get(inv.class_id)
        inviter = await User.get(inv.invited_by)
        if cls and inviter:
            result.append(InvitationResponse(
                id=str(inv.id),
                class_id=str(inv.class_id),
                class_name=cls.name,
                invited_by_name=inviter.name,
                status=inv.status,
                created_at=inv.created_at,
            ))
    return result


async def accept_invitation(invitation_id: str, student: User):
    inv = await ClassInvitation.get(invitation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if str(inv.student_id) != str(student.id):
        raise HTTPException(status_code=403, detail="Not your invitation")

    if inv.status != "pending":
        raise HTTPException(status_code=400, detail=f"Invitation is already {inv.status}")

    # Check not already a member (safety guard)
    already_member = await ClassMember.find_one(
        ClassMember.class_id == inv.class_id,
        ClassMember.user_id == student.id,
    )
    if not already_member:
        await ClassMember(
            class_id=inv.class_id,
            user_id=student.id,
            role="student",
        ).insert()

    inv.status = "accepted"
    await inv.save()

    return {"message": "Invitation accepted, you are now a member"}


async def reject_invitation(invitation_id: str, student: User):
    inv = await ClassInvitation.get(invitation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if str(inv.student_id) != str(student.id):
        raise HTTPException(status_code=403, detail="Not your invitation")

    if inv.status != "pending":
        raise HTTPException(status_code=400, detail=f"Invitation is already {inv.status}")

    inv.status = "rejected"
    await inv.save()

    return {"message": "Invitation rejected"}


# ── Join Requests ─────────────────────────────────────────────

async def request_to_join(class_id: str, student: User):
    cls = await Class.get(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    # Check not already a member
    already_member = await ClassMember.find_one(
        ClassMember.class_id == cls.id,
        ClassMember.user_id == student.id,
    )
    if already_member:
        raise HTTPException(status_code=409, detail="You are already a member")

    # Check no existing request
    existing = await ClassInvitation.find_one(
        ClassInvitation.class_id == cls.id,
        ClassInvitation.student_id == student.id,
        ClassInvitation.status == "requested",
    )
    if existing:
        raise HTTPException(status_code=409, detail="You already have a pending join request")

    # invited_by = student themselves to mark it as a request
    await ClassInvitation(
        class_id=cls.id,
        student_id=student.id,
        invited_by=student.id,
        status="requested",
    ).insert()

    return {"message": "Join request sent to educator"}


async def get_join_requests(class_id: str, educator: User) -> list[JoinRequestResponse]:
    cls = await Class.get(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    if str(cls.educator_id) != str(educator.id):
        raise HTTPException(status_code=403, detail="Only the class educator can view join requests")

    requests = await ClassInvitation.find(
        ClassInvitation.class_id == cls.id,
        ClassInvitation.status == "requested",
    ).to_list()

    result = []
    for req in requests:
        student = await User.get(req.student_id)
        if student:
            result.append(JoinRequestResponse(
                id=str(req.id),
                class_id=str(req.class_id),
                student_id=str(student.id),
                student_name=student.name,
                student_email=student.email,
                status=req.status,
                created_at=req.created_at,
            ))
    return result


async def accept_join_request(request_id: str, educator: User):
    req = await ClassInvitation.get(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    cls = await Class.get(req.class_id)
    if not cls or str(cls.educator_id) != str(educator.id):
        raise HTTPException(status_code=403, detail="Not your class")

    if req.status != "requested":
        raise HTTPException(status_code=400, detail=f"Request is already {req.status}")

    already_member = await ClassMember.find_one(
        ClassMember.class_id == req.class_id,
        ClassMember.user_id == req.student_id,
    )
    if not already_member:
        await ClassMember(
            class_id=req.class_id,
            user_id=req.student_id,
            role="student",
        ).insert()

    req.status = "accepted"
    await req.save()

    return {"message": "Join request accepted"}


async def reject_join_request(request_id: str, educator: User):
    req = await ClassInvitation.get(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    cls = await Class.get(req.class_id)
    if not cls or str(cls.educator_id) != str(educator.id):
        raise HTTPException(status_code=403, detail="Not your class")

    if req.status != "requested":
        raise HTTPException(status_code=400, detail=f"Request is already {req.status}")

    req.status = "rejected"
    await req.save()

    return {"message": "Join request rejected"}