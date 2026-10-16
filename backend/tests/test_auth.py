import pytest
from datetime import datetime, timezone
from jose import jwt
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, SessionLocal, engine
from app.models.user import User, UserRole
from app.auth.security import hash_password, verify_password
from app.core.config import settings

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
    yield
    db = SessionLocal()
    try:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
    
    from app.main import seed_initial_user, seed_initial_inventory
    seed_initial_user()
    seed_initial_inventory()


def test_correct_email_and_correct_password_succeeds():
    """Case 1: Correct email + correct password -> login successful."""
    # Register User A
    signup_res = client.post(
        "/auth/signup",
        json={
            "full_name": "Alice User",
            "email": "alice@example.com",
            "password": "CorrectPassword123!",
            "role": "consumer"
        }
    )
    assert signup_res.status_code == 201

    # Login User A with correct credentials
    login_res = client.post(
        "/auth/login",
        json={
            "email": "alice@example.com",
            "password": "CorrectPassword123!",
            "remember_me": True
        }
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["full_name"] == "Alice User"
    # Ensure password is not exposed in response
    assert "password" not in data["user"]
    assert "hashed_password" not in data["user"]


def test_correct_email_and_wrong_password_rejected():
    """Case 2: Correct email + wrong password -> login rejected."""
    client.post(
        "/auth/signup",
        json={
            "full_name": "Alice User",
            "email": "alice@example.com",
            "password": "CorrectPassword123!",
            "role": "consumer"
        }
    )

    bad_login_res = client.post(
        "/auth/login",
        json={
            "email": "alice@example.com",
            "password": "WrongPassword999!",
            "remember_me": False
        }
    )
    assert bad_login_res.status_code == 401
    assert "Incorrect email or password" in bad_login_res.json()["detail"]


def test_wrong_nonexistent_email_rejected():
    """Case 3: Wrong/nonexistent email + any password -> login rejected."""
    client.post(
        "/auth/signup",
        json={
            "full_name": "Alice User",
            "email": "alice@example.com",
            "password": "CorrectPassword123!",
            "role": "consumer"
        }
    )

    bad_email_res = client.post(
        "/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "AnyPassword123!",
            "remember_me": False
        }
    )
    assert bad_email_res.status_code == 401
    assert "Incorrect email or password" in bad_email_res.json()["detail"]


def test_remember_me_token_lifespan():
    """Case 4: Remember Me enabled vs disabled creates appropriate token expiration."""
    client.post(
        "/auth/signup",
        json={
            "full_name": "Alice User",
            "email": "alice@example.com",
            "password": "CorrectPassword123!",
            "role": "consumer"
        }
    )

    # Remember Me = True (30 days)
    res_rm_true = client.post(
        "/auth/login",
        json={
            "email": "alice@example.com",
            "password": "CorrectPassword123!",
            "remember_me": True
        }
    )
    assert res_rm_true.status_code == 200
    token_true = res_rm_true.json()["access_token"]
    payload_true = jwt.decode(token_true, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])

    # Remember Me = False (2 hours)
    res_rm_false = client.post(
        "/auth/login",
        json={
            "email": "alice@example.com",
            "password": "CorrectPassword123!",
            "remember_me": False
        }
    )
    assert res_rm_false.status_code == 200
    token_false = res_rm_false.json()["access_token"]
    payload_false = jwt.decode(token_false, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])

    diff_seconds = payload_true["exp"] - payload_false["exp"]
    expected_diff = (30 * 24 * 3600) - (2 * 3600)
    assert abs(diff_seconds - expected_diff) < 60


def test_user_b_authentication_independent_of_user_a():
    """Case 5 & 6: User B authenticates with User B credentials; User A's token cannot bypass User B validation."""
    # User A registers
    client.post(
        "/auth/signup",
        json={
            "full_name": "User A",
            "email": "usera@example.com",
            "password": "PasswordA123!",
            "role": "consumer"
        }
    )

    # User B registers
    client.post(
        "/auth/signup",
        json={
            "full_name": "User B",
            "email": "userb@example.com",
            "password": "PasswordB456!",
            "role": "retail_manager"
        }
    )

    # User A logs in with Remember Me
    res_a = client.post(
        "/auth/login",
        json={
            "email": "usera@example.com",
            "password": "PasswordA123!",
            "remember_me": True
        }
    )
    assert res_a.status_code == 200
    token_a = res_a.json()["access_token"]

    # Verify User A's token returns User A
    me_a = client.get("/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    assert me_a.status_code == 200
    assert me_a.json()["email"] == "usera@example.com"
    assert me_a.json()["full_name"] == "User A"

    # User B tries to login with wrong password -> rejected
    bad_b = client.post(
        "/auth/login",
        json={
            "email": "userb@example.com",
            "password": "WrongPasswordForB!",
            "remember_me": False
        }
    )
    assert bad_b.status_code == 401

    # User B logs in with correct User B password -> succeeds
    good_b = client.post(
        "/auth/login",
        json={
            "email": "userb@example.com",
            "password": "PasswordB456!",
            "remember_me": False
        }
    )
    assert good_b.status_code == 200
    token_b = good_b.json()["access_token"]
    assert token_b != token_a

    # User B's token returns User B
    me_b = client.get("/auth/me", headers={"Authorization": f"Bearer {token_b}"})
    assert me_b.status_code == 200
    assert me_b.json()["email"] == "userb@example.com"
    assert me_b.json()["full_name"] == "User B"


def test_password_security_no_plaintext_stored():
    """Case 7: Ensure database never stores plaintext passwords and bcrypt is used."""
    client.post(
        "/auth/signup",
        json={
            "full_name": "Secure User",
            "email": "secure@example.com",
            "password": "MySecretPassword!2026",
            "role": "consumer"
        }
    )

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "secure@example.com").first()
        assert user is not None
        assert user.hashed_password != "MySecretPassword!2026"
        assert user.hashed_password.startswith("$2b$") or user.hashed_password.startswith("$2a$")
        assert verify_password("MySecretPassword!2026", user.hashed_password) is True
        assert verify_password("WrongPassword", user.hashed_password) is False
    finally:
        db.close()
