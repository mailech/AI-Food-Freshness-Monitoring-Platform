import os
import pytest
import app.models
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup dedicated file-based test DB
TEST_DATABASE_URL = "sqlite:///./test_phase3.db"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db_phase3():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_and_cleanup_db():
    app.dependency_overrides[get_db] = override_get_db_phase3
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


def test_inventory_rbac_get_open_to_all():
    c_token = get_token_for_role("Consumer User", "consumer_inv@example.com", "consumer")

    list_res = client.get(
        "/inventory",
        headers={"Authorization": f"Bearer {c_token}"}
    )
    assert list_res.status_code == 200
    assert "items" in list_res.json()

    a_token = get_token_for_role("Admin User", "admin_inv@example.com", "admin")
    item_res = client.post(
        "/inventory",
        headers={"Authorization": f"Bearer {a_token}"},
        json={
            "name": "Test Apples",
            "category": "Produce",
            "batch_id": "APL-001",
            "quantity": 500.0,
            "unit": "kg"
        }
    )
    assert item_res.status_code == 201
    item_id = item_res.json()["id"]

    get_res = client.get(
        f"/inventory/{item_id}",
        headers={"Authorization": f"Bearer {c_token}"}
    )
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Test Apples"


def test_inventory_rbac_mutations_restricted():
    c_token = get_token_for_role("Consumer User 2", "consumer2_inv@example.com", "consumer")
    w_token = get_token_for_role("Warehouse User", "warehouse_inv@example.com", "warehouse_operator")
    r_token = get_token_for_role("Retail User", "retail_inv@example.com", "retail_manager")
    a_token = get_token_for_role("Admin User 2", "admin2_inv@example.com", "admin")

    payload = {
        "name": "Test Berries",
        "category": "Berries",
        "batch_id": "BER-999",
        "quantity": 100.0,
        "unit": "kg"
    }

    # Consumer tries POST -> 403 Forbidden
    post_c = client.post("/inventory", headers={"Authorization": f"Bearer {c_token}"}, json=payload)
    assert post_c.status_code == 403

    # Warehouse Operator tries POST -> 201 Created
    post_w = client.post("/inventory", headers={"Authorization": f"Bearer {w_token}"}, json=payload)
    assert post_w.status_code == 201
    item_id = post_w.json()["id"]

    # Consumer tries PUT -> 403 Forbidden
    put_c = client.put(f"/inventory/{item_id}", headers={"Authorization": f"Bearer {c_token}"}, json={"name": "Updated Berries"})
    assert put_c.status_code == 403

    # Retail Manager tries PUT -> 200 OK
    put_r = client.put(f"/inventory/{item_id}", headers={"Authorization": f"Bearer {r_token}"}, json={"name": "Updated Berries"})
    assert put_r.status_code == 200
    assert put_r.json()["name"] == "Updated Berries"

    # Consumer tries DELETE -> 403 Forbidden
    del_c = client.delete(f"/inventory/{item_id}", headers={"Authorization": f"Bearer {c_token}"})
    assert del_c.status_code == 403

    # Admin tries DELETE -> 200 OK
    del_a = client.delete(f"/inventory/{item_id}", headers={"Authorization": f"Bearer {a_token}"})
    assert del_a.status_code == 200


def test_inventory_filtering_and_search():
    a_token = get_token_for_role("Admin Search", "admin_search@example.com", "admin")

    client.post("/inventory", headers={"Authorization": f"Bearer {a_token}"}, json={"name": "Fresh Milk", "category": "Dairy", "batch_id": "MLK-100", "freshness_status": "Fresh"})
    client.post("/inventory", headers={"Authorization": f"Bearer {a_token}"}, json={"name": "Cheddar Cheese", "category": "Dairy", "batch_id": "CHS-200", "freshness_status": "Good"})
    client.post("/inventory", headers={"Authorization": f"Bearer {a_token}"}, json={"name": "Organic Kale", "category": "Produce", "batch_id": "KLE-300", "freshness_status": "Fresh"})

    dairy_res = client.get("/inventory?category=Dairy", headers={"Authorization": f"Bearer {a_token}"})
    assert dairy_res.status_code == 200
    assert dairy_res.json()["total"] == 2

    fresh_res = client.get("/inventory?freshness_status=Fresh", headers={"Authorization": f"Bearer {a_token}"})
    assert fresh_res.status_code == 200
    assert fresh_res.json()["total"] == 2

    search_res = client.get("/inventory?search=KLE-300", headers={"Authorization": f"Bearer {a_token}"})
    assert search_res.status_code == 200
    assert search_res.json()["total"] == 1
    assert search_res.json()["items"][0]["name"] == "Organic Kale"


def test_user_id_server_side_derivation_and_shared_catalog():
    w_token = get_token_for_role("Warehouse User 3", "warehouse3@example.com", "warehouse_operator")
    c_token = get_token_for_role("Consumer User 3", "consumer3@example.com", "consumer")

    # Attempt to spoof user_id=999999 in payload
    payload = {
        "name": "Audit Item",
        "category": "Produce",
        "batch_id": "AUD-001",
        "quantity": 10.0,
        "unit": "kg",
        "user_id": 999999
    }

    create_res = client.post("/inventory", headers={"Authorization": f"Bearer {w_token}"}, json=payload)
    assert create_res.status_code == 201
    item_data = create_res.json()

    # Get current user ID of warehouse operator from /auth/me
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {w_token}"})
    w_user_id = me_res.json()["id"]

    # user_id must be w_user_id, NOT 999999
    assert item_data["user_id"] == w_user_id
    assert item_data["user_id"] != 999999

    # Consumer can read the item created by warehouse operator (shared catalog)
    consumer_list = client.get("/inventory", headers={"Authorization": f"Bearer {c_token}"})
    assert consumer_list.status_code == 200
    item_ids = [item["id"] for item in consumer_list.json()["items"]]
    assert item_data["id"] in item_ids

