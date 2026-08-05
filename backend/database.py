from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

_url = settings.DATABASE_URL
_is_sqlite = _url.startswith("sqlite")

# SQLite requires check_same_thread=False; PostgreSQL uses pooling params
if _is_sqlite:
    engine = create_engine(
        _url,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        _url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

# Create sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base
Base = declarative_base()

def get_db():
    """
    Dependency generator for FastAPI routes to inject database sessions.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
