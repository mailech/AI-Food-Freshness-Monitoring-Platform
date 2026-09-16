"""Pytest fixtures.

Every test runs against a **fresh, isolated SQLite database** in a temp
directory, with uploads and reports redirected there too, so tests never touch
development data and can run in parallel processes.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Configure the environment *before* app modules are imported, because
# `Settings` is instantiated at import time.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("ENVIRONMENT", "testing")
os.environ.setdefault("DEMO_MODE", "true")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
os.environ.setdefault("JWT_SECRET_KEY", "test-only-secret-not-used-anywhere-else")
os.environ.setdefault("LOG_LEVEL", "WARNING")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _isolate_filesystem(tmp_path_factory):
    """Point uploads, reports and the model path at a temp directory."""
    root = tmp_path_factory.mktemp("ffm")
    from app.config import settings

    settings.UPLOAD_DIR = str(root / "uploads")
    settings.REPORT_DIR = str(root / "reports")
    settings.MODEL_PATH = str(root / "models")
    settings.ensure_directories()

    from app.services.storage_backend import reset_storage

    reset_storage()
    yield root


@pytest.fixture(scope="function")
def db_engine(tmp_path):
    """A per-test in-memory SQLite engine shared across connections."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    from app.models import Base

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db(db_engine):
    """A session bound to the per-test engine."""
    Session = sessionmaker(bind=db_engine, autoflush=False, expire_on_commit=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_engine):
    """TestClient with `get_db` overridden to the per-test engine."""
    from app.database import get_db
    from app.main import app

    Session = sessionmaker(bind=db_engine, autoflush=False, expire_on_commit=False)

    def _override():
        session = Session()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def seeded(db):
    """Roles, categories and one user per role."""
    from app.auth import service as auth_service
    from app.core.enums import RoleName
    from app.inventory.categories import sync_categories

    auth_service.ensure_roles(db)
    sync_categories(db)

    users = {}
    for role in RoleName:
        user = auth_service.register_user(
            db,
            email=f"{role.value.lower()}@test.example.com",
            password="Test@1234",
            full_name=f"{role.value.title()} Tester",
            role_name=role.value,
            allow_privileged=True,
        )
        users[role.value] = user
    db.commit()
    return users


@pytest.fixture(scope="function")
def auth_headers(client, seeded):
    """`{ROLE: {'Authorization': 'Bearer ...'}}` for every role."""
    headers = {}
    for role in seeded:
        response = client.post(
            "/api/v1/auth/login",
            json={"username": f"{role.lower()}@test.example.com", "password": "Test@1234"},
        )
        assert response.status_code == 200, response.text
        token = response.json()["tokens"]["access_token"]
        headers[role] = {"Authorization": f"Bearer {token}"}
    return headers


@pytest.fixture(scope="function")
def manager_headers(auth_headers):
    return auth_headers["RETAIL_MANAGER"]


@pytest.fixture(scope="function")
def admin_headers(auth_headers):
    return auth_headers["ADMIN"]


@pytest.fixture(scope="function")
def consumer_headers(auth_headers):
    return auth_headers["CONSUMER"]


@pytest.fixture(scope="function")
def product(client, manager_headers):
    """A FRUITS product created through the API."""
    response = client.post(
        "/api/v1/products",
        json={
            "name": "Test Mango",
            "category_slug": "FRUITS",
            "brand": "Test Farms",
            "default_unit": "kg",
            "shelf_life_days": 6,
        },
        headers=manager_headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture(scope="function")
def batch(client, manager_headers, product):
    """A batch stored slightly too warm, so compliance rules have something to say."""
    response = client.post(
        "/api/v1/batches",
        json={
            "product_id": product["id"],
            "quantity": 20,
            "temperature_c": 9.5,
            "humidity_pct": 93,
            "packaging_type": "LOOSE",
            "air_circulation": "POOR",
            "storage_location": "Cold Room A",
            "cost_per_unit": 2.5,
        },
        headers=manager_headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture(scope="session")
def sample_image_bytes():
    """A synthetic 'mouldy bread' JPEG - triggers real detections."""
    from app.sample_images import generate_sample_image

    return generate_sample_image("mouldy_bread")


@pytest.fixture(scope="session")
def fresh_image_bytes():
    from app.sample_images import generate_sample_image

    return generate_sample_image("fresh_tomato")
