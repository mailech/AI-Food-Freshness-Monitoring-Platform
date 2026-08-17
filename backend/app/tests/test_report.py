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
async def test_report_generation_and_exports(client: AsyncClient):
    token_mgr = await get_token(client, "report_manager@example.com", "pass123", "Report Mgr", "RETAIL_MANAGER")
    
    # 1. Create a Batch
    res_batch = await client.post(
        "/api/v1/inventory/batches",
        json={
            "batch_number": "LOT-REP-01",
            "supplier_name": "Wholesale Distributors",
            "received_date": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        },
        headers={"Authorization": f"Bearer {token_mgr}"}
    )
    assert res_batch.status_code == 201
    batch_id = res_batch.json()["id"]
    
    # 2. Register items
    expiry_soon = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat().replace("+00:00", "Z")
    expiry_far = (datetime.now(timezone.utc) + timedelta(days=15)).isoformat().replace("+00:00", "Z")
    
    # Item 1: Apples (Expiring soon, warning)
    res_item1 = await client.post(
        "/api/v1/inventory/items",
        json={
            "name": "Apples",
            "category": "Fruits",
            "batch_id": batch_id,
            "quantity": 100.0,
            "unit": "kg",
            "packaging_type": "None",
            "expiry_date": expiry_soon,
            "storage_location": "Zone Alpha"
        },
        headers={"Authorization": f"Bearer {token_mgr}"}
    )
    assert res_item1.status_code == 201

    # Item 2: Salmon (Expiring far)
    res_item2 = await client.post(
        "/api/v1/inventory/items",
        json={
            "name": "Fresh Salmon",
            "category": "Seafood",
            "batch_id": batch_id,
            "quantity": 30.0,
            "unit": "kg",
            "packaging_type": "Vacuum Sealed",
            "expiry_date": expiry_far,
            "storage_location": "Cold Room 1"
        },
        headers={"Authorization": f"Bearer {token_mgr}"}
    )
    assert res_item2.status_code == 201

    # 3. Test Preview Endpoints
    # Freshness preview
    res_fresh = await client.get("/api/v1/report/preview?report_type=freshness")
    assert res_fresh.status_code == 200
    data_fresh = res_fresh.json()
    assert data_fresh["report_type"] == "freshness"
    assert data_fresh["summary_stats"]["total_items"] >= 2
    assert "average_freshness_score" in data_fresh["summary_stats"]
    assert len(data_fresh["items"]) >= 2
    
    # Shelf-life preview
    res_shelf = await client.get("/api/v1/report/preview?report_type=shelf-life")
    assert res_shelf.status_code == 200
    data_shelf = res_shelf.json()
    assert data_shelf["report_type"] == "shelf-life"
    assert "shelf_life_warnings" in data_shelf["summary_stats"]
    
    # Quality preview
    res_qual = await client.get("/api/v1/report/preview?report_type=quality")
    assert res_qual.status_code == 200
    assert res_qual.json()["report_type"] == "quality"

    # Waste preview
    res_waste = await client.get("/api/v1/report/preview?report_type=waste")
    assert res_waste.status_code == 200
    assert res_waste.json()["report_type"] == "waste"

    # Storage preview
    res_storage = await client.get("/api/v1/report/preview?report_type=storage")
    assert res_storage.status_code == 200
    assert res_storage.json()["report_type"] == "storage"

    # 4. Test PDF Export
    res_pdf = await client.get("/api/v1/report/export?report_type=freshness&format=pdf")
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert b"%PDF" in res_pdf.content

    # 5. Test Excel Export
    res_xls = await client.get("/api/v1/report/export?report_type=freshness&format=excel")
    assert res_xls.status_code == 200
    assert res_xls.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    # XLSX files are zip packages and start with PK header bytes
    assert res_xls.content.startswith(b"PK")
