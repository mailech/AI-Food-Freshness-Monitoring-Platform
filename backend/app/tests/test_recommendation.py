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
async def test_recommendations_engine_and_fefo_alarms(client: AsyncClient):
    mgr_token = await get_token(client, "mgr8@example.com", "pass123", "Mgr 8", "RETAIL_MANAGER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    # 1. Setup Lot
    res_batch = await client.post(
        "/api/v1/inventory/batches",
        json={"batch_number": "LOT-RC-88", "supplier_name": "Logistics Corp"},
        headers=mgr_headers
    )
    batch_id = res_batch.json()["id"]

    # 2. Setup Item: Fish fillet under warm ambient storage conditions (Seafood ideal = -1°C)
    res_item = await client.post(
        "/api/v1/inventory/items",
        json={
            "name": "Fresh Tuna Steak",
            "category": "Seafood",
            "batch_id": batch_id,
            "quantity": 5.0,
            "unit": "kg",
            "entry_date": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat().replace("+00:00", "Z"),
            "storage_location": "Main Ambient Aisle" # warm!
        },
        headers=mgr_headers
    )
    item_id = res_item.json()["id"]

    # 3. Retrieve recommendations
    res_recs = await client.get(
        f"/api/v1/recommendation/item/{item_id}",
        headers=mgr_headers
    )
    assert res_recs.status_code == 200
    recs_data = res_recs.json()

    # Verify temp correction advice (ambient 20°C > ideal -1°C)
    storage_recs = " ".join(recs_data["storage_advisories"]).lower()
    assert "decrease refrigeration" in storage_recs
    assert "vacuum sealed" in storage_recs

    # Verify rotation alerts
    rotation_recs = " ".join(recs_data["rotation_advisories"]).lower()
    assert "fefo" in rotation_recs

    # 4. Fetch batch level recommendations summary
    res_batch_recs = await client.get(
        f"/api/v1/recommendation/batch/{batch_id}",
        headers=mgr_headers
    )
    assert res_batch_recs.status_code == 200
    batch_data = res_batch_recs.json()
    assert batch_data["item_count"] == 1
    assert len(batch_data["recommendations_summary"]) > 0
