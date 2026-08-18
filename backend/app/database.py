"""
Database connection setup.

Using SQLite for now because it needs zero external setup - good for local
dev and demoing. Swapping to Postgres later just means changing DATABASE_URL
and the connect_args below (SQLite needs check_same_thread, Postgres doesn't).
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./food_freshness.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
