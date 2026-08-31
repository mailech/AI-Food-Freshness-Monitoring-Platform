"""Module 12: API validation, E2E workflow, and security tests."""

import io
import uuid

PNG_BYTES = bytes.fromhex(
    "89504e470d0a1a0a0000000d494844520000000100000001080600000"
    "01f15c4890000000d49444154789c626001000000ffff030000060005"
    "57bfabd40000000049454e44ae426082"
)


def _png_file(name="photo.png"):
    return {"file": (name, io.BytesIO(PNG_BYTES), "image/png")}


# ---------- Auth ----------

class TestAuth:
    def test_register_duplicate_email(self, client, auth_headers):
        _, email = auth_headers
        res = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "Passw0rd!", "full_name": "Dup"},
        )
        assert res.status_code == 409

    def test_login_wrong_password(self, client, auth_headers):
        _, email = auth_headers
        res = client.post("/api/v1/auth/login", json={"email": email, "password": "nope"})
        assert res.status_code == 401

    def test_me(self, client, auth_headers):
        headers, email = auth_headers
        res = client.get("/api/v1/auth/me", headers=headers)
        assert res.status_code == 200
        assert res.json()["email"] == email

    def test_invalid_token_rejected(self, client):
        res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer garbage"})
        assert res.status_code == 401

    def test_malformed_register_validation(self, client):
        res = client.post("/api/v1/auth/register", json={"email": "not-an-email", "password": "x"})
        assert res.status_code == 422


# ---------- Inventory ----------

class TestInventory:
    def test_crud_flow(self, client, item_id, auth_headers):
        headers, _ = auth_headers
        assert client.get(f"/api/v1/inventory/items/{item_id}", headers=headers).status_code == 200
        res = client.put(
            f"/api/v1/inventory/items/{item_id}",
            headers=headers,
            json={"name": "Apple Renamed", "category_id": 1},
        )
        assert res.status_code == 200 and res.json()["name"] == "Apple Renamed"
        assert client.delete(f"/api/v1/inventory/items/{item_id}", headers=headers).status_code == 204
        assert client.get(f"/api/v1/inventory/items/{item_id}", headers=headers).status_code == 404

    def test_unknown_category_rejected(self, client, auth_headers):
        headers, _ = auth_headers
        res = client.post(
            "/api/v1/inventory/items",
            headers=headers,
            json={"name": "Ghost", "category_id": 99999},
        )
        assert res.status_code == 422

    def test_pagination_and_filters(self, client, item_id, auth_headers):
        headers, _ = auth_headers
        res = client.get("/api/v1/inventory/items?page=1&page_size=10&search=App", headers=headers)
        assert res.status_code == 200
        body = res.json()
        assert body["total"] >= 1 and any(i["id"] == item_id for i in body["items"])

    def test_batches_flow(self, client, item_id, auth_headers):
        headers, _ = auth_headers
        res = client.post(
            f"/api/v1/inventory/items/{item_id}/batches",
            headers=headers,
            json={"batch_code": "B-1", "quantity": 3.5, "expiry_date": "2026-12-01"},
        )
        assert res.status_code == 201
        listing = client.get(f"/api/v1/inventory/items/{item_id}/batches", headers=headers)
        assert listing.status_code == 200 and len(listing.json()) == 1


# ---------- Image upload + assessment ----------

class TestImages:
    def test_upload_and_list(self, client, item_id, auth_headers):
        headers, _ = auth_headers
        res = client.post(
            f"/api/v1/inventory/items/{item_id}/images",
            headers=headers,
            files=_png_file(),
        )
        assert res.status_code == 201, res.text
        body = res.json()
        assert body["assessment"]["predicted_class"] == "freshapples"
        assert body["assessment"]["freshness_score"] == 88.0

        listed = client.get(f"/api/v1/inventory/items/{item_id}/images", headers=headers)
        assert listed.status_code == 200 and len(listed.json()) == 1

        latest = client.get(f"/api/v1/inventory/items/{item_id}/assessments/latest", headers=headers)
        assert latest.status_code == 200

    def test_rejects_bad_type(self, client, item_id, auth_headers):
        headers, _ = auth_headers
        res = client.post(
            f"/api/v1/inventory/items/{item_id}/images",
            headers=headers,
            files={"file": ("evil.exe", io.BytesIO(b"MZ..."), "application/octet-stream")},
        )
        assert res.status_code == 422

    def test_delete_image_cascades_assessment(self, client, item_id, auth_headers):
        headers, _ = auth_headers
        img = client.post(
            f"/api/v1/inventory/items/{item_id}/images",
            headers=headers,
            files=_png_file(),
        ).json()
        res = client.delete(f"/api/v1/inventory/images/{img['id']}", headers=headers)
        assert res.status_code == 204
        assert client.get(f"/api/v1/inventory/items/{item_id}/images", headers=headers).json() == []


# ---------- Storage monitoring + shelf-life + scoring ----------

class TestMonitoringScoring:
    def test_reading_validation_bounds(self, client, item_id, auth_headers):
        headers, _ = auth_headers
        res = client.post(
            f"/api/v1/inventory/items/{item_id}/storage-readings",
            headers=headers,
            json={"temperature_c": 999},
        )
        assert res.status_code == 422

    def test_compliance_and_shelf_life(self, client, item_id, auth_headers):
        headers, _ = auth_headers
        client.post(
            f"/api/v1/inventory/items/{item_id}/storage-readings",
            headers=headers,
            json={"temperature_c": 25, "humidity_pct": 20},
        )
        compliance = client.get(
            f"/api/v1/inventory/items/{item_id}/storage-readings/compliance",
            headers=headers,
        ).json()
        assert compliance["compliant"] is False
        assert len(compliance["violations"]) == 2
        assert len(compliance["recommendations"]) >= 2

        shelf = client.get(f"/api/v1/inventory/items/{item_id}/shelf-life", headers=headers).json()
        # Fruits base 7 days; bad storage should shorten it below base.
        assert shelf["remaining_days"] < shelf["base_shelf_life_days"]
        assert shelf["expiry_low"] <= shelf["forecast_expiry_date"] <= shelf["expiry_high"]

    def test_freshness_score_components_sum(self, client, item_id, auth_headers):
        headers, _ = auth_headers
        score = client.get(f"/api/v1/inventory/items/{item_id}/freshness-score", headers=headers).json()
        w = score["weights"]
        c = score["components"]
        expected = round(c["visual"] * w["visual"] + c["storage"] * w["storage"]
                         + c["shelf_life"] * w["shelf_life"] + c["age"] * w["age"], 1)
        assert abs(score["overall_score"] - expected) < 0.11
        assert sum(w.values()) == 1.0
        assert score["health_category"] in ("Fresh", "Good", "Acceptable", "Near Spoilage", "Spoiled")


# ---------- Recommendations / notifications / reports ----------

class TestRecsNotifsReports:
    def test_item_recommendations_sorted(self, client, item_id, auth_headers):
        headers, _ = auth_headers
        recs = client.get(f"/api/v1/inventory/items/{item_id}/recommendations", headers=headers).json()
        assert recs, "expected at least one recommendation"
        order = {"high": 0, "medium": 1, "low": 2}
        priorities = [r["priority"] for r in recs]
        assert priorities == sorted(priorities, key=lambda p: order[p])

    def test_notification_sync_and_read(self, client, item_id, auth_headers):
        headers, _ = auth_headers
        sync = client.post("/api/v1/notifications/sync", headers=headers).json()
        assert sync["created"] == sync["active_alerts"]
        re_sync = client.post("/api/v1/notifications/sync", headers=headers).json()
        assert re_sync["active_alerts"] == sync["active_alerts"]

        notifs = client.get("/api/v1/notifications?unread_only=true", headers=headers).json()
        if notifs:
            nid = notifs[0]["id"]
            marked = client.post(f"/api/v1/notifications/{nid}/read", headers=headers)
            assert marked.status_code == 200 and marked.json()["is_read"] is True
        assert client.post("/api/v1/notifications/read-all", headers=headers).status_code == 204
        assert client.get("/api/v1/notifications?unread_only=true", headers=headers).json() == []

    def test_reports_pdf_and_xlsx(self, client, item_id, auth_headers):
        headers, _ = auth_headers
        for fmt, magic in (("pdf", b"%PDF"), ("xlsx", b"PK")):
            res = client.get(f"/api/v1/reports/freshness?format={fmt}", headers=headers)
            assert res.status_code == 200
            assert res.content.startswith(magic)

    def test_report_unknown_kind(self, client, auth_headers):
        headers, _ = auth_headers
        assert client.get("/api/v1/reports/bogus", headers=headers).status_code == 404


# ---------- Hardening regressions ----------

class TestHardening:
    def test_unknown_packaging_type_does_not_crash(self, client, auth_headers):
        headers, _ = auth_headers
        cats = client.get("/api/v1/inventory/categories", headers=headers).json()
        res = client.post(
            "/api/v1/inventory/items",
            headers=headers,
            json={"name": "Wrapped Melon", "category_id": cats[0]["id"], "packaging_type": "plastic wrap"},
        )
        assert res.status_code == 201
        item_id = res.json()["id"]
        shelf = client.get(f"/api/v1/inventory/items/{item_id}/shelf-life", headers=headers)
        assert shelf.status_code == 200
        assert shelf.json()["storage_impact_factor"] == 1.0

    def test_login_rate_limited(self, client):
        for i in range(10):
            client.post(
                "/api/v1/auth/login",
                json={"email": f"rl{i}@example.com", "password": "whatever1!"},
            )
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "rl11@example.com", "password": "whatever1!"},
        )
        assert res.status_code == 429


# ---------- Security: ownership isolation ----------

class TestSecurityOwnership:
    def test_cross_user_access_denied(self, client, item_id, second_user_headers):
        res = client.get(f"/api/v1/inventory/items/{item_id}", headers=second_user_headers)
        assert res.status_code == 403

    def test_cross_user_upload_denied(self, client, item_id, second_user_headers):
        res = client.post(
            f"/api/v1/inventory/items/{item_id}/images",
            headers=second_user_headers,
            files=_png_file("sneaky.png"),
        )
        assert res.status_code == 403

    def test_cross_user_reading_denied(self, client, item_id, second_user_headers):
        res = client.post(
            f"/api/v1/inventory/items/{item_id}/storage-readings",
            headers=second_user_headers,
            json={"temperature_c": 4},
        )
        assert res.status_code == 403

    def test_no_token_rejected_everywhere(self, client, item_id):
        for method, url in (
            ("get", f"/api/v1/inventory/items/{item_id}"),
            ("post", f"/api/v1/inventory/items/{item_id}/images"),
            ("get", "/api/v1/analytics/dashboard"),
            ("get", "/api/v1/reports/freshness"),
        ):
            res = getattr(client, method)(url)
            assert res.status_code == 401, f"{method.upper()} {url}"

    def test_dashboard_scoped_to_owner(self, client, item_id, auth_headers, second_user_headers):
        client.post(
            f"/api/v1/inventory/items/{item_id}/storage-readings",
            headers=auth_headers[0],
            json={"temperature_c": 4},
        )
        other_dash = client.get("/api/v1/analytics/dashboard", headers=second_user_headers).json()
        assert other_dash["total_items"] == 0
