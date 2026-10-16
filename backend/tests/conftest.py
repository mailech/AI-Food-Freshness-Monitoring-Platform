import pytest
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
import app.database as app_db
import app.models
from app.database import Base, get_db
from app.main import app

# Create completely isolated SQLite in-memory engine for automated tests
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Monkey-patch app.database engine and SessionLocal so all tests use isolated in-memory DB
app_db.engine = test_engine
app_db.SessionLocal = TestSessionLocal


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Initializes the schema in isolated SQLite in-memory database."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(autouse=True)
def override_get_db():
    """Overrides FastAPI get_db dependency to point to SQLite in-memory test database."""
    def _test_get_db():
        db = TestSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _test_get_db
    yield
    app.dependency_overrides.clear()
