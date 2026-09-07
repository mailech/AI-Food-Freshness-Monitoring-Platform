import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/food_freshness_db"
)

def create_db_engine():
    global DATABASE_URL
    # Try PostgreSQL first if configured
    if not DATABASE_URL.startswith("sqlite"):
        try:
            eng = create_engine(
                DATABASE_URL,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10
            )
            # Test connection
            with eng.connect() as conn:
                pass
            print(f"[+] Connected to PostgreSQL database at {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
            return eng
        except Exception as e:
            print(f"[!] PostgreSQL connection unavailable ({e}). Falling back to SQLite local database.")
            DATABASE_URL = "sqlite:///./food_freshness.db"
    
    eng = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    print(f"[+] Initialized SQLite database engine at {DATABASE_URL}")
    return eng

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
