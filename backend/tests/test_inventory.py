"""Inventory, product, batch and image-upload tests."""

from __future__ import annotations

from datetime import date, timedelta

import pytest


# ------------------------------------------------------------- categories
def test_all_eight_specification_categories_exist(client, manager_headers):
    response = client.get("/api/v1/categories", headers=manager_headers)
    assert response.status_code == 200
    slugs = {category["slug"] for category in response.json()}
    assert slugs == {
        "FRUITS",
        "VEGETABLES",
        "DAIRY",
        "MEAT_POULTRY",
        "SEAFOOD",
        "BAKERY",
        "PACKAGED",
        "BEVERAGES",
    }


def test_categories_expose_their_storage_envelope(client, manager_headers):
    response = client.get("/api/v1/categories/DAIRY", headers=manager_headers)
    assert response.status_code == 200
    body = response.json()
    rule = body["storage_rule"]
    assert rule["temp_min_c"] < rule["temp_max_c"]
    assert rule["humidity_min_pct"] < rule["humidity_max_pct"]
    assert body["default_shelf_life_days"] > 0


# --------------------------------------------------------------- products
def test_product_crud_cycle(client, manager_headers):
    created = client.post(
        "/api/v1/products",
        json={"name": "CRUD Apple", "category_slug": "FRUITS", "default_unit": "kg"},
        headers=manager_headers,
    )
    assert created.status_code == 201
    product_id = created.json()["id"]
    assert created.json()["category"]["slug"] == "FRUITS"

    read = client.get(f"/api/v1/products/{product_id}", headers=manager_headers)
    assert read.status_code == 200
    assert read.json()["name"] == "CRUD Apple"

    updated = client.put(
        f"/api/v1/products/{product_id}",
        json={"brand": "Updated Brand", "shelf_life_days": 21},
        headers=manager_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["brand"] == "Updated Brand"
    assert updated.json()["shelf_life_days"] == 21

    deleted = client.delete(f"/api/v1/products/{product_id}", headers=manager_headers)
    assert deleted.status_code == 200
    assert client.get(f"/api/v1/products/{product_id}", headers=manager_headers).status_code == 404


def test_product_requires_a_category(client, manager_headers):
    response = client.post(
        "/api/v1/products", json={"name": "No Category"}, headers=manager_headers
    )
    assert response.status_code == 422


def test_product_with_batches_is_deactivated_not_deleted(client, manager_headers, batch):
    product_id = batch["product_id"]
    response = client.delete(f"/api/v1/products/{product_id}", headers=manager_headers)
    assert response.status_code == 200
    assert "retained" in response.json()["message"] or "removed" in response.json()["message"]

    # Still readable, but inactive - the analysis history is preserved.
    read = client.get(f"/api/v1/products/{product_id}", headers=manager_headers)
    assert read.status_code == 200
    assert read.json()["is_active"] is False


def test_duplicate_sku_is_rejected(client, manager_headers):
    payload = {"name": "SKU One", "category_slug": "FRUITS", "sku": "DUP-001"}
    assert client.post("/api/v1/products", json=payload, headers=manager_headers).status_code == 201
    second = client.post(
        "/api/v1/products",
        json={**payload, "name": "SKU Two"},
        headers=manager_headers,
    )
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "SKU_EXISTS"


def test_product_search_and_pagination(client, manager_headers):
    for index in range(5):
        client.post(
            "/api/v1/products",
            json={"name": f"Searchable Berry {index}", "category_slug": "FRUITS"},
            headers=manager_headers,
        )

    page = client.get(
        "/api/v1/products?q=Searchable Berry&page=1&page_size=2", headers=manager_headers
    )
    assert page.status_code == 200
    body = page.json()
    assert len(body["items"]) == 2
    assert body["meta"]["total"] == 5
    assert body["meta"]["total_pages"] == 3
    assert body["meta"]["has_next"] is True
    assert body["meta"]["has_prev"] is False


# ---------------------------------------------------------------- batches
def test_batch_creation_auto_generates_number_and_expiry(client, manager_headers, product):
    response = client.post(
        "/api/v1/batches",
        json={"product_id": product["id"], "quantity": 10},
        headers=manager_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["batch_number"].startswith("BTCH-")
    # Provisional expiry derives from the 6-day product shelf life.
    expected = date.today() + timedelta(days=6)
    assert body["expected_expiry_date"] == expected.isoformat()
    assert body["status"] == "FRESH"


def test_batch_creation_adds_an_inventory_item(client, manager_headers, product):
    client.post(
        "/api/v1/batches",
        json={"product_id": product["id"], "quantity": 7, "add_to_my_inventory": True},
        headers=manager_headers,
    )
    inventory = client.get("/api/v1/inventory", headers=manager_headers).json()
    assert inventory["meta"]["total"] >= 1


def test_batch_rejects_a_missing_product(client, manager_headers):
    response = client.post(
        "/api/v1/batches", json={"product_id": 999999, "quantity": 1}, headers=manager_headers
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PRODUCT_NOT_FOUND"


def test_batch_rejects_expiry_before_production(client, manager_headers, product):
    response = client.post(
        "/api/v1/batches",
        json={
            "product_id": product["id"],
            "quantity": 1,
            "production_date": "2026-09-20",
            "expected_expiry_date": "2026-09-10",
        },
        headers=manager_headers,
    )
    assert response.status_code == 422


def test_batch_quantity_adjustment_and_guard(client, manager_headers, batch):
    increased = client.patch(
        f"/api/v1/batches/{batch['id']}/quantity",
        json={"delta": 5, "reason": "restock"},
        headers=manager_headers,
    )
    assert increased.status_code == 200
    assert increased.json()["quantity"] == pytest.approx(25.0)

    over = client.patch(
        f"/api/v1/batches/{batch['id']}/quantity",
        json={"delta": -1000},
        headers=manager_headers,
    )
    assert over.status_code == 409
    assert over.json()["error"]["code"] == "INSUFFICIENT_QUANTITY"


def test_batch_search_filters(client, manager_headers, product):
    client.post(
        "/api/v1/batches",
        json={
            "product_id": product["id"],
            "quantity": 3,
            "storage_location": "Freezer Z",
            "expected_expiry_date": (date.today() + timedelta(days=1)).isoformat(),
        },
        headers=manager_headers,
    )

    by_location = client.get(
        "/api/v1/batches?storage_location=Freezer Z", headers=manager_headers
    ).json()
    assert by_location["meta"]["total"] == 1

    expiring = client.get("/api/v1/batches?expiring_within_days=2", headers=manager_headers).json()
    assert expiring["meta"]["total"] >= 1

    no_match = client.get(
        "/api/v1/batches?storage_location=Nowhere At All", headers=manager_headers
    ).json()
    assert no_match["meta"]["total"] == 0


def test_batch_sorting_is_applied(client, manager_headers, product):
    for days, quantity in ((10, 1), (2, 50), (5, 25)):
        client.post(
            "/api/v1/batches",
            json={
                "product_id": product["id"],
                "quantity": quantity,
                "expected_expiry_date": (date.today() + timedelta(days=days)).isoformat(),
            },
            headers=manager_headers,
        )

    ascending = client.get(
        "/api/v1/batches?sort_by=expected_expiry_date&sort_dir=asc", headers=manager_headers
    ).json()["items"]
    dates = [item["expected_expiry_date"] for item in ascending]
    assert dates == sorted(dates)


def test_batch_archive_hides_it_from_the_default_list(client, manager_headers, batch):
    assert client.delete(f"/api/v1/batches/{batch['id']}", headers=manager_headers).status_code == 200

    active = client.get("/api/v1/batches", headers=manager_headers).json()
    assert all(item["id"] != batch["id"] for item in active["items"])

    archived = client.get("/api/v1/batches?include_archived=true", headers=manager_headers).json()
    assert any(item["id"] == batch["id"] for item in archived["items"])


def test_batch_detail_includes_storage_and_recommendation_blocks(client, manager_headers, batch):
    response = client.get(f"/api/v1/batches/{batch['id']}", headers=manager_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["storage_condition"] is not None
    assert "compliance_status" in body["storage_condition"]
    assert isinstance(body["recommendations"], list)
    assert isinstance(body["images"], list)


# -------------------------------------------------------------- inventory
def test_inventory_consume_reduces_quantity(client, manager_headers, batch):
    items = client.get("/api/v1/inventory", headers=manager_headers).json()["items"]
    item = next(entry for entry in items if entry["batch_id"] == batch["id"])

    response = client.post(f"/api/v1/inventory/{item['id']}/consume?quantity=5", headers=manager_headers)
    assert response.status_code == 200
    assert response.json()["quantity"] == pytest.approx(item["quantity"] - 5)


def test_inventory_discard_marks_waste_and_zeroes_quantity(client, manager_headers, batch):
    items = client.get("/api/v1/inventory", headers=manager_headers).json()["items"]
    item = next(entry for entry in items if entry["batch_id"] == batch["id"])

    response = client.post(
        f"/api/v1/inventory/{item['id']}/discard?reason=mould", headers=manager_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert body["discarded"] is True
    assert body["quantity"] == 0
    assert body["status"] == "SPOILED"


def test_inventory_summary_reports_health(client, manager_headers, batch):
    response = client.get("/api/v1/inventory/summary", headers=manager_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total_batches"] >= 1
    assert "status_counts" in body


def test_consumer_cannot_see_another_users_batch(client, auth_headers, batch):
    """The manager's batch must be invisible to a consumer."""
    listing = client.get("/api/v1/batches", headers=auth_headers["CONSUMER"]).json()
    assert all(item["id"] != batch["id"] for item in listing["items"])

    detail = client.get(f"/api/v1/batches/{batch['id']}", headers=auth_headers["CONSUMER"])
    assert detail.status_code == 403
    assert detail.json()["error"]["code"] == "BATCH_FORBIDDEN"


# ---------------------------------------------------------- image upload
def test_valid_jpeg_upload_is_accepted(client, manager_headers, batch, sample_image_bytes):
    response = client.post(
        "/api/v1/images",
        headers=manager_headers,
        files={"file": ("bread.jpg", sample_image_bytes, "image/jpeg")},
        data={"batch_id": str(batch["id"])},
    )
    assert response.status_code == 201
    image = response.json()["image"]
    assert image["content_type"] == "image/jpeg"
    assert image["size_bytes"] == len(sample_image_bytes)
    assert image["width"] > 0 and image["height"] > 0
    assert image["checksum_sha256"]
    assert image["url"].startswith("/api/v1/images/file/")


@pytest.mark.parametrize(
    "filename,content,content_type",
    [
        ("notes.txt", b"just text", "text/plain"),                     # wrong MIME
        ("payload.jpg", b"MZ\x90\x00\x03 fake windows exe", "image/jpeg"),  # wrong magic bytes
        ("script.svg", b"<svg onload=alert(1)></svg>", "image/svg+xml"),    # SVG/XSS vector
        ("empty.jpg", b"", "image/jpeg"),                              # empty
        ("shell.php.jpg", b"<?php system($_GET[0]); ?>", "image/jpeg"), # double extension
    ],
)
def test_dangerous_uploads_are_rejected(client, manager_headers, filename, content, content_type):
    response = client.post(
        "/api/v1/images",
        headers=manager_headers,
        files={"file": (filename, content, content_type)},
    )
    assert response.status_code in (400, 413), response.text
    assert response.json()["success"] is False


def test_oversized_upload_is_rejected(client, manager_headers, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 0)
    response = client.post(
        "/api/v1/images",
        headers=manager_headers,
        files={"file": ("big.jpg", b"\xff\xd8\xff" + b"0" * 5000, "image/jpeg")},
    )
    assert response.status_code in (400, 413)


def test_identical_reupload_reuses_the_existing_record(
    client, manager_headers, batch, sample_image_bytes
):
    first = client.post(
        "/api/v1/images",
        headers=manager_headers,
        files={"file": ("dup.jpg", sample_image_bytes, "image/jpeg")},
        data={"batch_id": str(batch["id"])},
    )
    second = client.post(
        "/api/v1/images",
        headers=manager_headers,
        files={"file": ("dup.jpg", sample_image_bytes, "image/jpeg")},
        data={"batch_id": str(batch["id"])},
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["image"]["id"] == second.json()["image"]["id"]
    assert "already uploaded" in second.json()["message"]


def test_uploaded_file_is_served_back_with_nosniff(
    client, manager_headers, batch, sample_image_bytes
):
    upload = client.post(
        "/api/v1/images",
        headers=manager_headers,
        files={"file": ("served.jpg", sample_image_bytes, "image/jpeg")},
        data={"batch_id": str(batch["id"])},
    )
    url = upload.json()["image"]["url"]
    fetched = client.get(url, headers=manager_headers)
    assert fetched.status_code == 200
    assert fetched.content == sample_image_bytes
    assert fetched.headers["x-content-type-options"] == "nosniff"


def test_image_file_requires_authentication(client, manager_headers, batch, sample_image_bytes):
    upload = client.post(
        "/api/v1/images",
        headers=manager_headers,
        files={"file": ("private.jpg", sample_image_bytes, "image/jpeg")},
        data={"batch_id": str(batch["id"])},
    )
    url = upload.json()["image"]["url"]
    assert client.get(url).status_code == 401


def test_secure_filename_sanitises_traversal_and_double_extensions():
    from app.services.storage_backend import build_storage_key, secure_filename

    assert secure_filename("../../etc/passwd") == "passwd.jpg"
    assert secure_filename("photo.php.jpg") == "photo-php.jpg"
    assert secure_filename("nice name (1).PNG") == "nice-name-1.png"
    assert secure_filename(None) == "upload.jpg"
    assert secure_filename("shell.sh") == "shell.jpg"

    key = build_storage_key("../../evil.jpg", owner_id=3)
    assert ".." not in key
    assert key.startswith("food-images/")


def test_local_storage_rejects_path_traversal_reads():
    from app.core.errors import AppError
    from app.services.storage_backend import LocalFileStorage

    storage = LocalFileStorage()
    with pytest.raises(AppError):
        storage.read("../../../../windows/win.ini")
