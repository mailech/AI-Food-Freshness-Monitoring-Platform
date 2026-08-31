from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from urllib.parse import quote_plus

DB_USER = "postgres"
DB_PASSWORD = "rihana@12345"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "food_freshness_db"

encoded_password = quote_plus(DB_PASSWORD)

DATABASE_URL = (
    f"postgresql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()