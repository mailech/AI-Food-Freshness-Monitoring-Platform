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
    # 7. Role-Matching Verification:
    # 7a. Login with correct role -> SUCCESS 200
    matching_role_login = client.post(
        "/api/auth/login",
        json={
            "email": test_email,
            "password": test_pwd,
            "role": "Food Quality Inspector"
        }
    )
    assert matching_role_login.status_code == 200
    assert matching_role_login.json()["role"] == "Food Quality Inspector"

    # 7b. Login with mismatched role -> REJECTED 403 Forbidden
    mismatched_role_login = client.post(
        "/api/auth/login",
        json={
            "email": test_email,
            "password": test_pwd,
            "role": "Retail Manager"
        }
    )
    assert mismatched_role_login.status_code == 403
    assert "Role mismatch" in mismatched_role_login.json()["detail"]

def test_role_based_access_control():
    from app.api.deps import require_roles
    from fastapi import Depends
    
    # Create test route protected by require_roles
    @fastapi_app.get("/api/test-inspector-only")
    def inspector_only_endpoint(user=Depends(require_roles(["Food Quality Inspector"]))):
        return {"authorized": True, "user_role": user.role}

    # Token for Food Quality Inspector
    inspector_token = create_access_token(
        subject="usr-insp-001",
        email="insp@freshness.io",
        role="Food Quality Inspector"
    )

    # Token for Consumer
    consumer_token = create_access_token(
        subject="usr-cons-001",
        email="cons@freshness.io",
        role="Consumer"
    )

    # 1. Inspector access -> 200 OK
    res1 = client.get(
        "/api/test-inspector-only",
        headers={"Authorization": f"Bearer {inspector_token}"}
    )
    assert res1.status_code == 200
    assert res1.json()["authorized"] is True

    # 2. Consumer access -> 403 Forbidden
    res2 = client.get(
        "/api/test-inspector-only",
        headers={"Authorization": f"Bearer {consumer_token}"}
    )
    assert res2.status_code == 403

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
    test_role_based_access_control()
    print("[PASS] Role-Based Access Control (RBAC)")
    print("\nALL JWT AUTH & ROLE TESTS PASSED SUCCESSFULLY!")

