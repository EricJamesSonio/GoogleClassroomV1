from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.models.user import User
from app.models.class_model import Class
from app.models.class_member import ClassMember
from app.models.class_invitation import ClassInvitation
from app.models.meeting import Meeting
from app.models.meeting_invitation import MeetingInvitation
from app.models.message import MeetingMessage

ALL_MODELS = [
    User, Class, ClassMember, ClassInvitation,
    Meeting, MeetingInvitation, MeetingMessage,
]


async def init_db():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]

    await init_beanie(database=db, document_models=ALL_MODELS)

    existing_users = await User.find_all().to_list()
    if not existing_users:
        print("🌱 Fresh database detected — running seeds...")
        await _seed_users()
        print("✅ Seeding complete.")
    else:
        print("✅ Database already initialized — skipping seed.")


async def _seed_users():
    from app.seeds.user_seeds import get_seed_users
    from datetime import datetime, timezone

    seed_data = get_seed_users()
    users = [
        User(
            name=u["name"],
            email=u["email"],
            password_hash=u["password_hash"],
            role=u["role"],
            created_at=datetime.now(timezone.utc),
        )
        for u in seed_data
    ]
    await User.insert_many(users)
    print(f"   → Inserted {len(users)} users")