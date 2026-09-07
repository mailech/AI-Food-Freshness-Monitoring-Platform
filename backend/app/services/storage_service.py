"""
Storage Zone Service Layer using SQLAlchemy ORM
"""
from typing import List, Dict, Any, Optional
from app.db.session import SessionLocal
from app.models.orm import StorageConditionORM

class StorageService:
    def _to_dict(self, zone: StorageConditionORM) -> Dict[str, Any]:
        return {
            "id": zone.id,
            "zone_name": zone.zone_name,
            "temperature": float(zone.temperature),
            "temperature_status": zone.temperature_status,
            "humidity": float(zone.humidity),
            "humidity_status": zone.humidity_status,
            "air_circulation": zone.air_circulation,
            "air_status": zone.air_status,
            "light_exposure": zone.light_exposure,
            "light_status": zone.light_status,
            "storage_duration": zone.storage_duration,
            "overall_status": zone.overall_status,
            "last_updated": zone.last_updated
        }

    def get_all_zones(self) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            zones = db.query(StorageConditionORM).all()
            return [self._to_dict(z) for z in zones]
        finally:
            db.close()

    def get_zone_by_id(self, zone_id: str) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            zone = db.query(StorageConditionORM).filter(StorageConditionORM.id == zone_id).first()
            return self._to_dict(zone) if zone else None
        finally:
            db.close()

storage_service = StorageService()
