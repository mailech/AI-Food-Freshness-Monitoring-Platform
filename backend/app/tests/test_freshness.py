import io
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from PIL import Image

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
async def test_freshness_scoring_and_decay(client: AsyncClient):
    token = await get_token(client, "mgr4@example.com", "pass123", "Mgr 4", "RETAIL_MANAGER")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Register Batch
    res_batch = await client.post(
        "/api/v1/inventory/batches",
        json={"batch_number": "LOT-FR-01", "supplier_name": "Fresh Farms"},
        headers=headers
    )
    batch_id = res_batch.json()["id"]

    # 2. Register Item 1: High remaining duration (Expiry in 10 days, entry 2 days ago)
    # Total duration = 12 days. Remaining = 10 days. Decay factor should be ~83.3%
    entry_1 = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat().replace("+00:00", "Z")
    expiry_1 = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat().replace("+00:00", "Z")
    res_item1 = await client.post(
        "/api/v1/inventory/items",
        json={
            "name": "Crisp Celery",
            "category": "Vegetables",
            "batch_id": batch_id,
            "quantity": 10.0,
            "unit": "bunches",
            "entry_date": entry_1,
            "expiry_date": expiry_1,
            "storage_location": "Rack 1"
        },
        headers=headers
    )
    assert res_item1.status_code == 201
    item1_id = res_item1.json()["id"]

    # 3. Register Item 2: Low remaining duration (Expiry in 1 day, entry 9 days ago)
    # Total duration = 10 days. Remaining = 1 day. Decay factor should be ~10.0%
    entry_2 = (datetime.now(timezone.utc) - timedelta(days=9)).isoformat().replace("+00:00", "Z")
    expiry_2 = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat().replace("+00:00", "Z")
    res_item2 = await client.post(
        "/api/v1/inventory/items",
        json={
            "name": "Ripe Raspberries",
            "category": "Fruits",
            "batch_id": batch_id,
            "quantity": 5.0,
            "unit": "boxes",
            "entry_date": entry_2,
            "expiry_date": expiry_2,
            "storage_location": "Fridge A"
        },
        headers=headers
    )
    assert res_item2.status_code == 201
    item2_id = res_item2.json()["id"]

    # 4. GET Freshness report for Item 1 (Time-decay fallback: ~83.3% -> Good)
    res_rep1 = await client.get(
        f"/api/v1/freshness/item/{item1_id}",
        headers=headers
    )
    assert res_rep1.status_code == 200
    rep1_data = res_rep1.json()
    assert 80.0 <= rep1_data["current"]["freshness_score"] <= 85.0
    assert rep1_data["current"]["quality_classification"] == "Good"
    assert len(rep1_data["trend"]) >= 2  # Fallback trend checkpoints

    # 5. GET Freshness report for Item 2 (Time-decay fallback: ~10.0% -> Spoiled)
    res_rep2 = await client.get(
        f"/api/v1/freshness/item/{item2_id}",
        headers=headers
    )
    assert res_rep2.status_code == 200
    rep2_data = res_rep2.json()
    assert rep2_data["current"]["freshness_score"] < 15.0
    assert rep2_data["current"]["quality_classification"] == "Spoiled"

    # 6. Upload a MOLDY image to Item 1 and test that score drops to 0.0 (Spoiled)
    img = Image.new("RGB", (100, 100), color="brown")
    img_io = io.BytesIO()
    img.save(img_io, format="JPEG")
    img_io.seek(0)
    
    # We patch analyze_image in model_pipeline to return mold_detected=True for testing
    from app.modules.image_analysis.router import model_pipeline
    original_analyze = model_pipeline.analyze_image
    
    def mock_analyze_moldy(path):
        return {
            "freshness_score": 35.0,
            "color_degradation": 0.65,
            "texture_roughness": 0.55,
            "mold_detected": True,
            "mold_confidence": 0.95,
            "bruising_detected": False,
            "bruising_confidence": 0.0,
            "damage_detected": False,
            "damage_confidence": 0.0,
        }
    
    model_pipeline.analyze_image = mock_analyze_moldy

    try:
        files = {"file": ("moldy.jpg", img_io, "image/jpeg")}
        res_upload = await client.post(
            "/api/v1/image-analysis/upload",
            headers=headers,
            data={"item_id": item1_id},
            files=files
        )
        assert res_upload.status_code == 201

        # Retrieve freshness diagnostics report again
        res_rep1_after = await client.get(
            f"/api/v1/freshness/item/{item1_id}",
            headers=headers
        )
        assert res_rep1_after.status_code == 200
        rep1_after_data = res_rep1_after.json()
        
        # Mold overrides score to 0.0
        assert rep1_after_data["current"]["freshness_score"] == 0.0
        assert rep1_after_data["current"]["quality_classification"] == "Spoiled"
        assert rep1_after_data["current"]["spoilage_probability"] == 100.0
        assert rep1_after_data["current"]["has_image_analysis"] is True
    finally:
        model_pipeline.analyze_image = original_analyze
