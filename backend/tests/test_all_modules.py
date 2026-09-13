import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import Base, get_db
from app.core.security import create_access_token
from app.ml.scoring_engine import FreshnessScoringEngine
from app.ml.shelf_life_engine import KineticShelfLifeEngine

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_auth_login():
    response = client.post("/api/auth/login", json={
        "email": "admin@foodfresh.io",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "administrator"

def test_inventory_list():
    response = client.get("/api/inventory/items")
    assert response.status_code == 200
    items = response.json()
    assert len(items) > 0
    categories = {it["category"] for it in items}
    assert "Fruits" in categories

def test_storage_locations_and_telemetry():
    response = client.get("/api/storage/locations")
    assert response.status_code == 200
    locations = response.json()
    assert len(locations) >= 4
    
    loc_id = locations[0]["id"]
    sim_res = client.post("/api/storage/simulate-telemetry", json={
        "storage_location_id": loc_id,
        "temperature": 3.2,
        "humidity": 88.5,
        "air_circulation": "Medium",
        "light_exposure": "Dark"
    })
    assert sim_res.status_code == 200
    assert sim_res.json()["is_compliant"] is True

def test_weighted_freshness_scoring_formula():
    res = FreshnessScoringEngine.compute_weighted_freshness_score(
        visual_score=95.0,
        category="Fruits",
        temperature=3.0,
        humidity=90.0,
        remaining_shelf_life_days=14.0,
        days_stored=2
    )
    assert res["final_freshness_score"] >= 85.0
    assert res["freshness_category"] == "Fresh"
    assert res["visual_weight"] == 0.40
    assert res["storage_weight"] == 0.25
    assert res["shelf_life_weight"] == 0.20
    assert res["product_age_weight"] == 0.15

def test_kinetic_shelf_life_prediction():
    pred = KineticShelfLifeEngine.predict_shelf_life(
        category="Fruits",
        current_freshness_score=90.0,
        storage_temperature=3.0,
        storage_humidity=90.0,
        packaging_type="Sealed Container",
        days_stored=2
    )
    assert pred["adjusted_shelf_life_days"] > 0
    assert "predicted_expiry_date" in pred
    assert pred["risk_level"] in ["Low", "Medium", "High", "Critical"]

def test_analytics_dashboard():
    response = client.get("/api/analytics/dashboard/retail_manager")
    assert response.status_code == 200
    data = response.json()
    assert "total_items" in data
    assert "average_freshness_score" in data
    assert "storage_compliance_rate" in data

def test_reports_pdf_export():
    response = client.get("/api/reports/export/pdf")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert len(response.content) > 500

def test_reports_excel_export():
    response = client.get("/api/reports/export/excel")
    assert response.status_code == 200
    assert len(response.content) > 500
