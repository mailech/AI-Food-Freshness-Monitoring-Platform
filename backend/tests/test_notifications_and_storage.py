import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, SessionLocal, engine
from app.models.food_item import FoodItem
from app.models.notification import Notification
from app.models.user import UserRole

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_and_cleanup_db():
    from sqlalchemy import text
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        if conn.dialect.name == "postgresql":
            conn.execute(text("ALTER TABLE food_items ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT FALSE;"))
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


def test_batch_id_search():
    """Item 4: Extend inventory search to match against batch_id as well as item name."""
    admin_token = get_token_for_role("Admin Search", "admin_batch@example.com", "admin")
    
    client.post(
        "/inventory",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Honeycrisp Apples",
            "category": "Produce",
            "batch_id": "LOT-HC-992",
            "quantity": 50.0,
            "unit": "kg"
        }
    )
    client.post(
        "/inventory",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Navel Oranges",
            "category": "Citrus Fruits",
            "batch_id": "LOT-NV-404",
            "quantity": 30.0,
            "unit": "kg"
        }
    )

    # Search by exact batch_id
    res_exact = client.get("/inventory?search=LOT-HC-992", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_exact.status_code == 200
    assert res_exact.json()["total"] == 1
    assert res_exact.json()["items"][0]["name"] == "Honeycrisp Apples"

    # Search by partial batch_id lowercase
    res_partial = client.get("/inventory?search=nv-404", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_partial.status_code == 200
    assert res_partial.json()["total"] == 1
    assert res_partial.json()["items"][0]["name"] == "Navel Oranges"


def test_personal_storage_flow_and_isolation():
    """Item 5: Customer scans and adds to personal storage; user isolation guaranteed."""
    c1_token = get_token_for_role("Alice Consumer", "alice@example.com", "consumer")
    c2_token = get_token_for_role("Bob Consumer", "bob@example.com", "consumer")
    admin_token = get_token_for_role("Staff Operator", "staff@example.com", "warehouse_operator")

    # Staff adds a shared item
    shared_res = client.post(
        "/inventory",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Shared Bananas",
            "category": "Produce",
            "batch_id": "SHR-001",
            "quantity": 100.0,
            "unit": "kg",
            "freshness_score": 92.0,
            "freshness_status": "Fresh"
        }
    )
    assert shared_res.status_code == 201

    # Alice adds a personal item to My Storage
    alice_add_res = client.post(
        "/inventory/storage",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={
            "name": "Alice's Organic Spinach",
            "category": "Leafy Greens",
            "batch_id": "MY-SPIN-01",
            "quantity": 1.5,
            "unit": "kg",
            "storage_temperature": 4.0,
            "humidity": 85.0,
            "freshness_score": 88.0,
            "freshness_status": "Fresh"
        }
    )
    assert alice_add_res.status_code == 201
    alice_item_id = alice_add_res.json()["id"]
    assert alice_add_res.json()["is_personal"] is True

    # Alice views her storage
    alice_storage = client.get("/inventory/storage", headers={"Authorization": f"Bearer {c1_token}"})
    assert alice_storage.status_code == 200
    assert alice_storage.json()["total"] == 1
    assert alice_storage.json()["items"][0]["name"] == "Alice's Organic Spinach"

    # Bob views his storage -> Must be 0 (cannot see Alice's personal food!)
    bob_storage = client.get("/inventory/storage", headers={"Authorization": f"Bearer {c2_token}"})
    assert bob_storage.status_code == 200
    assert bob_storage.json()["total"] == 0

    # Shared inventory list (/inventory) -> Alice's personal food must NOT leak into shared catalog
    shared_list = client.get("/inventory", headers={"Authorization": f"Bearer {c2_token}"})
    assert shared_list.status_code == 200
    item_names = [it["name"] for it in shared_list.json()["items"]]
    assert "Shared Bananas" in item_names
    assert "Alice's Organic Spinach" not in item_names

    # Alice deletes her item from personal storage
    del_res = client.delete(f"/inventory/storage/{alice_item_id}", headers={"Authorization": f"Bearer {c1_token}"})
    assert del_res.status_code == 200
    alice_storage_after = client.get("/inventory/storage", headers={"Authorization": f"Bearer {c1_token}"})
    assert alice_storage_after.json()["total"] == 0


def test_in_app_notifications():
    """Item 5: In-app notifications covering personal storage freshness/expiry & shared inventory."""
    c1_token = get_token_for_role("Charlie Consumer", "charlie@example.com", "consumer")
    c2_token = get_token_for_role("Dana Consumer", "dana@example.com", "consumer")
    admin_token = get_token_for_role("Elena Staff", "elena@example.com", "retail_manager")

    # Staff adds a high-freshness shared item (freshness >= 85)
    client.post(
        "/inventory",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Fresh Organic Strawberries",
            "category": "Berries",
            "batch_id": "BER-SHR-77",
            "quantity": 25.0,
            "unit": "kg",
            "freshness_score": 96.0,
            "freshness_status": "Fresh"
        }
    )

    # Staff adds an expiring/high-risk item in general shared inventory
    client.post(
        "/inventory",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Expiring Shared Peaches",
            "category": "Produce",
            "batch_id": "PCH-SHR-09",
            "quantity": 15.0,
            "unit": "kg",
            "freshness_score": 45.0,
            "freshness_status": "Near Spoilage",
            "spoilage_risk": "High"
        }
    )

    # Charlie adds an item approaching expiry to his personal storage
    client.post(
        "/inventory/storage",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={
            "name": "Ripe Avocados",
            "category": "Produce",
            "batch_id": "AVO-PERS-01",
            "quantity": 3.0,
            "unit": "items",
            "storage_temperature": 18.0,  # High temp triggers expiry & temp alert
            "humidity": 70.0,
            "freshness_score": 50.0,
            "freshness_status": "Near Spoilage",
            "spoilage_risk": "High",
            "estimated_expiry_days": 1
        }
    )

    # Charlie adds a fresh item to his personal storage (should receive freshness status update)
    client.post(
        "/inventory/storage",
        headers={"Authorization": f"Bearer {c1_token}"},
        json={
            "name": "Charlie's Crisp Apples",
            "category": "Produce",
            "batch_id": "APP-PERS-99",
            "quantity": 2.0,
            "unit": "kg",
            "storage_temperature": 4.0,
            "humidity": 85.0,
            "freshness_score": 92.0,
            "freshness_status": "Fresh"
        }
    )

    # Charlie gets notifications
    c1_notifs = client.get("/notifications", headers={"Authorization": f"Bearer {c1_token}"})
    assert c1_notifs.status_code == 200
    items1 = c1_notifs.json()["items"]
    titles1 = [n["title"] for n in items1]
    
    # Charlie (Customer) must have:
    # 1. Personal storage Near Spoilage alert for Ripe Avocados
    assert any("Near Spoilage: Ripe Avocados" in t for t in titles1)
    # 2. Shared inventory Near Spoilage alert for Expiring Shared Peaches
    assert any("Near Spoilage: Expiring Shared Peaches" in t for t in titles1)
    # 3. MUST NOT receive non-spoilage notifications for fresh items
    assert not any("Charlie's Crisp Apples" in t for t in titles1)
    assert not any("Fresh Organic Strawberries" in t for t in titles1)

    # Dana (Customer 2) gets notifications
    c2_notifs = client.get("/notifications", headers={"Authorization": f"Bearer {c2_token}"})
    assert c2_notifs.status_code == 200
    items2 = c2_notifs.json()["items"]
    titles2 = [n["title"] for n in items2]

    # Dana must NOT have Charlie's personal storage spoilage alert! (Customer isolation)
    assert not any("Ripe Avocados" in t for t in titles2)
    assert not any("Charlie's Crisp Apples" in t for t in titles2)
    # But Dana DOES receive shared inventory Near Spoilage alert:
    assert any("Near Spoilage: Expiring Shared Peaches" in t for t in titles2)
    assert not any("Fresh Organic Strawberries" in t for t in titles2)

    # Elena (Staff: retail_manager) gets notifications
    staff_notifs = client.get("/notifications", headers={"Authorization": f"Bearer {admin_token}"})
    assert staff_notifs.status_code == 200
    staff_items = staff_notifs.json()["items"]
    staff_titles = [n["title"] for n in staff_items]

    # Staff role notifications are based strictly on inventory:
    assert any("Near Spoilage: Expiring Shared Peaches" in t for t in staff_titles)
    assert not any("Ripe Avocados" in t for t in staff_titles)
    assert all(n["scope"] == "shared" for n in staff_items)

    # Test read / mark-all-read
    unread_res = client.get("/notifications/unread-count", headers={"Authorization": f"Bearer {c1_token}"})
    assert unread_res.status_code == 200
    assert unread_res.json()["unread_count"] > 0

    first_notif_id = items1[0]["id"]
    read_res = client.put(f"/notifications/{first_notif_id}/read", headers={"Authorization": f"Bearer {c1_token}"})
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True

    mark_all_res = client.post("/notifications/mark-all-read", headers={"Authorization": f"Bearer {c1_token}"})
    assert mark_all_res.status_code == 200

    unread_after = client.get("/notifications/unread-count", headers={"Authorization": f"Bearer {c1_token}"})
    assert unread_after.json()["unread_count"] == 0


def test_storage_restricted_to_consumer_only():
    """Verify that personal storage endpoints (POST, GET, DELETE) are strictly restricted to consumer accounts."""
    retail_token = get_token_for_role("Retail User", "retail_test@example.com", "retail_manager")
    warehouse_token = get_token_for_role("Warehouse User", "warehouse_test@example.com", "warehouse_operator")
    admin_token = get_token_for_role("Admin User", "admin_test@example.com", "admin")
    consumer_token = get_token_for_role("Consumer User", "consumer_test@example.com", "consumer")

    payload = {
        "name": "Consumer Strawberries",
        "category": "Berries",
        "batch_id": "BER-CON-01",
        "quantity": 1.0,
        "unit": "box",
        "storage_temperature": 4.0,
        "humidity": 85.0,
        "freshness_score": 90.0,
        "freshness_status": "Fresh"
    }

    # 1. Non-consumer roles should receive 403 Forbidden on POST /inventory/storage
    retail_post = client.post("/inventory/storage", headers={"Authorization": f"Bearer {retail_token}"}, json=payload)
    assert retail_post.status_code == 403, f"Expected 403 for retail_manager, got {retail_post.status_code}"

    warehouse_post = client.post("/inventory/storage", headers={"Authorization": f"Bearer {warehouse_token}"}, json=payload)
    assert warehouse_post.status_code == 403, f"Expected 403 for warehouse_operator, got {warehouse_post.status_code}"

    admin_post = client.post("/inventory/storage", headers={"Authorization": f"Bearer {admin_token}"}, json=payload)
    assert admin_post.status_code == 403, f"Expected 403 for admin, got {admin_post.status_code}"

    # 2. Consumer role should succeed with 201 Created
    consumer_post = client.post("/inventory/storage", headers={"Authorization": f"Bearer {consumer_token}"}, json=payload)
    assert consumer_post.status_code == 201, f"Expected 201 for consumer, got {consumer_post.status_code}"
    created_id = consumer_post.json()["id"]

    # 3. Non-consumer roles should receive 403 on GET /inventory/storage
    retail_get = client.get("/inventory/storage", headers={"Authorization": f"Bearer {retail_token}"})
    assert retail_get.status_code == 403

    # 4. Consumer role should receive 200 on GET /inventory/storage
    consumer_get = client.get("/inventory/storage", headers={"Authorization": f"Bearer {consumer_token}"})
    assert consumer_get.status_code == 200
    assert consumer_get.json()["total"] >= 1

    # Clean up
    del_res = client.delete(f"/inventory/storage/{created_id}", headers={"Authorization": f"Bearer {consumer_token}"})
    assert del_res.status_code == 200

