"""
conftest.py — Patches the database engine to use SQLite in-memory
BEFORE any backend module is imported, avoiding the psycopg2 dependency
during testing.
"""

import sys
import os

# Insert project root into path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ─────────────────────────────────────────────────
# Patch DATABASE_URL before any backend module loads
# ─────────────────────────────────────────────────
os.environ["DATABASE_URL"] = "sqlite:///./test_food_freshness.db"
os.environ["JWT_SECRET"] = "test-secret-key-for-pytest-only"
os.environ["REDIS_HOST"] = "localhost"
os.environ["MONGO_HOST"] = "localhost"

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

TEST_DB_URL = "sqlite:///./test_food_freshness.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables in the SQLite test database before tests run."""
    from backend.database import Base
    import backend.models.sql_models  # noqa: ensure all models are registered
    Base.metadata.create_all(bind=test_engine)
    yield
    # Dispose engine connections before cleanup (required on Windows)
    test_engine.dispose()
    # Best-effort cleanup — ignore if locked
    try:
        if os.path.exists("test_food_freshness.db"):
            os.remove("test_food_freshness.db")
    except PermissionError:
        pass  # Windows may still hold the file; it will be cleaned on next run


def _seed_categories():
    """Insert default food categories into the test SQLite database."""
    from backend.models.sql_models import FoodCategory
    db = TestingSessionLocal()
    try:
        if db.query(FoodCategory).count() == 0:
            cats = [
                FoodCategory(name="Fruits",         ideal_temp_min=0,   ideal_temp_max=15,  ideal_humidity_min=80, ideal_humidity_max=90, base_shelf_life_days=10),
                FoodCategory(name="Vegetables",     ideal_temp_min=0,   ideal_temp_max=10,  ideal_humidity_min=85, ideal_humidity_max=95, base_shelf_life_days=7),
                FoodCategory(name="Meat",           ideal_temp_min=-2,  ideal_temp_max=4,   ideal_humidity_min=75, ideal_humidity_max=85, base_shelf_life_days=4),
                FoodCategory(name="Milk",           ideal_temp_min=1,   ideal_temp_max=4,   ideal_humidity_min=70, ideal_humidity_max=80, base_shelf_life_days=7),
                FoodCategory(name="Bakery",         ideal_temp_min=15,  ideal_temp_max=25,  ideal_humidity_min=40, ideal_humidity_max=60, base_shelf_life_days=5),
                FoodCategory(name="Packaged Foods", ideal_temp_min=10,  ideal_temp_max=25,  ideal_humidity_min=30, ideal_humidity_max=50, base_shelf_life_days=180),
                FoodCategory(name="Eggs",           ideal_temp_min=2,   ideal_temp_max=12,  ideal_humidity_min=70, ideal_humidity_max=80, base_shelf_life_days=21),
            ]
            for c in cats:
                db.add(c)
            db.commit()
    finally:
        db.close()


@pytest.fixture(scope="session")
def test_app():
    """Return a FastAPI app with the DB dependency overridden to SQLite."""
    from backend.main import app
    from backend.database import get_db

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Seed categories after the override is wired so the same session is used
    _seed_categories()

    return app


@pytest.fixture(scope="session")
def client(test_app):
    """FastAPI TestClient wrapping the patched app."""
    from fastapi.testclient import TestClient
    with TestClient(test_app) as c:
        yield c
