"""Storage condition monitoring endpoints."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status

from app.config import settings
from app.core.enums import Permission
from app.deps import DbSession, RequestMeta, require_permissions
from app.inventory import service as inventory_service
from app.repositories.food import BatchRepository
from app.schemas.analysis import (
    SensorProviderOut,
    SensorReadingOut,
    StorageConditionUpdate,
    StorageReadingCreate,
    StorageReadingOut,
    StorageSnapshotOut,
)
from app.schemas.common import Message
from app.storage import service as storage_service
from app.storage.sensors import get_sensor_provider

router = APIRouter(prefix="/storage", tags=["Storage Monitoring"])


@router.get(
    "/overview",
    response_model=dict,
    summary="Storage compliance overview",
    description="Compliance roll-up across every active batch, with the batches that "
    "need attention first.",
)
def overview(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.STORAGE_READ))],
    location: str | None = Query(default=None, alias="location_name"),
) -> dict:
    return storage_service.compliance_overview(db, location_name=location)


@router.get("/locations", response_model=list[dict], summary="Storage locations")
def locations(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.STORAGE_READ))],
) -> list[dict]:
    return storage_service.locations(db)


@router.get(
    "/trends",
    response_model=dict,
    summary="Temperature / humidity trends",
)
def trends(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.STORAGE_READ))],
    batch_id: int | None = None,
    location_name: str | None = None,
    days: int = Query(default=14, ge=1, le=180),
) -> dict:
    return storage_service.reading_trends(
        db, batch_id=batch_id, location_name=location_name, days=days
    )


@router.get(
    "/readings",
    response_model=list[StorageReadingOut],
    summary="Environmental reading history",
)
def readings(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.STORAGE_READ))],
    batch_id: int | None = None,
    location_name: str | None = None,
    days: int = Query(default=14, ge=1, le=365),
    limit: int = Query(default=200, ge=1, le=1000),
) -> list[StorageReadingOut]:
    rows = storage_service.reading_history(
        db, batch_id=batch_id, location_name=location_name, days=days, limit=limit
    )
    return [StorageReadingOut.model_validate(r) for r in rows]


@router.post(
    "/readings",
    response_model=StorageReadingOut,
    status_code=status.HTTP_201_CREATED,
    summary="Record a storage reading (manual entry)",
    description="Evaluates the reading against the batch's required envelope and raises "
    "or resolves storage alerts automatically.",
)
def create_reading(
    payload: StorageReadingCreate,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.STORAGE_WRITE))],
) -> StorageReadingOut:
    batch = None
    if payload.batch_id is not None:
        batch = BatchRepository(db).get_or_404(payload.batch_id, "Batch")
        inventory_service.assert_batch_access(user, batch, db)

    reading = storage_service.record_reading(
        db,
        batch=batch,
        temperature_c=payload.temperature_c,
        humidity_pct=payload.humidity_pct,
        air_circulation=str(payload.air_circulation) if payload.air_circulation else None,
        light_exposure=str(payload.light_exposure) if payload.light_exposure else None,
        co2_ppm=payload.co2_ppm,
        location_name=payload.location_name,
        sensor_id=payload.sensor_id,
        source=payload.source,
        recorded_at=payload.recorded_at,
        note=payload.note,
        user=user,
        request_meta=meta,
    )
    db.commit()
    db.refresh(reading)
    return StorageReadingOut.model_validate(reading)


@router.get(
    "/{batch_id}",
    response_model=StorageSnapshotOut,
    summary="Storage condition and compliance for a batch",
    description="Current condition, the required range, compliance status, risk level "
    "and a recommendation.",
)
def batch_storage(
    batch_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.STORAGE_READ))],
) -> StorageSnapshotOut:
    batch = BatchRepository(db).get_or_404(batch_id, "Batch")
    inventory_service.assert_batch_access(user, batch, db)
    return StorageSnapshotOut.model_validate(storage_service.batch_storage_snapshot(db, batch))


@router.put(
    "/{batch_id}",
    response_model=StorageSnapshotOut,
    summary="Update a batch's storage condition",
)
def update_batch_storage(
    batch_id: int,
    payload: StorageConditionUpdate,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.STORAGE_WRITE))],
) -> StorageSnapshotOut:
    batch = BatchRepository(db).get_or_404(batch_id, "Batch")
    inventory_service.assert_batch_access(user, batch, db)

    storage_service.record_reading(
        db,
        batch=batch,
        temperature_c=payload.temperature_c,
        humidity_pct=payload.humidity_pct,
        air_circulation=str(payload.air_circulation) if payload.air_circulation else None,
        light_exposure=str(payload.light_exposure) if payload.light_exposure else None,
        location_name=payload.location_name,
        source="MANUAL",
        user=user,
        request_meta=meta,
    )
    db.commit()
    db.refresh(batch)
    return StorageSnapshotOut.model_validate(storage_service.batch_storage_snapshot(db, batch))


# ------------------------------------------------------------------ sensors
@router.get(
    "/sensors/provider",
    response_model=SensorProviderOut,
    summary="Active sensor provider",
    description="The platform runs fully without IoT hardware using MockSensorProvider. "
    "Set SENSOR_PROVIDER=mqtt and provide a broker to switch.",
)
def sensor_provider(
    user: Annotated[Any, Depends(require_permissions(Permission.STORAGE_READ))],
) -> SensorProviderOut:
    provider = get_sensor_provider()
    info = provider.describe()
    return SensorProviderOut(
        **info,
        note=(
            "Mock provider: deterministic simulated readings, no hardware required."
            if info["provider"] == "mock"
            else f"MQTT provider connected to {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}."
        ),
    )


@router.get(
    "/sensors/read",
    response_model=list[SensorReadingOut],
    summary="Poll all sensors",
)
def read_sensors(
    user: Annotated[Any, Depends(require_permissions(Permission.STORAGE_READ))],
) -> list[SensorReadingOut]:
    provider = get_sensor_provider()
    return [SensorReadingOut.model_validate(r.as_dict()) for r in provider.read_all()]


@router.post(
    "/sensors/ingest",
    response_model=Message,
    summary="Poll sensors and persist the readings",
    description="Pulls every sensor from the active provider and stores the values, "
    "matching batches by storage location.",
)
def ingest_sensors(
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.STORAGE_WRITE))],
) -> Message:
    from sqlalchemy import select

    from app.models import FoodBatch

    provider = get_sensor_provider()
    readings = provider.read_all()
    stored = 0
    matched = 0

    for reading in readings:
        batches = list(
            db.scalars(
                select(FoodBatch).where(
                    FoodBatch.is_archived.is_(False),
                    FoodBatch.storage_location == reading.location_name,
                )
            ).unique().all()
        )
        if batches:
            for batch in batches:
                storage_service.record_reading(
                    db,
                    batch=batch,
                    temperature_c=reading.temperature_c,
                    humidity_pct=reading.humidity_pct,
                    co2_ppm=reading.co2_ppm,
                    location_name=reading.location_name,
                    sensor_id=reading.sensor_id,
                    source=reading.source,
                    recorded_at=reading.recorded_at,
                    user=user,
                    request_meta=meta,
                )
                stored += 1
                matched += 1
        else:
            # Location-level reading with no batch attached.
            storage_service.record_reading(
                db,
                batch=None,
                temperature_c=reading.temperature_c,
                humidity_pct=reading.humidity_pct,
                co2_ppm=reading.co2_ppm,
                location_name=reading.location_name,
                sensor_id=reading.sensor_id,
                source=reading.source,
                recorded_at=reading.recorded_at,
                user=user,
                request_meta=meta,
            )
            stored += 1

    db.commit()
    return Message(
        message=(
            f"Ingested {len(readings)} sensor(s) from the '{provider.name}' provider: "
            f"{stored} reading(s) stored, {matched} linked to batches."
        )
    )
