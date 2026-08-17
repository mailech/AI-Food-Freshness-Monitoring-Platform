import io
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from PIL import Image

from app.modules.inventory.models import BatchStatus

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
async def test_image_analysis_upload_pipeline(client: AsyncClient):
    # 1. Register user & authenticate
    token = await get_token(client, "operator@example.com", "pass123", "Op User", "WAREHOUSE_OPERATOR")
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Register Batch (Lot)
    res_batch = await client.post(
        "/api/v1/inventory/batches",
        json={"batch_number": "LOT-CV-01", "supplier_name": "CV Farms Inc."},
        headers=headers
    )
    assert res_batch.status_code == 201
    batch_id = res_batch.json()["id"]

    # 3. Register Inventory Item
    expiry = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat().replace("+00:00", "Z")
    res_item = await client.post(
        "/api/v1/inventory/items",
        json={
            "name": "Fresh Strawberries",
            "category": "Fruits",
            "batch_id": batch_id,
            "quantity": 10.0,
            "unit": "boxes",
            "expiry_date": expiry,
            "storage_location": "Cold Room A"
        },
        headers=headers
    )
    assert res_item.status_code == 201
    item_data = res_item.json()
    item_id = item_data["id"]
    assert item_data["status"] == "FRESH"

    # 4. Generate in-memory mockup image (100x100 RGB image)
    img = Image.new("RGB", (100, 100), color="green")
    img_io = io.BytesIO()
    img.save(img_io, format="JPEG")
    img_io.seek(0)

    # 5. POST to Image Upload Endpoint
    files = {"file": ("strawberries.jpg", img_io, "image/jpeg")}
    data = {"item_id": item_id}
    
    res_upload = await client.post(
        "/api/v1/image-analysis/upload",
        headers=headers,
        data=data,
        files=files
    )
    assert res_upload.status_code == 201
    analysis_data = res_upload.json()
    
    # Assert MongoDB Beanie fields are logged correctly
    assert analysis_data["item_id"] == item_id
    assert analysis_data["filename"] == "strawberries.jpg"
    assert "file_url" in analysis_data
    assert "freshness_score" in analysis_data
    assert "color_degradation" in analysis_data
    assert "texture_roughness" in analysis_data
    assert "mold_detected" in analysis_data
    
    # 6. Retrieve item again from relational DB to verify status updated based on analysis
    res_item_refreshed = await client.get(
        f"/api/v1/inventory/items/{item_id}",
        headers=headers
    )
    assert res_item_refreshed.status_code == 200
    refreshed_data = res_item_refreshed.json()
    
    # Check that status is within defined enums
    assert refreshed_data["status"] in ["FRESH", "WARNING", "SPOILED"]

    # 7. GET historical image analyses for this item
    res_history = await client.get(
        f"/api/v1/image-analysis/item/{item_id}",
        headers=headers
    )
    assert res_history.status_code == 200
    history_list = res_history.json()
    assert len(history_list) >= 1
    assert history_list[0]["filename"] == "strawberries.jpg"
