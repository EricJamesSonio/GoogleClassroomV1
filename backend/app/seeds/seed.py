from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.models.user import User, UserRole
from app.models.classroom import Classroom
from app.models.membership import ClassMembership, MembershipStatus, MembershipRole
from app.models.meeting import VideoMeeting, MeetingStatus
from app.models.comment import Comment, CommentType
import random
import string

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def generate_invite_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def run_seeds(db: Session):
    """
    Only seeds if the users table is completely empty.
    If any users exist → database is not fresh → skip everything.
    """
    if db.query(User).first() is not None:
        print("⏭️  Data already exists — skipping seeds.")
        return

    print("🌱 Seeding database...")

    # -------------------------
    # USERS
    # -------------------------
    users = [
        User(
            name="John Smith",
            email="john@classroom.dev",
            password_hash=pwd_context.hash("password123"),
            role=UserRole.educator,
        ),
        User(
            name="Jane Doe",
            email="jane@classroom.dev",
            password_hash=pwd_context.hash("password123"),
            role=UserRole.educator,
        ),
        User(
            name="Alice Johnson",
            email="alice@classroom.dev",
            password_hash=pwd_context.hash("password123"),
            role=UserRole.student,
        ),
        User(
            name="Bob Williams",
            email="bob@classroom.dev",
            password_hash=pwd_context.hash("password123"),
            role=UserRole.student,
        ),
        User(
            name="Charlie Brown",
            email="charlie@classroom.dev",
            password_hash=pwd_context.hash("password123"),
            role=UserRole.student,
        ),
    ]
    db.add_all(users)
    db.commit()
    for u in users:
        db.refresh(u)
    print(f"  ✅ {len(users)} users created")

    # -------------------------
    # CLASSROOMS
    # -------------------------
    classrooms = [
        Classroom(
            title="Introduction to Python",
            description="Learn Python from scratch. Variables, loops, functions and more.",
            invite_code=generate_invite_code(),
            educator_id=users[0].id,
        ),
        Classroom(
            title="Web Development Basics",
            description="HTML, CSS, and JavaScript fundamentals.",
            invite_code=generate_invite_code(),
            educator_id=users[1].id,
        ),
    ]
    db.add_all(classrooms)
    db.commit()
    for c in classrooms:
        db.refresh(c)
    print(f"  ✅ {len(classrooms)} classrooms created")

    # -------------------------
    # MEMBERSHIPS
    # -------------------------
    memberships = [
        ClassMembership(
            class_id=classrooms[0].id,
            user_id=users[2].id,
            role_in_class=MembershipRole.student,
            status=MembershipStatus.accepted,
        ),
        ClassMembership(
            class_id=classrooms[0].id,
            user_id=users[3].id,
            role_in_class=MembershipRole.student,
            status=MembershipStatus.accepted,
        ),
        ClassMembership(
            class_id=classrooms[0].id,
            user_id=users[4].id,        # Charlie - pending
            role_in_class=MembershipRole.student,
            status=MembershipStatus.pending,
        ),
        ClassMembership(
            class_id=classrooms[1].id,
            user_id=users[2].id,
            role_in_class=MembershipRole.student,
            status=MembershipStatus.accepted,
        ),
    ]
    db.add_all(memberships)
    db.commit()
    print(f"  ✅ {len(memberships)} memberships created")

    # -------------------------
    # MEETINGS
    # -------------------------
    meetings = [
        VideoMeeting(
            class_id=classrooms[0].id,
            created_by_id=users[0].id,
            title="Week 1 - Python Basics",
            description="Introduction to variables, data types, and print statements.",
            status=MeetingStatus.ended,
            is_recorded=False,
        ),
        VideoMeeting(
            class_id=classrooms[0].id,
            created_by_id=users[0].id,
            title="Week 2 - Loops and Functions",
            description="For loops, while loops, and writing your first functions.",
            status=MeetingStatus.scheduled,
        ),
        VideoMeeting(
            class_id=classrooms[1].id,
            created_by_id=users[1].id,
            title="HTML & CSS Fundamentals",
            description="Building your first webpage.",
            status=MeetingStatus.scheduled,
        ),
    ]
    db.add_all(meetings)
    db.commit()
    for m in meetings:
        db.refresh(m)
    print(f"  ✅ {len(meetings)} meetings created")

    # -------------------------
    # COMMENTS
    # -------------------------
    comments = [
        Comment(
            user_id=users[0].id,
            class_id=classrooms[0].id,
            meeting_id=None,
            content="Welcome to Introduction to Python! Please make sure you have Python 3.10+ installed.",
            comment_type=CommentType.class_post,
        ),
        Comment(
            user_id=users[2].id,
            class_id=classrooms[0].id,
            meeting_id=None,
            content="Hi! Really excited to start learning Python.",
            comment_type=CommentType.class_post,
        ),
        Comment(
            user_id=users[2].id,
            class_id=None,
            meeting_id=meetings[0].id,
            content="Great session! The variables part was very clear.",
            comment_type=CommentType.meeting_comment,
        ),
        Comment(
            user_id=users[3].id,
            class_id=None,
            meeting_id=meetings[0].id,
            content="When is the next meeting scheduled?",
            comment_type=CommentType.meeting_comment,
        ),
    ]
    db.add_all(comments)
    db.commit()
    print(f"  ✅ {len(comments)} comments created")

    print("\n🎉 Seeding complete!")
    print("\n📋 Sample accounts (password: password123)")
    print("  Educators : john@classroom.dev | jane@classroom.dev")
    print("  Students  : alice@classroom.dev | bob@classroom.dev | charlie@classroom.dev (pending)")