"""Authentication and authorisation tests."""

from __future__ import annotations

import pytest

from app.auth.permissions import permission_strings_for, role_has_permission
from app.core.enums import Permission, RoleName
from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    password_strength_errors,
    verify_password,
)
from app.core.errors import AuthenticationError


# --------------------------------------------------------------- primitives
def test_passwords_are_hashed_not_stored_in_plaintext():
    password = "Test@1234"
    hashed = hash_password(password)
    assert hashed != password
    assert password not in hashed
    assert hashed.startswith("$2b$")  # bcrypt modular crypt format


def test_password_verification_round_trips():
    hashed = hash_password("Test@1234")
    assert verify_password("Test@1234", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_password_hashes_are_salted_and_therefore_unique():
    assert hash_password("same") != hash_password("same")


def test_password_verification_tolerates_malformed_hashes():
    assert verify_password("anything", None) is False
    assert verify_password("anything", "") is False
    assert verify_password("anything", "not-a-hash") is False


def test_long_passwords_are_supported_beyond_bcrypt_72_byte_limit():
    """Pre-hashing means a 200-character password is still verified correctly."""
    long_password = "a1" * 100
    hashed = hash_password(long_password)
    assert verify_password(long_password, hashed) is True
    assert verify_password("a1" * 99 + "a2", hashed) is False


@pytest.mark.parametrize(
    "password,expected_problems",
    [
        ("Test@1234", 0),
        ("short1", 1),          # too short
        ("alllettersnodigit", 1),
        ("12345678", 1),        # no letter
        ("ab1", 1),             # too short only (has letter + digit)
    ],
)
def test_password_policy(password, expected_problems):
    assert len(password_strength_errors(password)) == expected_problems


def test_jwt_round_trip_carries_subject_and_role():
    token, expires_at = create_access_token(42, role="ADMIN")
    payload = decode_token(token, expected_type="access")
    assert payload["sub"] == "42"
    assert payload["role"] == "ADMIN"
    assert payload["type"] == "access"
    assert expires_at is not None


def test_tampered_jwt_is_rejected():
    token, _ = create_access_token(1)
    tampered = token[:-4] + "AAAA"
    with pytest.raises(AuthenticationError):
        decode_token(tampered)


def test_refresh_token_cannot_be_used_as_an_access_token():
    from app.core.security import create_refresh_token

    token, _, _ = create_refresh_token(1)
    with pytest.raises(AuthenticationError):
        decode_token(token, expected_type="access")


# ------------------------------------------------------- permission matrix
def test_every_role_has_a_permission_grant():
    for role in RoleName:
        assert permission_strings_for(role.value), f"{role.value} has no permissions"


def test_admin_has_every_permission():
    admin = set(permission_strings_for(RoleName.ADMIN.value))
    assert admin == {p.value for p in Permission}


def test_consumer_cannot_manage_users_or_generate_reports():
    role = RoleName.CONSUMER.value
    assert not role_has_permission(role, Permission.USER_MANAGE)
    assert not role_has_permission(role, Permission.REPORT_GENERATE)
    assert not role_has_permission(role, Permission.SYSTEM_MANAGE)
    # But it can do its own job.
    assert role_has_permission(role, Permission.ANALYSIS_CREATE)
    assert role_has_permission(role, Permission.INVENTORY_WRITE)


def test_warehouse_operator_cannot_create_analyses_but_can_record_storage():
    role = RoleName.WAREHOUSE_OPERATOR.value
    assert role_has_permission(role, Permission.STORAGE_WRITE)
    assert role_has_permission(role, Permission.ANALYSIS_READ)
    assert not role_has_permission(role, Permission.ANALYSIS_CREATE)
    assert not role_has_permission(role, Permission.USER_MANAGE)


def test_quality_inspector_can_inspect_but_not_write_products():
    role = RoleName.QUALITY_INSPECTOR.value
    assert role_has_permission(role, Permission.INSPECTION_MANAGE)
    assert role_has_permission(role, Permission.ANALYSIS_CREATE)
    assert not role_has_permission(role, Permission.PRODUCT_WRITE)


def test_unknown_role_gets_no_permissions():
    assert permission_strings_for("NOT_A_ROLE") == []
    assert permission_strings_for(None) == []


# ----------------------------------------------------------------- HTTP API
def test_register_returns_tokens_and_permissions(client, seeded):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "Test@1234",
            "full_name": "New User",
            "role": "CONSUMER",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["user"]["email"] == "newuser@example.com"
    assert body["user"]["role"]["name"] == "CONSUMER"
    assert "inventory:write" in body["user"]["permissions"]
    assert body["tokens"]["access_token"]
    assert body["tokens"]["token_type"] == "bearer"


def test_register_rejects_duplicate_email(client, seeded):
    payload = {
        "email": "duplicate@example.com",
        "password": "Test@1234",
        "full_name": "Dup User",
    }
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    conflict = client.post("/api/v1/auth/register", json=payload)
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "EMAIL_TAKEN"


def test_public_registration_cannot_self_assign_admin(client, seeded):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "wannabe@example.com",
            "password": "Test@1234",
            "full_name": "Wannabe Admin",
            "role": "ADMIN",
        },
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ROLE_NOT_ALLOWED"


def test_register_rejects_a_weak_password(client, seeded):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "weak@example.com", "password": "abc", "full_name": "Weak Pass"},
    )
    # Pydantic's min_length rejects it before the service policy runs.
    assert response.status_code == 422


def test_login_with_email_and_with_username(client, seeded):
    by_email = client.post(
        "/api/v1/auth/login",
        json={"username": "consumer@test.example.com", "password": "Test@1234"},
    )
    assert by_email.status_code == 200

    username = by_email.json()["user"]["username"]
    by_username = client.post(
        "/api/v1/auth/login", json={"username": username, "password": "Test@1234"}
    )
    assert by_username.status_code == 200


def test_login_rejects_a_bad_password_with_the_error_envelope(client, seeded):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "consumer@test.example.com", "password": "wrong"},
    )
    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "INVALID_CREDENTIALS"
    # The message must not reveal whether the account exists.
    assert "password" in body["error"]["message"].lower()


def test_oauth2_password_form_endpoint_works_for_swagger(client, seeded):
    response = client.post(
        "/api/v1/auth/token",
        data={"username": "consumer@test.example.com", "password": "Test@1234"},
    )
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_protected_endpoint_requires_a_token(client, seeded):
    assert client.get("/api/v1/users/me").status_code == 401
    assert (
        client.get("/api/v1/users/me", headers={"Authorization": "Bearer garbage"}).status_code
        == 401
    )


def test_refresh_rotates_and_revokes_the_old_token(client, seeded):
    login = client.post(
        "/api/v1/auth/login",
        json={"username": "consumer@test.example.com", "password": "Test@1234"},
    )
    refresh_token = login.json()["tokens"]["refresh_token"]

    first = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert first.status_code == 200
    assert first.json()["access_token"] != login.json()["tokens"]["access_token"]

    # Re-using the rotated token must fail.
    replay = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert replay.status_code == 401
    assert replay.json()["error"]["code"] == "TOKEN_REVOKED"


def test_logout_revokes_the_session(client, seeded):
    login = client.post(
        "/api/v1/auth/login",
        json={"username": "consumer@test.example.com", "password": "Test@1234"},
    )
    tokens = login.json()["tokens"]
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    logout = client.post(
        "/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]}, headers=headers
    )
    assert logout.status_code == 200

    replay = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert replay.status_code == 401


def test_change_password_requires_the_current_password(client, consumer_headers):
    wrong = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "nope", "new_password": "Changed@123"},
        headers=consumer_headers,
    )
    assert wrong.status_code == 401

    correct = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "Test@1234", "new_password": "Changed@123"},
        headers=consumer_headers,
    )
    assert correct.status_code == 200


def test_users_me_returns_the_permission_list(client, manager_headers):
    response = client.get("/api/v1/users/me", headers=manager_headers)
    assert response.status_code == 200
    permissions = response.json()["permissions"]
    assert "report:generate" in permissions
    assert "user:manage" not in permissions


# ------------------------------------------------------ RBAC enforcement
@pytest.mark.parametrize(
    "role,path,method,expected",
    [
        ("CONSUMER", "/api/v1/admin/users", "get", 403),
        ("CONSUMER", "/api/v1/analytics/platform", "get", 403),
        ("RETAIL_MANAGER", "/api/v1/admin/users", "get", 403),
        ("WAREHOUSE_OPERATOR", "/api/v1/admin/system/settings", "get", 403),
        ("QUALITY_INSPECTOR", "/api/v1/admin/users", "get", 403),
        ("ADMIN", "/api/v1/admin/users", "get", 200),
        ("ADMIN", "/api/v1/analytics/platform", "get", 200),
        ("RETAIL_MANAGER", "/api/v1/analytics/waste-risk", "get", 200),
        ("CONSUMER", "/api/v1/analytics/waste-risk", "get", 403),
    ],
)
def test_backend_enforces_permissions_regardless_of_client(
    client, auth_headers, role, path, method, expected
):
    response = getattr(client, method)(path, headers=auth_headers[role])
    assert response.status_code == expected, response.text


def test_permission_denied_response_explains_what_was_required(client, consumer_headers):
    response = client.get("/api/v1/admin/users", headers=consumer_headers)
    assert response.status_code == 403
    error = response.json()["error"]
    assert error["code"] == "PERMISSION_DENIED"
    assert "user:manage" in error["details"]["required_permissions"]
    assert error["details"]["your_role"] == "CONSUMER"


def test_consumer_cannot_create_products(client, consumer_headers):
    response = client.post(
        "/api/v1/products",
        json={"name": "Sneaky Product", "category_slug": "FRUITS"},
        headers=consumer_headers,
    )
    assert response.status_code == 403


def test_admin_can_create_an_admin_user(client, admin_headers):
    response = client.post(
        "/api/v1/admin/users",
        json={
            "email": "second.admin@example.com",
            "password": "Test@1234",
            "full_name": "Second Admin",
            "role": "ADMIN",
        },
        headers=admin_headers,
    )
    assert response.status_code == 201
    assert response.json()["role"]["name"] == "ADMIN"
