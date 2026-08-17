import pytest
import pytest_asyncio
from httpx import AsyncClient
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.modules.system.models import SystemLog
from app.modules.image_analysis.models import ImageAnalysis
from app.modules.storage.models import StorageReading
from app.modules.notification.models import Notification, NotificationPreference
from app.modules.notification.schemas import NotificationCreate, PreferenceUpdate
from app.modules.notification.service import NotificationService

@pytest.mark.asyncio
async def test_notifications_crud_and_gating(client: AsyncClient):
    # Clear previous documents
    await Notification.find_all().delete()
    
    # 1. Create a notification for WAREHOUSE_OPERATOR
    n1 = await NotificationService.create_notification(NotificationCreate(
        role="WAREHOUSE_OPERATOR",
        title="Critical Temp Spill",
        message="Fridge Unit 3 temperature rose above threshold.",
        type="storage"
    ))
    
    # 2. Create a notification for RETAIL_MANAGER
    n2 = await NotificationService.create_notification(NotificationCreate(
        role="RETAIL_MANAGER",
        title="FEFO Overrun Action",
        message="Salmon batch shows kinetic decay rates.",
        type="shelf-life"
    ))

    # 3. Query as WAREHOUSE_OPERATOR role
    res_operator = await client.get("/api/v1/notification/?role=WAREHOUSE_OPERATOR")
    assert res_operator.status_code == 200
    data_op = res_operator.json()
    assert len(data_op) == 1
    assert data_op[0]["title"] == "Critical Temp Spill"
    assert data_op[0]["is_read"] is False

    # 4. Query as RETAIL_MANAGER role
    res_manager = await client.get("/api/v1/notification/?role=RETAIL_MANAGER")
    assert res_manager.status_code == 200
    data_mg = res_manager.json()
    assert len(data_mg) == 1
    assert data_mg[0]["title"] == "FEFO Overrun Action"

    # 5. Mark as read
    res_read = await client.patch(f"/api/v1/notification/{n1.id}/read")
    assert res_read.status_code == 200
    
    # Confirm it is read
    res_operator_read = await client.get("/api/v1/notification/?role=WAREHOUSE_OPERATOR&unread_only=true")
    assert res_operator_read.status_code == 200
    assert len(res_operator_read.json()) == 0

@pytest.mark.asyncio
async def test_notification_preferences(client: AsyncClient):
    await NotificationPreference.find_all().delete()
    
    user_id = "test-user-uuid"
    
    # 1. Get default preference (auto-creates)
    res_get = await client.get(f"/api/v1/notification/preference?user_id={user_id}")
    assert res_get.status_code == 200
    data = res_get.json()
    assert data["user_id"] == user_id
    assert data["email_enabled"] is True
    assert data["min_freshness_threshold"] == 50.0

    # 2. Update preferences
    update_data = PreferenceUpdate(
        email_enabled=False,
        min_freshness_threshold=70.0
    )
    res_put = await client.put(
        f"/api/v1/notification/preference?user_id={user_id}",
        json=update_data.dict(exclude_unset=True)
    )
    assert res_put.status_code == 200
    updated_data = res_put.json()
    assert updated_data["email_enabled"] is False
    assert updated_data["min_freshness_threshold"] == 70.0
