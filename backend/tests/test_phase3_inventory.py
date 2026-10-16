import os
import pytest
import app.models
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, SessionLocal, engine, get_db

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


def test_management_roles_can_create_edit_delete_common_inventory():
    """Verify retail_manager, warehouse_operator, and admin can all create, edit, and delete common inventory."""
    roles = [
        ("Retail Manager", "rm_crud@example.com", "retail_manager"),
        ("Warehouse Operator", "wo_crud@example.com", "warehouse_operator"),
        ("Admin User", "adm_crud@example.com", "admin")
    ]

    for name, email, role in roles:
        token = get_token_for_role(name, email, role)
        
        # 1. Create common inventory item
        create_res = client.post(
            "/inventory",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": f"Item by {role}",
                "category": "Produce",
                "batch_id": f"LOT-{role[:3].upper()}-01",
                "quantity": 25.0,
                "unit": "kg",
                "freshness_status": "Fresh"
            }
        )
        assert create_res.status_code == 201, f"{role} should be able to create common inventory"
        item_id = create_res.json()["id"]
        assert create_res.json()["is_personal"] is False

        # 2. Edit common inventory item
        edit_res = client.put(
            f"/inventory/{item_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": f"Updated by {role}",
                "quantity": 30.0
            }
        )
        assert edit_res.status_code == 200, f"{role} should be able to edit common inventory"
        assert edit_res.json()["name"] == f"Updated by {role}"
        assert edit_res.json()["quantity"] == 30.0

        # 3. Delete common inventory item
        del_res = client.delete(
            f"/inventory/{item_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert del_res.status_code == 200, f"{role} should be able to delete common inventory"

        # Verify it's gone
        get_res = client.get(f"/inventory/{item_id}", headers={"Authorization": f"Bearer {token}"})
        assert get_res.status_code == 404


def test_food_quality_inspector_cannot_create_edit_or_delete():
    """Verify food_quality_inspector is strictly read-only and receives 403 on mutations."""
    insp_token = get_token_for_role("Diana Inspector", "inspector_crud@example.com", "food_quality_inspector")
    admin_token = get_token_for_role("Admin Creator", "admin_for_insp@example.com", "admin")

    # 1. Inspector attempts POST /inventory -> 403 Forbidden
    post_res = client.post(
        "/inventory",
        headers={"Authorization": f"Bearer {insp_token}"},
        json={
            "name": "Inspector Item",
            "category": "Produce",
            "batch_id": "LOT-INSP-01",
            "quantity": 10.0,
            "unit": "kg"
        }
    )
    assert post_res.status_code == 403

    # Admin creates common item
    common_res = client.post(
        "/inventory",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Admin Common Food",
            "category": "Produce",
            "batch_id": "LOT-ADM-99",
            "quantity": 50.0,
            "unit": "kg"
        }
    )
    assert common_res.status_code == 201
    item_id = common_res.json()["id"]

    # 2. Inspector attempts PUT /inventory/{id} -> 403 Forbidden
    put_res = client.put(
        f"/inventory/{item_id}",
        headers={"Authorization": f"Bearer {insp_token}"},
        json={"name": "Hacked Name"}
    )
    assert put_res.status_code == 403

    # 3. Inspector attempts DELETE /inventory/{id} -> 403 Forbidden
    del_res = client.delete(
        f"/inventory/{item_id}",
        headers={"Authorization": f"Bearer {insp_token}"}
    )
    assert del_res.status_code == 403

    # 4. Inspector CAN view common inventory -> 200 OK
    get_res = client.get(f"/inventory/{item_id}", headers={"Authorization": f"Bearer {insp_token}"})
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Admin Common Food"

    list_res = client.get("/inventory", headers={"Authorization": f"Bearer {insp_token}"})
    assert list_res.status_code == 200
    names = [it["name"] for it in list_res.json()["items"]]
    assert "Admin Common Food" in names


def test_management_and_inspector_cannot_see_or_modify_consumer_inventory():
    """Verify consumer-created items are completely hidden and protected from management and inspector roles."""
    consumer_token = get_token_for_role("Alice Personal", "alice_private@example.com", "consumer")
    other_consumer_token = get_token_for_role("Bob Consumer", "bob_private@example.com", "consumer")
    rm_token = get_token_for_role("Retail Mgr", "rm_private@example.com", "retail_manager")
    wo_token = get_token_for_role("Warehouse Op", "wo_private@example.com", "warehouse_operator")
    adm_token = get_token_for_role("Admin Private", "adm_private@example.com", "admin")
    insp_token = get_token_for_role("Inspector Private", "insp_private@example.com", "food_quality_inspector")

    # Consumer creates personal food item in /inventory/storage
    personal_res = client.post(
        "/inventory/storage",
        headers={"Authorization": f"Bearer {consumer_token}"},
        json={
            "name": "Secret Consumer Berries",
            "category": "Berries",
            "batch_id": "LOT-PRIV-01",
            "quantity": 2.0,
            "unit": "kg"
        }
    )
    assert personal_res.status_code == 201
    personal_item_id = personal_res.json()["id"]
    assert personal_res.json()["is_personal"] is True

    # Retail manager, warehouse operator, admin, inspector cannot see it in GET /inventory
    for token, role_name in [
        (rm_token, "retail_manager"),
        (wo_token, "warehouse_operator"),
        (adm_token, "admin"),
        (insp_token, "food_quality_inspector")
    ]:
        # Default scope
        res_default = client.get("/inventory", headers={"Authorization": f"Bearer {token}"})
        assert res_default.status_code == 200
        names = [it["name"] for it in res_default.json()["items"]]
        assert "Secret Consumer Berries" not in names, f"{role_name} saw consumer item in GET /inventory"

        # Scope = 'all'
        res_all = client.get("/inventory?scope=all", headers={"Authorization": f"Bearer {token}"})
        assert res_all.status_code == 200
        names_all = [it["name"] for it in res_all.json()["items"]]
        assert "Secret Consumer Berries" not in names_all, f"{role_name} saw consumer item in GET /inventory?scope=all"

        # Scope = 'personal'
        res_pers = client.get("/inventory?scope=personal", headers={"Authorization": f"Bearer {token}"})
        assert res_pers.status_code == 200
        names_pers = [it["name"] for it in res_pers.json()["items"]]
        assert "Secret Consumer Berries" not in names_pers, f"{role_name} saw consumer item in GET /inventory?scope=personal"

        # Direct GET /inventory/{id} -> 404 Not Found
        res_direct = client.get(f"/inventory/{personal_item_id}", headers={"Authorization": f"Bearer {token}"})
        assert res_direct.status_code == 404, f"{role_name} accessed consumer item via GET /inventory/{{id}}"

    # Other consumer also cannot view Alice's personal item
    other_direct = client.get(f"/inventory/{personal_item_id}", headers={"Authorization": f"Bearer {other_consumer_token}"})
    assert other_direct.status_code == 404

    # Alice CAN view her own item
    alice_direct = client.get(f"/inventory/{personal_item_id}", headers={"Authorization": f"Bearer {consumer_token}"})
    assert alice_direct.status_code == 200
    assert alice_direct.json()["name"] == "Secret Consumer Berries"

    # Management roles try PUT /inventory/{id} on consumer item -> 404 Not Found
    for token, role_name in [(rm_token, "retail_manager"), (wo_token, "warehouse_operator"), (adm_token, "admin")]:
        put_res = client.put(
            f"/inventory/{personal_item_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "Tampered Name"}
        )
        assert put_res.status_code == 404, f"{role_name} was able to mutate consumer item"

    # Management roles try DELETE /inventory/{id} on consumer item -> 404 Not Found
    for token, role_name in [(rm_token, "retail_manager"), (wo_token, "warehouse_operator"), (adm_token, "admin")]:
        del_res = client.delete(
            f"/inventory/{personal_item_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert del_res.status_code == 404, f"{role_name} was able to delete consumer item"


def test_warehouse_manager_and_retail_manager_storage_isolation_and_inventory_add():
    """
    Specifically tests:
    1. Warehouse Manager alias ('warehouse_manager') registers and authenticates properly.
    2. Warehouse Manager and Retail Manager can successfully add scanned items to inventory (POST /inventory).
    3. Neither Warehouse Manager nor Retail Manager can access consumer storage (GET /inventory/storage returns 403).
    4. Neither can post to consumer personal storage (POST /inventory/storage returns 403).
    """
    wm_token = get_token_for_role("Chief Warehouse Mgr", "wm_test@example.com", "warehouse_manager")
    rm_token = get_token_for_role("Chief Retail Mgr", "rm_test@example.com", "retail_manager")

    for token, role_title in [(wm_token, "Warehouse Manager"), (rm_token, "Retail Manager")]:
        # 1. Can add scanned item to inventory
        scan_payload = {
            "name": f"Scanned Item from {role_title}",
            "category": "Produce",
            "batch_id": f"SCAN-{role_title[:2].upper()}-001",
            "quantity": 15.0,
            "unit": "items",
            "freshness_score": 92.0,
            "freshness_status": "Fresh",
            "spoilage_risk": "Low",
            "storage_temperature": 4.0,
            "humidity": 85.0
        }
        add_res = client.post("/inventory", headers={"Authorization": f"Bearer {token}"}, json=scan_payload)
        assert add_res.status_code == 201, f"{role_title} should be able to add to inventory"
        item_data = add_res.json()
        assert item_data["is_personal"] is False
        assert item_data["name"] == f"Scanned Item from {role_title}"

        # 2. Cannot access consumer storage GET /inventory/storage -> 403 Forbidden
        storage_get = client.get("/inventory/storage", headers={"Authorization": f"Bearer {token}"})
        assert storage_get.status_code == 403, f"{role_title} must not have access to consumer storage"

        # 3. Cannot add directly to consumer storage POST /inventory/storage -> 403 Forbidden
        storage_post = client.post("/inventory/storage", headers={"Authorization": f"Bearer {token}"}, json=scan_payload)
        assert storage_post.status_code == 403, f"{role_title} must not be able to post to consumer storage"


