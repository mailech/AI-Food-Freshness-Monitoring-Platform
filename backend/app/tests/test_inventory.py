import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient

async def get_token(client: AsyncClient, email: str, password: str, name: str, role: str) -> str:
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": name, "role": role}
    )
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": email, "password": password}
    )
    return response.json()["access_token"]

@pytest.mark.asyncio
async def test_inventory_flow_and_rbac(client: AsyncClient):
    token_consumer = await get_token(client, "consumer@example.com", "pass123", "Consumer User", "CONSUMER")
    token_mgr = await get_token(client, "manager@example.com", "pass123", "Manager User", "RETAIL_MANAGER")
    
    # 1. RETAIL_MANAGER creates a Batch (Lot)
    res_batch = await client.post(
        "/api/v1/inventory/batches",
        json={
            "batch_number": "LOT-20260809-01",
            "supplier_name": "Fresh Farms Inc.",
            "received_date": "2026-08-09T12:00:00Z"
        },
        headers={"Authorization": f"Bearer {token_mgr}"}
    )
    assert res_batch.status_code == 201
    batch_data = res_batch.json()
    batch_id = batch_data["id"]
    assert batch_data["batch_number"] == "LOT-20260809-01"
    
    # 2. CONSUMER is forbidden from creating a Batch
    res_forbidden_batch = await client.post(
        "/api/v1/inventory/batches",
        json={
            "batch_number": "LOT-20260809-02",
            "supplier_name": "Illegal Farms"
        },
        headers={"Authorization": f"Bearer {token_consumer}"}
    )
    assert res_forbidden_batch.status_code == 403

    # 3. RETAIL_MANAGER creates an item linked to the batch
    # Date in future (fresh: 10 days left)
    fresh_expiry = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat().replace("+00:00", "Z")
    
    res_item1 = await client.post(
        "/api/v1/inventory/items",
        json={
            "name": "Organic Red Apples",
            "category": "Fruits",
            "batch_id": batch_id,
            "quantity": 50.0,
            "unit": "kg",
            "packaging_type": "None",
            "expiry_date": fresh_expiry,
            "storage_location": "Aisle 1"
        },
        headers={"Authorization": f"Bearer {token_mgr}"}
    )
    assert res_item1.status_code == 201
    item1_data = res_item1.json()
    assert item1_data["status"] == "FRESH"
    
    # 4. Create a near-expiry item (warning: 2 days left)
    warning_expiry = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat().replace("+00:00", "Z")
    res_item2 = await client.post(
        "/api/v1/inventory/items",
        json={
            "name": "Fresh Whole Milk",
            "category": "Dairy Products",
            "batch_id": batch_id,
            "quantity": 10.0,
            "unit": "liters",
            "packaging_type": "Plastic Bottle",
            "expiry_date": warning_expiry,
            "storage_location": "Fridge A"
        },
        headers={"Authorization": f"Bearer {token_mgr}"}
    )
    assert res_item2.status_code == 201
    item2_data = res_item2.json()
    assert item2_data["status"] == "WARNING"

    # 5. Create a spoiled item (spoiled: 1 day ago)
    spoiled_expiry = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat().replace("+00:00", "Z")
    res_item3 = await client.post(
        "/api/v1/inventory/items",
        json={
            "name": "Old Tilapia Fillet",
            "category": "Seafood",
            "batch_id": batch_id,
            "quantity": 5.0,
            "unit": "kg",
            "packaging_type": "Vacuum Sealed",
            "expiry_date": spoiled_expiry,
            "storage_location": "Freezer B"
        },
        headers={"Authorization": f"Bearer {token_mgr}"}
    )
    assert res_item3.status_code == 201
    item3_data = res_item3.json()
    assert item3_data["status"] == "SPOILED"

    # 6. CONSUMER is forbidden from creating an Item
    res_forbidden_item = await client.post(
        "/api/v1/inventory/items",
        json={
            "name": "Pantry Cookies",
            "category": "Packaged Foods",
            "quantity": 1.0,
            "unit": "box",
            "expiry_date": fresh_expiry
        },
        headers={"Authorization": f"Bearer {token_consumer}"}
    )
    assert res_forbidden_item.status_code == 403

    # 7. Test search and filtering
    # Search "Milk"
    res_search = await client.get(
        "/api/v1/inventory/items?search=Milk",
        headers={"Authorization": f"Bearer {token_mgr}"}
    )
    assert res_search.status_code == 200
    search_results = res_search.json()
    assert len(search_results) == 1
    assert search_results[0]["name"] == "Fresh Whole Milk"

    # Filter category "Fruits"
    res_cat = await client.get(
        "/api/v1/inventory/items?category=Fruits",
        headers={"Authorization": f"Bearer {token_mgr}"}
    )
    assert res_cat.status_code == 200
    cat_results = res_cat.json()
    assert len(cat_results) == 1
    assert cat_results[0]["name"] == "Organic Red Apples"

    # Filter status "WARNING"
    res_status = await client.get(
        "/api/v1/inventory/items?status=WARNING",
        headers={"Authorization": f"Bearer {token_mgr}"}
    )
    assert res_status.status_code == 200
    status_results = res_status.json()
    assert len(status_results) == 1
    assert status_results[0]["name"] == "Fresh Whole Milk"

    # 8. Test item deletion
    res_del = await client.delete(
        f"/api/v1/inventory/items/{item1_data['id']}",
        headers={"Authorization": f"Bearer {token_mgr}"}
    )
    assert res_del.status_code == 204
