import os
import sys
import asyncio
from typing import AsyncGenerator, Generator

# 1. Set environment variables for testing before importing settings
os.environ["SECRET_KEY"] = "test_secret_key_for_testing_purposes_only_1234"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["MONGODB_URL"] = "mongodb://localhost:27017/test_db"
os.environ["MODEL_PATH"] = "ml/models/freshness_model.npz"

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

from app.main import app
from app.core.database import Base, get_db

# event_loop is managed by pytest-asyncio default settings

@pytest_asyncio.fixture(scope="session")
async def db_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    async_session = async_sessionmaker(
        bind=db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
        await session.rollback()

from datetime import datetime
from unittest.mock import MagicMock, AsyncMock, patch

@pytest_asyncio.fixture(autouse=True)
def mock_beanie_methods():
    # Bypass Beanie database checks completely for tests
    from app.modules.image_analysis.models import ImageAnalysis
    from app.modules.system.models import SystemLog
    from app.modules.storage.models import StorageReading
    from app.modules.notification.models import Notification, NotificationPreference
    
    mock_analyses = []
    mock_readings = []
    mock_notifications = []
    mock_preferences = []
    
    class MockFind:
        def __init__(self, item_id):
            self.item_id = item_id
            self._limit = None
        def sort(self, *args, **kwargs):
            return self
        def limit(self, count):
            self._limit = count
            return self
        async def first(self):
            res = await self.to_list()
            return res[0] if res else None
        async def to_list(self):
            results = []
            if self.item_id:
                results = [a for a in mock_analyses if a.item_id == self.item_id]
            else:
                results = list(mock_analyses)
            results.sort(key=lambda x: getattr(x, "analyzed_at", datetime.min), reverse=True)
            if self._limit:
                results = results[:self._limit]
            return results

    async def mock_insert(self, *args, **kwargs):
        self.id = "mock-doc-id"
        mock_analyses.append(self)
        return self

    def mock_find(*args, **kwargs):
        item_id = None
        for arg in args:
            arg_str = str(arg)
            if "item_id" in arg_str:
                parts = arg_str.split("==")
                if len(parts) > 1:
                    item_id = parts[1].strip().strip("'").strip('"')
        return MockFind(item_id)

    class MockStorageFind:
        def __init__(self, item_id):
            self.item_id = item_id
            self._limit = None
        def sort(self, *args, **kwargs):
            return self
        def limit(self, count):
            self._limit = count
            return self
        async def first(self):
            res = await self.to_list()
            return res[0] if res else None
        async def to_list(self):
            results = []
            if self.item_id:
                results = [r for r in mock_readings if r.item_id == self.item_id]
            else:
                results = list(mock_readings)
            results.sort(key=lambda x: getattr(x, "recorded_at", datetime.min), reverse=True)
            if self._limit:
                results = results[:self._limit]
            return results

    async def mock_storage_insert(self, *args, **kwargs):
        self.id = "mock-storage-id"
        mock_readings.append(self)
        return self

    def mock_storage_find(*args, **kwargs):
        item_id = None
        for arg in args:
            arg_str = str(arg)
            if "item_id" in arg_str:
                parts = arg_str.split("==")
                if len(parts) > 1:
                    item_id = parts[1].strip().strip("'").strip('"')
        return MockStorageFind(item_id)

    class MockNotificationFind:
        def __init__(self, filters):
            self.filters = filters
            self._limit = None
        def sort(self, *args, **kwargs):
            return self
        def limit(self, count):
            self._limit = count
            return self
        async def first(self):
            res = await self.to_list()
            return res[0] if res else None
        async def to_list(self):
            results = []
            for n in mock_notifications:
                if self.filters.get("is_read") is not None:
                    if n.is_read != self.filters["is_read"]:
                        continue
                if "$or" in self.filters:
                    matched = False
                    for cond in self.filters["$or"]:
                        if "role" in cond and n.role == cond["role"]:
                            matched = True
                        if "user_id" in cond and n.user_id == cond["user_id"]:
                            matched = True
                    if not matched:
                        continue
                else:
                    if "role" in self.filters and n.role != self.filters["role"]:
                        continue
                    if "user_id" in self.filters and n.user_id != self.filters["user_id"]:
                        continue
                results.append(n)
            results.sort(key=lambda x: getattr(x, "created_at", datetime.min), reverse=True)
            if self._limit:
                results = results[:self._limit]
            return results

    async def mock_notification_insert(self, *args, **kwargs):
        self.id = f"mock-notification-{len(mock_notifications)}"
        mock_notifications.append(self)
        return self

    async def mock_notification_save(self, *args, **kwargs):
        for idx, item in enumerate(mock_notifications):
            if item.id == self.id:
                mock_notifications[idx] = self
                break
        return self

    async def mock_notification_get(notification_id, *args, **kwargs):
        for n in mock_notifications:
            if str(n.id) == str(notification_id):
                return n
        return None

    def mock_notification_find(*args, **kwargs):
        filters = {}
        if len(args) > 1:
            filters = args[1]
        elif len(args) == 1 and isinstance(args[0], dict):
            filters = args[0]
        return MockNotificationFind(filters)

    async def mock_notification_delete_all(*args, **kwargs):
        mock_notifications.clear()

    class MockPreferenceFind:
        def __init__(self, filters):
            self.filters = filters
        def __await__(self):
            async def _run():
                for p in mock_preferences:
                    if "user_id" in self.filters and p.user_id == self.filters["user_id"]:
                        return p
                return None
            return _run().__await__()
        async def to_list(self):
            return list(mock_preferences)

    async def mock_preference_insert(self, *args, **kwargs):
        self.id = f"mock-pref-{len(mock_preferences)}"
        mock_preferences.append(self)
        return self

    async def mock_preference_save(self, *args, **kwargs):
        for idx, item in enumerate(mock_preferences):
            if item.id == self.id:
                mock_preferences[idx] = self
                break
        return self

    def mock_preference_find_one(*args, **kwargs):
        filters = {}
        if len(args) > 1:
            filters = args[1]
        elif len(args) == 1 and isinstance(args[0], dict):
            filters = args[0]
        return MockPreferenceFind(filters)

    async def mock_preference_delete_all(*args, **kwargs):
        mock_preferences.clear()

    # Patch class fields to prevent AttributeErrors on comparisons and sorting clauses
    ImageAnalysis.item_id = type("MockField", (), {"__eq__": lambda s, o: f"item_id == {o}"})()
    ImageAnalysis.analyzed_at = type("MockField", (), {"__neg__": lambda s: "-analyzed_at"})()
    
    ImageAnalysis.get_motor_collection = MagicMock()
    ImageAnalysis.get_settings = MagicMock()
    ImageAnalysis.insert = mock_insert
    ImageAnalysis.find = classmethod(mock_find)

    StorageReading.item_id = type("MockField", (), {"__eq__": lambda s, o: f"item_id == {o}"})()
    StorageReading.recorded_at = type("MockField", (), {"__neg__": lambda s: "-recorded_at"})()
    
    StorageReading.get_motor_collection = MagicMock()
    StorageReading.get_settings = MagicMock()
    StorageReading.insert = mock_storage_insert
    StorageReading.find = classmethod(mock_storage_find)
    
    SystemLog.get_motor_collection = MagicMock()
    SystemLog.get_settings = MagicMock()
    SystemLog.insert = AsyncMock()
    SystemLog.find = MagicMock()

    Notification.get_motor_collection = MagicMock()
    Notification.get_settings = MagicMock()
    Notification.insert = mock_notification_insert
    Notification.save = mock_notification_save
    Notification.get = classmethod(lambda cls, id, *a, **kw: mock_notification_get(id))
    Notification.find = classmethod(mock_notification_find)
    Notification.find_all = classmethod(lambda cls: MagicMock(delete=mock_notification_delete_all))

    NotificationPreference.get_motor_collection = MagicMock()
    NotificationPreference.get_settings = MagicMock()
    NotificationPreference.insert = mock_preference_insert
    NotificationPreference.save = mock_preference_save
    NotificationPreference.find_one = classmethod(mock_preference_find_one)
    NotificationPreference.find_all = classmethod(lambda cls: MagicMock(delete=mock_preference_delete_all))
    
    yield

@pytest_asyncio.fixture(autouse=True)
async def mock_mongo_init():
    with patch("app.core.database.init_databases", new_callable=AsyncMock) as mock:
        yield mock

@pytest.fixture(autouse=True)
def mock_cv_pipeline():
    from app.modules.image_analysis.router import model_pipeline
    original_analyze = model_pipeline.analyze_image
    
    def dummy_analyze(image_path: str):
        return {
            "freshness_score": 92.5,
            "color_degradation": 0.05,
            "texture_roughness": 0.08,
            "mold_detected": False,
            "mold_confidence": 0.0,
            "bruising_detected": False,
            "bruising_confidence": 0.0,
            "damage_detected": False,
            "damage_confidence": 0.0,
            "classification_label": "FRESH",
            "status_message": "Food is fresh",
            "confidence": 0.95,
            "model_version": "1.0.0"
        }
    
    model_pipeline.analyze_image = dummy_analyze
    yield
    model_pipeline.analyze_image = original_analyze

@pytest_asyncio.fixture
async def client(db_session, mock_mongo_init) -> AsyncGenerator[AsyncClient, None]:
    async def _get_test_db():
        yield db_session
        
    app.dependency_overrides[get_db] = _get_test_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
