from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency - yields a DB session, closes after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_exists() -> bool:
    """Check if tables already exist in the database."""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    return len(tables) > 0


def init_db():
    """
    Initialize database.
    - If tables already exist → skip everything
    - If fresh database → create tables + run seeds
    """
    from app.models import user, classroom, membership, meeting, comment  # noqa

    if check_db_exists():
        print("✅ Database already exists — skipping init and seeding.")
        return False  # signals: already existed, did nothing

    print("🛠️  Fresh database detected — creating tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created.")
    return True  # signals: was fresh, tables just created