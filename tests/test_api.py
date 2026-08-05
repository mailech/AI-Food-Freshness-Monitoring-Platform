"""
Integration tests for AI Food Freshness Monitoring Platform API.
Uses the session-scoped 'client' fixture from conftest.py.
Run with: python -m pytest tests/test_api.py -v
"""

import pytest
from datetime import datetime, timedelta


# ==========================================
# AUTH ROUTE TESTS
# ==========================================

class TestAuth:
    TEST_USER = {
        "name": "Test User",
        "email": "testauth@example.com",
        "password": "testpassword123",
        "role": "consumer"
    }

    def test_register_user(self, client):
        """User registration creates account successfully."""
        response = client.post("/api/auth/register", json=self.TEST_USER)
        assert response.status_code in [201, 400], f"Unexpected: {response.status_code} {response.text}"

    def test_register_duplicate_returns_400(self, client):
        """Duplicate registration returns 400."""
        client.post("/api/auth/register", json=self.TEST_USER)
        response = client.post("/api/auth/register", json=self.TEST_USER)
        assert response.status_code == 400

    def test_login_valid_credentials(self, client):
        """Valid login returns JWT token and role."""
        client.post("/api/auth/register", json=self.TEST_USER)
        response = client.post(
            "/api/auth/login",
            data={"username": self.TEST_USER["email"], "password": self.TEST_USER["password"]},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "role" in data
        assert "name" in data

    def test_login_wrong_password_returns_401(self, client):
        """Incorrect password returns 401."""
        client.post("/api/auth/register", json=self.TEST_USER)
        response = client.post(
            "/api/auth/login",
            data={"username": self.TEST_USER["email"], "password": "wrongpassword"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 401

    def test_login_unknown_user_returns_401(self, client):
        """Login with nonexistent email returns 401."""
        response = client.post(
            "/api/auth/login",
            data={"username": "nobody@example.com", "password": "password123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 401

    def _get_token(self, client) -> str:
        """Helper: Register (if needed) and return JWT token."""
        client.post("/api/auth/register", json=self.TEST_USER)
        response = client.post(
            "/api/auth/login",
            data={"username": self.TEST_USER["email"], "password": self.TEST_USER["password"]},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        return response.json().get("access_token", "")

    def test_get_profile_authenticated(self, client):
        """Authenticated profile request returns user details."""
        token = self._get_token(client)
        response = client.get(
            "/api/auth/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == self.TEST_USER["email"]

    def test_profile_unauthenticated_returns_401(self, client):
        """Profile without token returns 401."""
        response = client.get("/api/auth/profile")
        assert response.status_code == 401


# ==========================================
# FOOD CATEGORIES TESTS
# ==========================================

class TestCategories:
    def test_list_categories_returns_list(self, client):
        """Categories endpoint returns a list."""
        response = client.get("/api/batches/categories")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_category_objects_have_expected_fields(self, client):
        """Category objects contain all required fields."""
        response = client.get("/api/batches/categories")
        assert response.status_code == 200
        categories = response.json()
        if categories:
            cat = categories[0]
            for field in ["id", "name", "base_shelf_life_days", "ideal_temp_min", "ideal_temp_max"]:
                assert field in cat, f"Missing field: {field}"


# ==========================================
# INVENTORY ROUTE TESTS
# ==========================================

INVENTORY_USER = {
    "name": "Inventory Tester",
    "email": "inventory_test@example.com",
    "password": "inv123456",
    "role": "consumer"
}


def _get_token_for(client, user: dict) -> str:
    client.post("/api/auth/register", json=user)
    r = client.post(
        "/api/auth/login",
        data={"username": user["email"], "password": user["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    return r.json().get("access_token", "")


def _get_first_category_id(client) -> str | None:
    r = client.get("/api/batches/categories")
    cats = r.json()
    return cats[0]["id"] if cats else None


class TestInventory:
    def test_inventory_list_returns_list(self, client):
        """Authenticated inventory list returns array."""
        token = _get_token_for(client, INVENTORY_USER)
        response = client.get("/api/inventory", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_inventory_unauthenticated_returns_401(self, client):
        """Inventory listing without token returns 401."""
        response = client.get("/api/inventory")
        assert response.status_code == 401

    def test_create_inventory_item(self, client):
        """Creating an inventory item returns 201 with item data."""
        token = _get_token_for(client, INVENTORY_USER)
        category_id = _get_first_category_id(client)
        assert category_id is not None, "No food categories found in DB"

        expiry = (datetime.now() + timedelta(days=7)).isoformat()
        response = client.post(
            "/api/inventory",
            json={
                "name": "Test Bananas",
                "category_id": category_id,
                "quantity": 2.0,
                "unit": "kg",
                "expiry_date": expiry,
                "storage_temp": 12.0,
                "storage_humidity": 80.0
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Bananas"
        assert data["status"] == "Fresh"

    def test_create_item_with_past_expiry_rejected(self, client):
        """Creating items with past expiry dates is rejected with 400."""
        token = _get_token_for(client, INVENTORY_USER)
        category_id = _get_first_category_id(client)
        past_expiry = (datetime.now() - timedelta(days=1)).isoformat()
        response = client.post(
            "/api/inventory",
            json={
                "name": "Expired Item",
                "category_id": category_id,
                "quantity": 1.0,
                "unit": "kg",
                "expiry_date": past_expiry
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400

    def test_delete_own_inventory_item(self, client):
        """Deleting own item returns 204 No Content."""
        token = _get_token_for(client, INVENTORY_USER)
        category_id = _get_first_category_id(client)
        expiry = (datetime.now() + timedelta(days=7)).isoformat()

        create_resp = client.post(
            "/api/inventory",
            json={"name": "Delete Me", "category_id": category_id, "quantity": 1.0, "unit": "pcs", "expiry_date": expiry},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert create_resp.status_code == 201
        item_id = create_resp.json()["id"]

        del_resp = client.delete(f"/api/inventory/{item_id}", headers={"Authorization": f"Bearer {token}"})
        assert del_resp.status_code == 204


# ==========================================
# ANALYTICS ROUTE TESTS
# ==========================================

ANALYTICS_USER = {
    "name": "Analytics Tester",
    "email": "analytics_test@example.com",
    "password": "analytics123",
    "role": "consumer"
}


class TestAnalytics:
    def test_kpis_returns_all_metrics(self, client):
        """KPI endpoint returns expected metric fields."""
        token = _get_token_for(client, ANALYTICS_USER)
        response = client.get("/api/analytics/kpis", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        for key in ["total_items", "fresh_items", "average_freshness", "total_waste_saved_kg"]:
            assert key in data, f"Missing KPI field: {key}"

    def test_category_distribution_returns_list(self, client):
        """Category distribution returns a list."""
        token = _get_token_for(client, ANALYTICS_USER)
        response = client.get(
            "/api/analytics/category-distribution",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_decay_rates_returns_7_day_series(self, client):
        """Decay rate series returns 7-element array."""
        token = _get_token_for(client, ANALYTICS_USER)
        response = client.get("/api/analytics/decay-rates", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 7


# ==========================================
# REPORTS ROUTE TESTS
# ==========================================

REPORTS_USER = {
    "name": "Reports Tester",
    "email": "reports_test@example.com",
    "password": "reports123",
    "role": "retail_manager"
}


class TestReports:
    def test_csv_export_content_type(self, client):
        """CSV export returns text/csv content type."""
        token = _get_token_for(client, REPORTS_USER)
        response = client.get("/api/reports/csv", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")

    def test_excel_export_content_type(self, client):
        """Excel export returns spreadsheetml content type."""
        token = _get_token_for(client, REPORTS_USER)
        response = client.get("/api/reports/excel", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert "spreadsheetml" in response.headers.get("content-type", "")

    def test_pdf_export_content_type(self, client):
        """PDF export returns application/pdf content type."""
        token = _get_token_for(client, REPORTS_USER)
        response = client.get("/api/reports/pdf", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
