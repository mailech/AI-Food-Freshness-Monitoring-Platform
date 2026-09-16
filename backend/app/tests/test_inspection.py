import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.modules.user.models import User, UserRole
from app.modules.inspection.models import QualityInspection, InspectionStatus

@pytest.mark.asyncio
async def test_quality_inspector_workflow_and_rbac(client: AsyncClient, db_session: AsyncSession):
    # 1. Register and Login a Food Quality Inspector
    resp_reg_insp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "qa_inspector@freshlens.com",
            "password": "Password123!",
            "full_name": "Quality Inspector Bob",
            "role": "QUALITY_INSPECTOR"
        }
    )
    assert resp_reg_insp.status_code == 201

    resp_login_insp = await client.post(
        "/api/v1/auth/token",
        data={"username": "qa_inspector@freshlens.com", "password": "Password123!"}
    )
    assert resp_login_insp.status_code == 200
    insp_token = resp_login_insp.json()["access_token"]
    insp_headers = {"Authorization": f"Bearer {insp_token}"}

    # 2. Register and Login a Consumer (unauthorized role)
    resp_reg_cons = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "consumer_test@freshlens.com",
            "password": "Password123!",
            "full_name": "Consumer Alice",
            "role": "CONSUMER"
        }
    )
    assert resp_reg_cons.status_code == 201

    resp_login_cons = await client.post(
        "/api/v1/auth/token",
        data={"username": "consumer_test@freshlens.com", "password": "Password123!"}
    )
    assert resp_login_cons.status_code == 200
    cons_token = resp_login_cons.json()["access_token"]
    cons_headers = {"Authorization": f"Bearer {cons_token}"}

    # 3. Test RBAC: Consumer should be BLOCKED (403 Forbidden) from accessing Inspector Dashboard
    resp_cons_dash = await client.get("/api/v1/inspection/dashboard", headers=cons_headers)
    assert resp_cons_dash.status_code == 403

    # 4. Test Authorized Access: Inspector retrieves dashboard summary
    resp_insp_dash = await client.get("/api/v1/inspection/dashboard", headers=insp_headers)
    assert resp_insp_dash.status_code == 200
    dash_data = resp_insp_dash.json()
    assert "total_inspections" in dash_data

    # 5. Inspector executes a Quality Inspection Audit
    inspection_payload = {
        "product_name": "Organic Strawberries",
        "category": "Fruits",
        "packaging_type": "Modified Atmosphere Packaging (MAP)",
        "storage_location": "Cold Room B",
        "storage_temperature": "3.5",
        "humidity": "88",
        "air_circulation": "Medium",
        "light_exposure": "Low",
        "storage_duration_days": "1.5",
        "status_in": "PASSED",
        "remarks": "Specimen is fresh with intact surface integrity.",
        "action_taken": "APPROVED FOR RETAIL"
    }

    resp_create = await client.post(
        "/api/v1/inspection/",
        data=inspection_payload,
        headers=insp_headers
    )
    assert resp_create.status_code == 201
    created_data = resp_create.json()
    assert created_data["product_name"] == "Organic Strawberries"
    assert created_data["status"] == "PASSED"
    assert created_data["quality_classification"] in ("Fresh", "Good", "Acceptable", "Near Spoilage", "Spoiled")
    assert created_data["freshness_score"] > 0.0

    inspection_id = created_data["id"]

    # 6. Retrieve Inspection Details by ID
    resp_detail = await client.get(f"/api/v1/inspection/{inspection_id}", headers=insp_headers)
    assert resp_detail.status_code == 200
    detail_data = resp_detail.json()
    assert detail_data["id"] == inspection_id

    # 7. Update Inspection Status to QUARANTINED
    resp_patch = await client.patch(
        f"/api/v1/inspection/{inspection_id}",
        json={
            "status": "QUARANTINED",
            "remarks": "Re-inspected: Mold detected on container base.",
            "action_taken": "QUARANTINED FOR MOLD DISPOSAL"
        },
        headers=insp_headers
    )
    assert resp_patch.status_code == 200
    updated_data = resp_patch.json()
    assert updated_data["status"] == "QUARANTINED"
    assert updated_data["action_taken"] == "QUARANTINED FOR MOLD DISPOSAL"

    # 8. List Inspections with Status Filter
    resp_list = await client.get("/api/v1/inspection/list?status_filter=QUARANTINED", headers=insp_headers)
    assert resp_list.status_code == 200
    list_items = resp_list.json()
    assert len(list_items) >= 1
    assert any(i["id"] == inspection_id for i in list_items)
