from fastapi import APIRouter
from typing import List, Dict, Any
from app.models.schemas import StorageCondition
from app.services.storage_service import storage_service

router = APIRouter(prefix="/storage", tags=["Storage Monitoring"])

@router.get("", response_model=List[StorageCondition])
def get_storage_conditions():
    return storage_service.get_all_zones()

@router.get("/trends")
def get_storage_trends():
    return storage_service.get_history_trends()
