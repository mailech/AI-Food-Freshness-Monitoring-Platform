"""Shared fixtures: SQLite in-memory DB + FastAPI TestClient (no lifespan)."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # register all models
from app.db import Base, get_db
from app.routers import analytics, auth, images, inventory, notifications, recommendations, reports, storage

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    Base.metadata.create_all(bind=engine)
    from app.models.inventory import FoodCategory

    with TestingSessionLocal() as session:
        for name in ["Fruits", "Vegetables", "Dairy", "Meat & Poultry"]:
            session.add(FoodCategory(name=name))
        session.commit()


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client(db_session):
    test_app = FastAPI()
    for router in (auth.router, inventory.router, images.router, storage.router, recommendations.router, analytics.router, notifications.router, reports.router):
        test_app.include_router(router, prefix="/api/v1")

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    test_app.dependency_overrides[get_db] = override_get_db
    return TestClient(test_app, raise_server_exceptions=False)


USER_COUNTER = [0]


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    from app.routers.auth import auth_limiter

    auth_limiter.reset()
    yield
    auth_limiter.reset()


@pytest.fixture(autouse=True)
def stub_inference(monkeypatch):
    """Avoid loading TensorFlow in tests; return a deterministic assessment."""
    from app.ml.inference import AssessmentResult

    def fake_assess(file_bytes: bytes) -> AssessmentResult:
        return AssessmentResult(
            predicted_class="freshapples",
            is_fresh=True,
            confidence=0.9,
            spoilage_probability=0.1,
            freshness_score=88.0,
            category="Fresh",
        )

    monkeypatch.setattr("app.routers.images.assess_image", fake_assess)


@pytest.fixture
def auth_headers(client):
    """Register + login a fresh user; return bearer headers."""
    USER_COUNTER[0] += 1
    email = f"user{USER_COUNTER[0]}@example.com"
    res = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Passw0rd!", "full_name": "Test User"},
    )
    assert res.status_code == 201, res.text
    res = client.post("/api/v1/auth/login", json={"email": email, "password": "Passw0rd!"})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, email


@pytest.fixture
def second_user_headers(client):
    USER_COUNTER[0] += 1
    email = f"other{USER_COUNTER[0]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Passw0rd!", "full_name": "Other User"},
    )
    token = client.post("/api/v1/auth/login", json={"email": email, "password": "Passw0rd!"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def item_id(client, auth_headers):
    headers, _ = auth_headers
    cats = client.get("/api/v1/inventory/categories", headers=headers).json()
    res = client.post(
        "/api/v1/inventory/items",
        headers=headers,
        json={"name": "Apple", "category_id": cats[0]["id"]},
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]
