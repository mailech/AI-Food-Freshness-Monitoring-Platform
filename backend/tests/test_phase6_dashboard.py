import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, SessionLocal, engine, get_db
from app.services.shelflife_service import calculate_shelf_life_days, get_baseline_shelf_life

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_and_cleanup_db():
    from sqlalchemy import text
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        if conn.dialect.name == "postgresql":
            conn.execute(text("ALTER TABLE food_items ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT FALSE;"))
    # Pre-test cleanup
    db = SessionLocal()
    try:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

    yield

    # Post-test cleanup (ensures database is left clean with 0 leftover rows)
    db = SessionLocal()
    try:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

def get_token_for_role(name: str, email: str, role: str) -> str:
    res = client.post(
        "/auth/signup",
        json={
            "full_name": name,
            "email": email,
            "password": "Password123!",
            "role": role
        }
    )
    return res.json()["access_token"]


def test_q10_temperature_math_direction():
    # Baseline at 4°C for Dairy is 7 days
    assert get_baseline_shelf_life("Dairy") == 7

    days_at_4c = calculate_shelf_life_days("Dairy", temp=4.0, humidity=80.0)
    assert days_at_4c == 7

    # 14°C is 10°C hotter -> shelf life should HALVE (~3.5 -> round to 4 or 3)
    days_at_14c = calculate_shelf_life_days("Dairy", temp=14.0, humidity=80.0)
    assert days_at_14c < days_at_4c
    assert days_at_14c == 4

    # 24°C is 20°C hotter -> shelf life should quarter (~1.75 -> round to 2)
    days_at_24c = calculate_shelf_life_days("Dairy", temp=24.0, humidity=80.0)
    assert days_at_24c < days_at_14c
    assert days_at_24c == 2


def test_dashboard_summary_consumer_scoping_and_staff_storewide():
    c_token = get_token_for_role("Consumer Dash", "consumer_dash@example.com", "consumer")
    w_token = get_token_for_role("Warehouse Dash", "warehouse_dash@example.com", "warehouse_operator")

    # Get consumer user id
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {c_token}"})
    assert me_res.status_code == 200
    consumer_id = me_res.json()["id"]

    # Staff creates 2 items via POST /inventory (one good, one near spoilage / alert)
    res1 = client.post(
        "/inventory",
        headers={"Authorization": f"Bearer {w_token}"},
        json={
            "name": "Warehouse Apples",
            "category": "Produce",
            "batch_id": "W-001",
            "quantity": 500.0,
            "unit": "kg",
            "freshness_score": 90.0,
            "freshness_status": "Fresh",
            "spoilage_risk": "Low"
        }
    )
    assert res1.status_code == 201

    res2 = client.post(
        "/inventory",
        headers={"Authorization": f"Bearer {w_token}"},
        json={
            "name": "Warehouse Expiring Milk",
            "category": "Dairy",
            "batch_id": "W-002",
            "quantity": 50.0,
            "unit": "liters",
            "freshness_score": 40.0,
            "freshness_status": "Near Spoilage",
            "spoilage_risk": "High"
        }
    )
    assert res2.status_code == 201

    # Insert 1 personal item for the consumer
    db = SessionLocal()
    try:
        from app.models.food_item import FoodItem
        consumer_item = FoodItem(
            name="Personal Yogurt",
            category="Dairy",
            batch_id="P-001",
            quantity=2.0,
            unit="items",
            freshness_score=98.0,
            freshness_status="Fresh",
            spoilage_risk="Low",
            storage_temperature=4.0,
            humidity=80.0,
            estimated_expiry_days=14,
            user_id=consumer_id,
            is_sample_data=False
        )
        db.add(consumer_item)
        db.commit()
    finally:
        db.close()

    # 1. Consumer GET /dashboard/summary -> Scoped to personal items
    res_c = client.get("/dashboard/summary", headers={"Authorization": f"Bearer {c_token}"})
    assert res_c.status_code == 200
    data_c = res_c.json()
    assert data_c["total_inventory_count"] == 1
    assert data_c["avg_freshness_score"] == 98.0
    assert data_c["active_alerts_count"] == 0
    assert len(data_c["recent_items"]) == 1
    assert data_c["recent_items"][0]["batch_id"] == "P-001"
    assert len(data_c["priority_alerts"]) == 0

    # 2. Staff GET /dashboard/summary -> Store-wide view across all 3 items
    res_w = client.get("/dashboard/summary", headers={"Authorization": f"Bearer {w_token}"})
    assert res_w.status_code == 200
    data_w = res_w.json()
    assert data_w["total_inventory_count"] == 3
    # Average score across 90, 40, 98 = 228 / 3 = 76.0
    assert data_w["avg_freshness_score"] == 76.0
    # Warehouse Expiring Milk triggers 1 alert
    assert data_w["active_alerts_count"] == 1
    assert len(data_w["priority_alerts"]) == 1
    assert data_w["priority_alerts"][0]["batch_id"] == "W-002"
    assert len(data_w["recent_items"]) == 3


def test_reports_data_and_summary_consumer_scoping():
    c_token = get_token_for_role("Consumer Rep", "consumer_rep@example.com", "consumer")
    w_token = get_token_for_role("Warehouse Rep", "warehouse_rep@example.com", "warehouse_operator")
    q_token = get_token_for_role("Inspector Rep", "inspector_rep@example.com", "food_quality_inspector")

    # Get consumer user id
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {c_token}"})
    assert me_res.status_code == 200
    consumer_id = me_res.json()["id"]

    # Staff creates 2 items via POST /inventory
    res1 = client.post(
        "/inventory",
        headers={"Authorization": f"Bearer {w_token}"},
        json={
            "name": "Staff Apples",
            "category": "Produce",
            "batch_id": "STF-001",
            "quantity": 100.0,
            "unit": "kg",
            "freshness_score": 90.0
        }
    )
    assert res1.status_code == 201

    res2 = client.post(
        "/inventory",
        headers={"Authorization": f"Bearer {w_token}"},
        json={
            "name": "Staff Bananas",
            "category": "Produce",
            "batch_id": "STF-002",
            "quantity": 200.0,
            "unit": "kg",
            "freshness_score": 60.0
        }
    )
    assert res2.status_code == 201

    # Insert 1 item belonging specifically to the consumer (e.g. from personal scan)
    db = SessionLocal()
    try:
        from app.models.food_item import FoodItem
        consumer_item = FoodItem(
            name="Consumer Avocado",
            category="Produce",
            batch_id="CNS-001",
            quantity=2.0,
            unit="kg",
            freshness_score=95.0,
            freshness_status="Fresh",
            spoilage_risk="Low",
            storage_temperature=4.0,
            humidity=80.0,
            estimated_expiry_days=10,
            user_id=consumer_id,
            is_sample_data=False
        )
        db.add(consumer_item)
        db.commit()
    finally:
        db.close()

    # 1. Consumer GET /reports/summary -> 200 OK, only sees their 1 item
    c_sum = client.get("/reports/summary", headers={"Authorization": f"Bearer {c_token}"})
    assert c_sum.status_code == 200
    c_sum_data = c_sum.json()
    assert c_sum_data["items_tracked_total"] == 1
    assert c_sum_data["avg_freshness_score"] == 95.0
    assert c_sum_data["alerts_triggered_count"] == 0

    # 2. Consumer GET /reports/data -> 200 OK, only sees their 1 item
    c_data = client.get("/reports/data", headers={"Authorization": f"Bearer {c_token}"})
    assert c_data.status_code == 200
    c_records = c_data.json()
    assert c_records["total"] == 1
    assert len(c_records["items"]) == 1
    assert c_records["items"][0]["batch_id"] == "CNS-001"
    assert c_records["items"][0]["name"] == "Consumer Avocado"

    # 3. Staff (Warehouse Operator) GET /reports/summary -> 200 OK, sees all 3 items store-wide
    w_sum = client.get("/reports/summary", headers={"Authorization": f"Bearer {w_token}"})
    assert w_sum.status_code == 200
    w_sum_data = w_sum.json()
    assert w_sum_data["items_tracked_total"] == 3

    # 4. Staff (Quality Inspector) GET /reports/data -> 200 OK, sees all 3 items store-wide
    q_data = client.get("/reports/data", headers={"Authorization": f"Bearer {q_token}"})
    assert q_data.status_code == 200
    q_records = q_data.json()
    assert q_records["total"] == 3
    assert len(q_records["items"]) == 3


def test_inventory_mutations_remain_restricted():
    c_token = get_token_for_role("Consumer Mut", "consumer_mut@example.com", "consumer")
    post_res = client.post(
        "/inventory",
        headers={"Authorization": f"Bearer {c_token}"},
        json={
            "name": "Forbidden Item",
            "category": "Produce",
            "batch_id": "FORB-001",
            "quantity": 1.0,
            "unit": "kg"
        }
    )
    assert post_res.status_code == 403
