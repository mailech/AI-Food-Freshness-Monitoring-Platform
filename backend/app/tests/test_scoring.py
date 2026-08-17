import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient

from app.modules.image_analysis.models import ImageAnalysis

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
async def test_weighted_scoring_engine(client: AsyncClient):
    # Setup credentials
    mgr_token = await get_token(client, "mgr7@example.com", "pass123", "Mgr 7", "RETAIL_MANAGER")
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    # 1. Register Batch
    res_batch = await client.post(
        "/api/v1/inventory/batches",
        json={"batch_number": "LOT-SC-77", "supplier_name": "Weighted Inc"},
        headers=mgr_headers
    )
    batch_id = res_batch.json()["id"]

    # 2. Register Item (Meat & Poultry ideal = 0.0°C, 85%)
    res_item = await client.post(
        "/api/v1/inventory/items",
        json={
            "name": "Organic Chicken Breast",
            "category": "Meat & Poultry",
            "batch_id": batch_id,
            "quantity": 10.0,
            "unit": "kg",
            "entry_date": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat().replace("+00:00", "Z"),
            "expiry_date": (datetime.now(timezone.utc) + timedelta(days=4)).isoformat().replace("+00:00", "Z"),
            "storage_location": "Meat Drawer Refrigerator"
        },
        headers=mgr_headers
    )
    item_id = res_item.json()["id"]

    # 3. Check base score with no logs (Base Confidence = 50%)
    res_base_score = await client.get(
        f"/api/v1/scoring/item/{item_id}",
        headers=mgr_headers
    )
    assert res_base_score.status_code == 200
    base_data = res_base_score.json()
    assert base_data["confidence_score"] == 50.0
    assert base_data["breakdown"]["visual_score"] == 100.0
    assert base_data["breakdown"]["storage_score"] == 100.0

    # 4. Insert image analysis indicating mold (mold_detected = True)
    # This should override the overall health score to 0.0 immediately
    analysis = ImageAnalysis(
        item_id=item_id,
        filename="spoiled_chicken.jpg",
        file_url="/static/uploads/spoiled_chicken.jpg",
        freshness_score=30.0,
        color_degradation=0.5,
        texture_roughness=0.4,
        mold_detected=True,
        mold_confidence=0.9,
        bruising_detected=False,
        bruising_confidence=0.0,
        damage_detected=False,
        damage_confidence=0.0,
        analyzed_at=datetime.now(timezone.utc)
    )
    await analysis.insert()

    res_mold_score = await client.get(
        f"/api/v1/scoring/item/{item_id}",
        headers=mgr_headers
    )
    assert res_mold_score.status_code == 200
    mold_data = res_mold_score.json()
    assert mold_data["combined_health_score"] == 0.0
    assert mold_data["quality_classification"] == "Spoiled"
    # Confidence should go to 50 + 30 = 80% because image upload exists but storage doesn't yet
    assert mold_data["confidence_score"] == 80.0

    # 5. Add a compliant storage reading to push confidence to 100%
    await client.post(
        "/api/v1/storage/reading",
        json={
            "item_id": item_id,
            "temperature": 0.0,
            "humidity": 85.0,
            "air_circulation": "Medium",
            "light_exposure": "Low"
        },
        headers=mgr_headers
    )

    res_full_score = await client.get(
        f"/api/v1/scoring/item/{item_id}",
        headers=mgr_headers
    )
    assert res_full_score.status_code == 200
    full_data = res_full_score.json()
    assert full_data["confidence_score"] == 100.0

    # 6. Fetch batch aggregated score
    res_batch_score = await client.get(
        f"/api/v1/scoring/batch/{batch_id}",
        headers=mgr_headers
    )
    assert res_batch_score.status_code == 200
    batch_data = res_batch_score.json()
    assert batch_data["item_count"] == 1
    assert batch_data["average_health_score"] == 0.0 # because the item is moldy
    assert batch_data["quality_classification"] == "Spoiled"
