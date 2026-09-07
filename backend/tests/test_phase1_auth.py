import os
import pytest
import app.models
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup dedicated file-based test DB
TEST_DATABASE_URL = "sqlite:///./test_phase1.db"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db_phase1():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_and_cleanup_db():
    app.dependency_overrides[get_db] = override_get_db_phase1
    Base.metadata.create_all(bind=test_engine)
    yield
    db = TestingSessionLocal()
    try:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def test_signup_all_roles():
    roles_to_test = [
        ("Alice Consumer", "alice@example.com", "consumer", "consumer"),
        ("Bob Retail", "bob@example.com", "retail_manager", "retail_manager"),
        ("Charlie Warehouse", "charlie@example.com", "warehouse_operator", "warehouse_operator"),
        ("Diana Quality", "diana@example.com", "quality_inspector", "food_quality_inspector"),
        ("Evan Admin", "evan@example.com", "administrator", "admin"),
    ]

    for name, email, input_role, expected_role in roles_to_test:
        response = client.post(
            "/auth/signup",
            json={
                "full_name": name,
                "email": email,
                "password": "Password123!",
                "role": input_role
            }
        )
        assert response.status_code == 201, f"Failed for role {input_role}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == expected_role


def test_duplicate_email_rejection_case_insensitive():
    res1 = client.post(
        "/auth/signup",
        json={
            "full_name": "Jane Doe",
            "email": "Jane@X.com",
            "password": "Password123!",
            "role": "consumer"
        }
    )
    assert res1.status_code == 201

    res2 = client.post(
        "/auth/signup",
        json={
            "full_name": "Jane Clone",
            "email": "jane@x.com",
            "password": "Password123!",
            "role": "consumer"
        }
    )
    assert res2.status_code == 400
    assert "already registered" in res2.json()["detail"]


def test_bcrypt_72_byte_limit_validation():
    valid_72_pw = "a" * 72
    res_valid = client.post(
        "/auth/signup",
        json={
            "full_name": "Max Password User",
            "email": "maxpw@example.com",
            "password": valid_72_pw,
            "role": "consumer"
        }
    )
    assert res_valid.status_code == 201

    login_res = client.post(
        "/auth/login",
        json={
            "email": "maxpw@example.com",
            "password": valid_72_pw
        }
    )
    assert login_res.status_code == 200

    over_72_pw = "a" * 73
    res_invalid = client.post(
        "/auth/signup",
        json={
            "full_name": "Too Long Password User",
            "email": "toolongpw@example.com",
            "password": over_72_pw,
            "role": "consumer"
        }
    )
    assert res_invalid.status_code == 422


def test_login_success_and_wrong_password():
    client.post(
        "/auth/signup",
        json={
            "full_name": "Login User",
            "email": "login@example.com",
            "password": "CorrectPassword123!",
            "role": "consumer"
        }
    )

    bad_res = client.post(
        "/auth/login",
        json={
            "email": "LOGIN@EXAMPLE.COM",
            "password": "WrongPassword!"
        }
    )
    assert bad_res.status_code == 401

    good_res = client.post(
        "/auth/login",
        json={
            "email": "LOGIN@EXAMPLE.COM",
            "password": "CorrectPassword123!"
        }
    )
    assert good_res.status_code == 200
    assert "access_token" in good_res.json()


def test_protected_me_endpoint():
    unauth_res = client.get("/auth/me")
    assert unauth_res.status_code == 401

    signup_res = client.post(
        "/auth/signup",
        json={
            "full_name": "Me User",
            "email": "me@example.com",
            "password": "Password123!",
            "role": "consumer"
        }
    )
    token = signup_res.json()["access_token"]

    auth_res = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert auth_res.status_code == 200
    assert auth_res.json()["email"] == "me@example.com"


def test_rbac_admin_route():
    c_res = client.post(
        "/auth/signup",
        json={
            "full_name": "Consumer User",
            "email": "c@example.com",
            "password": "Password123!",
            "role": "consumer"
        }
    )
    c_token = c_res.json()["access_token"]

    a_res = client.post(
        "/auth/signup",
        json={
            "full_name": "Admin User",
            "email": "admin@example.com",
            "password": "Password123!",
            "role": "admin"
        }
    )
    a_token = a_res.json()["access_token"]

    forbidden_res = client.get(
        "/auth/admin-only",
        headers={"Authorization": f"Bearer {c_token}"}
    )
    assert forbidden_res.status_code == 403

    allowed_res = client.get(
        "/auth/admin-only",
        headers={"Authorization": f"Bearer {a_token}"}
    )
    assert allowed_res.status_code == 200
    assert allowed_res.json()["role"] == "admin"


def test_remember_me_token_expiry():
    from jose import jwt
    from app.core.config import settings

    signup_res = client.post(
        "/auth/signup",
        json={
            "full_name": "Expiry Test User",
            "email": "expiry@example.com",
            "password": "Password123!",
            "role": "consumer"
        }
    )
    assert signup_res.status_code == 201

    res_false = client.post(
        "/auth/login",
        json={
            "email": "expiry@example.com",
            "password": "Password123!",
            "remember_me": False
        }
    )
    assert res_false.status_code == 200
    token_false = res_false.json()["access_token"]
    payload_false = jwt.decode(token_false, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])

    res_true = client.post(
        "/auth/login",
        json={
            "email": "expiry@example.com",
            "password": "Password123!",
            "remember_me": True
        }
    )
    assert res_true.status_code == 200
    token_true = res_true.json()["access_token"]
    payload_true = jwt.decode(token_true, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])

    exp_false = payload_false["exp"]
    exp_true = payload_true["exp"]

    diff_seconds = exp_true - exp_false
    expected_diff = (30 * 24 * 3600) - (2 * 3600)

    assert abs(diff_seconds - expected_diff) < 60, f"Expected exp diff ~{expected_diff}s, got {diff_seconds}s"
