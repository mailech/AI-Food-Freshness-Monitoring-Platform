import io
import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from PIL import Image

@pytest.mark.asyncio
async def test_freshlens_end_to_end_critical_path(client: AsyncClient):
    # 1. Signup / Register new user
    user_email = "critical_user@example.com"
    user_pass = "pass123"
    res_reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": user_email,
            "password": user_pass,
            "full_name": "Critical Inspector",
            "role": "RETAIL_MANAGER"
        }
    )
    assert res_reg.status_code == 201
    
    # 2. Login to retrieve the token
    res_token = await client.post(
        "/api/v1/auth/token",
        data={"username": user_email, "password": user_pass}
    )
    assert res_token.status_code == 200
    token = res_token.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Create a Supply Lot (Batch)
    res_batch = await client.post(
        "/api/v1/inventory/batches",
        json={
            "batch_number": "LOT-CRIT-99",
            "supplier_name": "Integrated Supply Chain",
            "received_date": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        },
        headers=headers
    )
    assert res_batch.status_code == 201
    batch_id = res_batch.json()["id"]
    
    # 4. Register a Food Item
    expiry = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat().replace("+00:00", "Z")
    res_item = await client.post(
        "/api/v1/inventory/items",
        json={
            "name": "Produce Specimen",
            "category": "Fruits",
            "batch_id": batch_id,
            "quantity": 10.0,
            "unit": "kg",
            "packaging_type": "None",
            "expiry_date": expiry,
            "storage_location": "Zone Alpha"
        },
        headers=headers
    )
    assert res_item.status_code == 201
    item_id = res_item.json()["id"]
    
    # 5. Upload Specimen Image (Multipart upload with valid PIL bytes)
    img = Image.new("RGB", (100, 100), color="green")
    img_io = io.BytesIO()
    img.save(img_io, format="JPEG")
    img_io.seek(0)
    
    files = {"file": ("test_produce.jpg", img_io, "image/jpeg")}
    data = {"item_id": item_id}
    res_upload = await client.post(
        "/api/v1/image-analysis/upload",
        data=data,
        files=files,
        headers=headers
    )
    assert res_upload.status_code == 201
    
    # 6. Retrieve Scoring Breakdown
    res_score = await client.get(
        f"/api/v1/scoring/item/{item_id}",
        headers=headers
    )
    assert res_score.status_code == 200
    score_data = res_score.json()
    assert "combined_health_score" in score_data
    assert "breakdown" in score_data
    
    # 7. Check Recommendation Panel Suggestions
    res_rec = await client.get(
        f"/api/v1/recommendation/item/{item_id}",
        headers=headers
    )
    assert res_rec.status_code == 200
    rec_data = res_rec.json()
    assert "storage_advisories" in rec_data
    assert "rotation_advisories" in rec_data
    
    # 8. Check Notifications Dispatch Center
    res_alerts = await client.get(
        "/api/v1/notification/?role=RETAIL_MANAGER",
        headers=headers
    )
    assert res_alerts.status_code == 200
    
    # 9. Export Report Preview & PDF File
    res_report = await client.get(
        "/api/v1/report/preview?report_type=freshness",
        headers=headers
    )
    assert res_report.status_code == 200
    
    # Generate report with item in db
    res_export = await client.get(
        "/api/v1/report/export?report_type=freshness&format=pdf",
        headers=headers
    )
    assert res_export.status_code == 200
    assert res_export.headers["content-type"] == "application/pdf"
