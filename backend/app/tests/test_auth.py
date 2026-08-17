import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "testuser@example.com",
            "password": "testpassword",
            "full_name": "Test User",
            "role": "CONSUMER"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "testuser@example.com"
    assert data["full_name"] == "Test User"
    assert "id" in data
    assert data["role"] == "CONSUMER"

@pytest.mark.asyncio
async def test_register_existing_user(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "password123",
            "full_name": "Duplicate User",
            "role": "CONSUMER"
        }
    )
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "password123",
            "full_name": "Duplicate User",
            "role": "CONSUMER"
        }
    )
    assert response.status_code == 400
    assert "exists" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login_user(client: AsyncClient):
    email = "loginuser@example.com"
    password = "loginpassword"
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": "Login User",
            "role": "CONSUMER"
        }
    )
    
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": email, "password": password}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    
    token = data["access_token"]
    me_response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["email"] == email
