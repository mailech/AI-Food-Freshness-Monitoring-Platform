import uuid
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
async def test_dynamic_shelf_life_prediction(client: AsyncClient):
    token = await get_token(client, "mgr5@example.com", "pass123", "Mgr 5", "RETAIL_MANAGER")
    headers = {"Authorization": f"Bearer {token}"}

    # Test 1: Ideal Dairy Storage (ideal = 3°C, packaging = None)
    # Base shelf life = 7 days.
    res_ideal = await client.post(
        "/api/v1/shelf-life/predict",
        json={
            "category": "Dairy Products",
            "packaging_type": "None",
            "temperature": 3.0,
            "humidity": 50.0,
            "storage_duration_days": 0.0
        },
        headers=headers
    )
    assert res_ideal.status_code == 200
    data_ideal = res_ideal.json()
    assert 6.5 <= data_ideal["predicted_remaining_shelf_life_days"] <= 7.5
    assert data_ideal["risk_level"] == "LOW"

    # Test 2: Abused Dairy Storage (temperature = 23°C)
    # Temp diff = 20°C, sensitivity = 1.15. Decay multiplier = 1.15 ** 20 = 16.3x acceleration.
    # Expected shelf life: 7 / 16.3 = ~0.4 days. Risk level should be HIGH.
    res_abused = await client.post(
        "/api/v1/shelf-life/predict",
        json={
            "category": "Dairy Products",
            "packaging_type": "None",
            "temperature": 23.0,
            "humidity": 50.0,
            "storage_duration_days": 0.0
        },
        headers=headers
    )
    assert res_abused.status_code == 200
    data_abused = res_abused.json()
    assert data_abused["predicted_remaining_shelf_life_days"] < 1.5
    assert data_abused["risk_level"] == "HIGH"
    assert "accelerates decay" in data_abused["impact_analysis"]["temperature_impact"].lower()

    # Test 3: Prediction for registered database item
    res_batch = await client.post(
        "/api/v1/inventory/batches",
        json={"batch_number": "LOT-SL-99", "supplier_name": "Kinetic Foods"},
        headers=headers
    )
    batch_id = res_batch.json()["id"]

    entry_date = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat().replace("+00:00", "Z")
    expiry_date = (datetime.now(timezone.utc) + timedelta(days=12)).isoformat().replace("+00:00", "Z")
    
    res_item = await client.post(
        "/api/v1/inventory/items",
        json={
            "name": "Fresh Spinach",
            "category": "Vegetables",
            "batch_id": batch_id,
            "quantity": 25.0,
            "unit": "bags",
            "entry_date": entry_date,
            "expiry_date": expiry_date,
            "storage_location": "Walk-in Cold Room Fridge Unit"
        },
        headers=headers
    )
    item_id = res_item.json()["id"]

    # Request prediction using item_id and dynamic override temperature (ideal fridge unit = 4°C, let's abuse to 15°C)
    res_db_predict = await client.post(
        "/api/v1/shelf-life/predict",
        json={
            "item_id": item_id,
            "temperature": 15.0,
            "humidity": 95.0,
            "storage_duration_days": 0.0
        },
        headers=headers
    )
    assert res_db_predict.status_code == 200
    data_db = res_db_predict.json()
    # Spinach base = 10 days. At 15°C (11°C diff, sensitivity = 1.09):
    # Temp multiplier = 1.09^11 = 2.58x. Elapsed duration is ~2 days.
    # Total current shelf life under 15°C is 10/2.58 = ~3.8 days.
    # 3.8 days - 2 elapsed days = ~1.8 days remaining.
    assert data_db["predicted_remaining_shelf_life_days"] < 3.0
    assert data_db["risk_level"] in ("HIGH", "MEDIUM")
