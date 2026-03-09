from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

Base = declarative_base()

engine = None
SessionLocal = None


def get_db_name_from_url(url: str) -> str:
    return url.rsplit('/', 1)[-1]


def get_default_url(url: str) -> str:
    base = url.rsplit('/', 1)[0]
    return f'{base}/postgres'


def ensure_database_exists() -> bool:
    db_name = get_db_name_from_url(settings.DATABASE_URL)
    default_url = get_default_url(settings.DATABASE_URL)
    default_engine = create_engine(default_url, isolation_level='AUTOCOMMIT')
    try:
        with default_engine.connect() as conn:
            result = conn.execute(text('SELECT 1 FROM pg_database WHERE datname = :name'), {'name': db_name})
            exists = result.fetchone() is not None
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                print(f'Database {db_name} created.')
                return False
            else:
                return True
    finally:
        default_engine.dispose()


def setup_engine():
    global engine, SessionLocal
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_tables_exist() -> bool:
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    return len(tables) > 0


def init_db() -> bool:
    from app.models import user, classroom, membership, meeting, comment  # noqa
    db_already_existed = ensure_database_exists()
    setup_engine()
    if db_already_existed and check_tables_exist():
        print('Database already initialized - skipping.')
        return False
    print('Creating tables...')
    Base.metadata.create_all(bind=engine)
    print('All tables created.')
    return True
