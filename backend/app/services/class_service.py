from fastapi import HTTPException, status
from app.models.class_model import Class
from app.models.class_member import ClassMember
from app.models.user import User
from app.schemas.class_schema import CreateClassRequest, ClassResponse, ClassDetailResponse, MemberResponse
from beanie import PydanticObjectId


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
    # Create the class
    new_class = Class(
        name=data.name,
        description=data.description,
        educator_id=educator.id,
    )
    await new_class.insert()

    # Auto-add educator as a member
    await ClassMember(
        class_id=new_class.id,
        user_id=educator.id,
        role="educator",
    ).insert()

    return _class_to_response(new_class)


async def get_my_classes(current_user: User) -> list[ClassResponse]:
    # Get all class_member records for this user
    memberships = await ClassMember.find(
        ClassMember.user_id == current_user.id
    ).to_list()

    if not memberships:
        return []

    class_ids = [m.class_id for m in memberships]

    # Fetch all those classes
    classes = await Class.find({"_id": {"$in": class_ids}}).to_list()

    return [_class_to_response(c) for c in classes]


async def get_class_detail(class_id: str, current_user: User) -> ClassDetailResponse:
    # Validate class exists
    cls = await Class.get(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    # Check current user is a member
    membership = await ClassMember.find_one(
        ClassMember.class_id == cls.id,
        ClassMember.user_id == current_user.id,
    )
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this class")

    # Get all members
    memberships = await ClassMember.find(ClassMember.class_id == cls.id).to_list()
    user_ids = [m.user_id for m in memberships]
    users = await User.find({"_id": {"$in": user_ids}}).to_list()

    # Map user_id → user for quick lookup
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