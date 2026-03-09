from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.models.user import User, UserRole
from app.models.classroom import Classroom
from app.models.membership import ClassMembership, MembershipStatus, MembershipRole
import random
import string

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def generate_invite_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def run_seeds(db: Session):
    # Only seed if users table is empty
    if db.query(User).first() is not None:
        print("⏭️  Seed data already exists, skipping.")
        return

    print("🌱 Running seed data...")

    # --- Sample Users ---
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

    print(f"  ✅ Created {len(users)} users")

    # --- Sample Classrooms ---
    classrooms = [
        Classroom(
            title="Introduction to Python",
            description="Learn Python from scratch. Variables, loops, functions and more.",
            invite_code=generate_invite_code(),
            educator_id=users[0].id,  # John is the teacher
        ),
        Classroom(
            title="Web Development Basics",
            description="HTML, CSS, and JavaScript fundamentals.",
            invite_code=generate_invite_code(),
            educator_id=users[1].id,  # Jane is the teacher
        ),
    ]

    db.add_all(classrooms)
    db.commit()
    for c in classrooms:
        db.refresh(c)

    print(f"  ✅ Created {len(classrooms)} classrooms")

    # --- Sample Memberships ---
    # Alice and Bob are accepted students in Python class
    # Charlie is pending in Python class
    # Alice is accepted in Web Dev class
    memberships = [
        ClassMembership(
            class_id=classrooms[0].id,
            user_id=users[2].id,  # Alice
            role_in_class=MembershipRole.student,
            status=MembershipStatus.accepted,
        ),
        ClassMembership(
            class_id=classrooms[0].id,
            user_id=users[3].id,  # Bob
            role_in_class=MembershipRole.student,
            status=MembershipStatus.accepted,
        ),
        ClassMembership(
            class_id=classrooms[0].id,
            user_id=users[4].id,  # Charlie - pending
            role_in_class=MembershipRole.student,
            status=MembershipStatus.pending,
        ),
        ClassMembership(
            class_id=classrooms[1].id,
            user_id=users[2].id,  # Alice in web dev too
            role_in_class=MembershipRole.student,
            status=MembershipStatus.accepted,
        ),
    ]

    db.add_all(memberships)
    db.commit()

    print(f"  ✅ Created {len(memberships)} memberships")
    print("🎉 Seeding complete!")
    print("\n📋 Sample accounts (all passwords: password123):")
    print("  Educators: john@classroom.dev, jane@classroom.dev")
    print("  Students:  alice@classroom.dev, bob@classroom.dev, charlie@classroom.dev")