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
async def test_storage_telemetry_and_compliance(client: AsyncClient):
    # Retrieve manager token & consumer token
    mgr_token = await get_token(client, "mgr6@example.com", "pass123", "Mgr 6", "RETAIL_MANAGER")
    con_token = await get_token(client, "con6@example.com", "pass123", "Con 6", "CONSUMER")
    
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
    con_headers = {"Authorization": f"Bearer {con_token}"}

    # 1. Setup inventory item
    res_batch = await client.post(
        "/api/v1/inventory/batches",
        json={"batch_number": "LOT-ST-88", "supplier_name": "Compliance Corp"},
        headers=mgr_headers
    )
    batch_id = res_batch.json()["id"]

    res_item = await client.post(
        "/api/v1/inventory/items",
        json={
            "name": "Fresh Cod Fillet",
            "category": "Seafood",
            "batch_id": batch_id,
            "quantity": 12.0,
            "unit": "kg",
            "entry_date": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat().replace("+00:00", "Z"),
            "storage_location": "Seafood Drawer Freezer"
        },
        headers=mgr_headers
    )
    item_id = res_item.json()["id"]

    # 2. Ingest COMPLIANT reading (Seafood ideal = -1°C, 90%)
    res_compliant = await client.post(
        "/api/v1/storage/reading",
        json={
            "item_id": item_id,
            "temperature": -1.0,
            "humidity": 90.0,
            "air_circulation": "Medium",
            "light_exposure": "Dark"
        },
        headers=mgr_headers
    )
    assert res_compliant.status_code == 201
    rep_comp = res_compliant.json()
    assert rep_comp["compliance_status"] == "COMPLIANT"
    assert "compliance" in rep_comp["recommendations"][0].lower()

    # 3. Ingest CRITICAL reading (Seafood temp = 15°C -> +16°C deviation)
    res_critical = await client.post(
        "/api/v1/storage/reading",
        json={
            "item_id": item_id,
            "temperature": 15.0,
            "humidity": 90.0,
            "air_circulation": "Low",
            "light_exposure": "High"
        },
        headers=mgr_headers
    )
    assert res_critical.status_code == 201
    rep_crit = res_critical.json()
    assert rep_crit["compliance_status"] == "CRITICAL"
    # Verify recommendations complain about temperature and lights
    recs_str = " ".join(rep_crit["recommendations"]).lower()
    assert "critical heat abuse" in recs_str
    assert "photo-oxidation" in recs_str

    # 4. Attempt ingestion using CONSUMER account (should be blocked)
    res_denied = await client.post(
        "/api/v1/storage/reading",
        json={
            "item_id": item_id,
            "temperature": -1.0,
            "humidity": 90.0,
            "air_circulation": "Medium",
            "light_exposure": "Dark"
        },
        headers=con_headers
    )
    assert res_denied.status_code == 403

    # 5. Fetch Storage Diagnostic Report GET /api/v1/storage/item/{item_id}
    res_report = await client.get(
        f"/api/v1/storage/item/{item_id}",
        headers=mgr_headers
    )
    assert res_report.status_code == 200
    assert res_report.json()["compliance_status"] == "CRITICAL" # showing latest recorded state

    # 6. Fetch Storage readings history GET /api/v1/storage/item/{item_id}/history
    res_history = await client.get(
        f"/api/v1/storage/item/{item_id}/history",
        headers=mgr_headers
    )
    assert res_history.status_code == 200
    history_data = res_history.json()
    assert len(history_data) >= 2
    assert history_data[0]["temperature"] == 15.0 # latest first sorting
