import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, get_db
from app.services.shelflife_service import calculate_shelf_life_days, get_baseline_shelf_life
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup dedicated file-based test DB
TEST_DATABASE_URL = "sqlite:///./test_phase6.db"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db_phase6():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_and_cleanup_db():
    app.dependency_overrides[get_db] = override_get_db_phase6
    Base.metadata.create_all(bind=test_engine)
    yield
    db = TestingSessionLocal()
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


def test_dashboard_summary_open_to_all_roles():
    c_token = get_token_for_role("Consumer Dash", "consumer_dash@example.com", "consumer")
    q_token = get_token_for_role("Inspector Dash", "inspector_dash@example.com", "food_quality_inspector")

    # Consumer can access GET /dashboard/summary
    res_c = client.get("/dashboard/summary", headers={"Authorization": f"Bearer {c_token}"})
    assert res_c.status_code == 200
    data_c = res_c.json()
    assert "total_inventory_count" in data_c
    assert "storage_conditions" in data_c

    # Quality Inspector can access GET /dashboard/summary
    res_q = client.get("/dashboard/summary", headers={"Authorization": f"Bearer {q_token}"})
    assert res_q.status_code == 200


def test_reports_rbac_restriction():
    c_token = get_token_for_role("Consumer Rep", "consumer_rep@example.com", "consumer")
    w_token = get_token_for_role("Warehouse Rep", "warehouse_rep@example.com", "warehouse_operator")
    q_token = get_token_for_role("Inspector Rep", "inspector_rep@example.com", "food_quality_inspector")

    # Consumer GET /reports/summary -> 403 Forbidden
    res_c_sum = client.get("/reports/summary", headers={"Authorization": f"Bearer {c_token}"})
    assert res_c_sum.status_code == 403

    # Consumer GET /reports/data -> 403 Forbidden
    res_c_data = client.get("/reports/data", headers={"Authorization": f"Bearer {c_token}"})
    assert res_c_data.status_code == 403

    # Warehouse Operator GET /reports/summary -> 200 OK
    res_w_sum = client.get("/reports/summary", headers={"Authorization": f"Bearer {w_token}"})
    assert res_w_sum.status_code == 200
    assert "items_tracked_total" in res_w_sum.json()

    # Inspector GET /reports/data -> 200 OK
    res_q_data = client.get("/reports/data", headers={"Authorization": f"Bearer {q_token}"})
    assert res_q_data.status_code == 200
    assert "items" in res_q_data.json()
