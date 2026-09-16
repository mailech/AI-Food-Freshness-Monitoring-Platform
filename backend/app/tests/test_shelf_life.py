import uuid
import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient

from app.modules.shelf_life.pipeline import (
    ShelfLifeInput,
    ShelfLifeFeatureExtractor,
    ShelfLifePredictorModel,
    run_shelf_life_prediction_pipeline
)

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
async def test_modular_prediction_pipeline_direct_execution():
    # 1. Normal Conditions Test
    inp_normal = ShelfLifeInput(
        category="Dairy Products",
        packaging_type="None",
        temperature=3.0,
        humidity=50.0,
        air_circulation="Medium",
        light_exposure="Low",
        storage_duration_days=0.0,
        visual_freshness_score=95.0
    )
    res_normal = run_shelf_life_prediction_pipeline(inp_normal)
    assert res_normal.status == "SUCCESS"
    assert 6.0 <= res_normal.estimated_remaining_days <= 7.5
    assert res_normal.risk_level == "LOW"

    # 2. High Temperature Abuse Test (35°C for Dairy Products)
    inp_heat = ShelfLifeInput(
        category="Dairy Products",
        packaging_type="None",
        temperature=35.0,
        humidity=50.0,
        air_circulation="Medium",
        light_exposure="Low",
        storage_duration_days=0.0,
        visual_freshness_score=95.0
    )
    res_heat = run_shelf_life_prediction_pipeline(inp_heat)
    assert res_heat.status == "SUCCESS"
    assert res_heat.estimated_remaining_days < 1.5
    assert res_heat.risk_level == "HIGH"

    # 3. High Humidity & Mold Override Test
    inp_mold = ShelfLifeInput(
        category="Bakery Products",
        packaging_type="None",
        temperature=20.0,
        humidity=95.0,
        air_circulation="Low",
        light_exposure="High",
        storage_duration_days=1.0,
        visual_freshness_score=10.0,
        mold_detected=True
    )
    res_mold = run_shelf_life_prediction_pipeline(inp_mold)
    assert res_mold.status == "MOLD_CONTAMINATION_OVERRIDE"
    assert res_mold.estimated_remaining_days == 0.0
    assert res_mold.risk_level == "HIGH"

    # 4. Packaging Extensions Test (MAP vs None for Meat & Poultry)
    inp_meat_none = ShelfLifeInput(
        category="Meat & Poultry", packaging_type="None",
        temperature=0.0, humidity=85.0, storage_duration_days=0.0
    )
    inp_meat_map = ShelfLifeInput(
        category="Meat & Poultry", packaging_type="Modified Atmosphere Packaging (MAP)",
        temperature=0.0, humidity=85.0, storage_duration_days=0.0
    )
    res_none = run_shelf_life_prediction_pipeline(inp_meat_none)
    res_map = run_shelf_life_prediction_pipeline(inp_meat_map)
    assert res_map.estimated_remaining_days > res_none.estimated_remaining_days

    # 5. Out of bounds Invalid Input / Uncertainty Test
    inp_invalid = ShelfLifeInput(
        category="Fruits",
        packaging_type="None",
        temperature=150.0, # Impossible temperature
        humidity=50.0,
        storage_duration_days=0.0
    )
    res_invalid = run_shelf_life_prediction_pipeline(inp_invalid)
    assert res_invalid.status == "INVALID_INPUT"
    assert res_invalid.confidence_score == 0.0

@pytest.mark.asyncio
async def test_dynamic_shelf_life_prediction_api(client: AsyncClient):
    token = await get_token(client, "mgr5@example.com", "pass123", "Mgr 5", "RETAIL_MANAGER")
    headers = {"Authorization": f"Bearer {token}"}

    # Test API endpoint prediction for Dairy Products
    res_ideal = await client.post(
        "/api/v1/shelf-life/predict",
        json={
            "category": "Dairy Products",
            "packaging_type": "None",
            "temperature": 3.0,
            "humidity": 50.0,
            "air_circulation": "Medium",
            "light_exposure": "Low",
            "storage_duration_days": 0.0
        },
        headers=headers
    )
    assert res_ideal.status_code == 200
    data_ideal = res_ideal.json()
    assert data_ideal["predicted_remaining_shelf_life_days"] > 5.0
    assert data_ideal["risk_level"] == "LOW"
    assert data_ideal["status"] == "SUCCESS"

    # Test API prediction for database item
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
    assert "predicted_remaining_shelf_life_days" in data_db
    assert data_db["risk_level"] in ("HIGH", "MEDIUM", "LOW")
