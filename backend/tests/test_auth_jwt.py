"""
Comprehensive Unit & Integration Test Suite for JWT Authentication & RBAC
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import jwt
from datetime import timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from app.main import app as fastapi_app
from app.db.base import Base
from app.db.session import get_db
import app.models.orm # Ensure all ORM classes are imported
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    JWT_SECRET,
    ALGORITHM
)

# Test SQLite in-memory database with StaticPool so memory DB is preserved across threads
TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

Base.metadata.create_all(bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

fastapi_app.dependency_overrides[get_db] = override_get_db
client = TestClient(fastapi_app)

def test_password_hashing():
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False
    assert verify_password("", hashed) is False

def test_jwt_token_creation_and_decoding():
    subject = "user-12345"
    email = "test@freshness.io"
    role = "Food Quality Inspector"
    name = "Dr. Test User"
    
    token = create_access_token(
        subject=subject,
        email=email,
        role=role,
        name=name
    )
    assert isinstance(token, str)
    assert len(token) > 20
    
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == subject
    assert payload["email"] == email
    assert payload["role"] == role
    assert payload["name"] == name
    assert "exp" in payload
    assert "iat" in payload

def test_jwt_token_expired():
    token = create_access_token(
        subject="user-expired",
        email="expired@freshness.io",
        role="Consumer",
        expires_delta=timedelta(seconds=-10) # expired 10 seconds ago
    )
    payload = decode_access_token(token)
    assert payload is None

def test_jwt_token_invalid_signature():
    token = jwt.encode({"sub": "user-bad"}, "invalid_test_secret_key_with_at_least_32_bytes_length!", algorithm="HS256")
    payload = decode_access_token(token)
    assert payload is None

def test_register_and_login_flow():
    test_email = "inspector.unit@freshness.io"
    test_pwd = "MySecurePassword2026!"
    
    # 1. Register
    reg_response = client.post(
        "/api/auth/register",
        json={
            "name": "Inspector Unit",
            "email": test_email,
            "password": test_pwd,
            "role": "Food Quality Inspector"
        }
    )
    assert reg_response.status_code == 201
    data = reg_response.json()
    assert data["email"] == test_email
    assert data["role"] == "Food Quality Inspector"
    assert "token" in data
    token = data["token"]
    
    # 2. Register Duplicate Email -> should fail with 400
    dup_response = client.post(
        "/api/auth/register",
        json={
            "name": "Duplicate Unit",
            "email": test_email,
            "password": "anotherpassword",
            "role": "Consumer"
        }
    )
    assert dup_response.status_code == 400
    
    # 3. Login with Correct Password
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": test_email,
            "password": test_pwd
        }
    )
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert login_data["email"] == test_email
    assert "token" in login_data
    auth_token = login_data["token"]
    
    # 4. Login with Wrong Password -> should fail with 401
    bad_login = client.post(
        "/api/auth/login",
        json={
            "email": test_email,
            "password": "IncorrectPassword!"
        }
    )
    assert bad_login.status_code == 401

    # 4b. Login with Unregistered Email -> should fail with 401
    unregistered_login = client.post(
        "/api/auth/login",
        json={
            "email": "unregistered.user.99@freshness.io",
            "password": "somePassword123"
        }
    )
    assert unregistered_login.status_code == 401

    # 5. Access /api/auth/me with Bearer token
    me_response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["email"] == test_email
    assert me_data["role"] == "Food Quality Inspector"

    # 6. Access /api/auth/me without token -> should fail with 401
    unauth_response = client.get("/api/auth/me")
    assert unauth_response.status_code == 401

if __name__ == "__main__":
    print("Running auth tests manually...")
    test_password_hashing()
    print("[PASS] Password Hashing & Verification")
    test_jwt_token_creation_and_decoding()
    print("[PASS] JWT Token Creation & Decoding")
    test_jwt_token_expired()
    print("[PASS] Expired Token Rejection")
    test_jwt_token_invalid_signature()
    print("[PASS] Invalid Signature Rejection")
    test_register_and_login_flow()
    print("[PASS] Full Register & Login Flow with JWT & /me")
    print("\nALL JWT AUTH TESTS PASSED SUCCESSFULLY!")
