from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Create engine
engine = create_engine(settings.DATABASE_URL)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class all models will inherit from
Base = declarative_base()


def get_db():
    """Dependency - yields a DB session, closes after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables from models if they don't exist yet."""
    # Import all models here so Base knows about them
    from app.models import user, classroom, membership, meeting, comment  # noqa
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created.")