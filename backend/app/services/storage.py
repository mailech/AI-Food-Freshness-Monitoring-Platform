"""Storage condition persistence and deliberately neutral policy boundaries."""
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.food_batch import FoodBatch
from app.models.storage_condition import StorageCondition
from app.schemas.storage import StorageConditionCreate

def get_batch(db: Session, batch_id: int) -> FoodBatch | None: return db.get(FoodBatch, batch_id)
def get_condition(db: Session, condition_id: int) -> StorageCondition | None: return db.get(StorageCondition, condition_id)
def list_conditions(db: Session, batch_id: int) -> list[StorageCondition]: return list(db.scalars(select(StorageCondition).where(StorageCondition.food_batch_id == batch_id).order_by(StorageCondition.recorded_at.desc(), StorageCondition.id.desc())))
def latest_condition(db: Session, batch_id: int) -> StorageCondition | None: return db.scalar(select(StorageCondition).where(StorageCondition.food_batch_id == batch_id).order_by(StorageCondition.recorded_at.desc(), StorageCondition.id.desc()).limit(1))
def record_condition(db: Session, payload: StorageConditionCreate) -> StorageCondition:
    condition=StorageCondition(food_batch_id=payload.food_batch_id,temperature=payload.temperature,humidity=payload.humidity,air_circulation=payload.air_circulation,light_level=payload.light_level)
    db.add(condition); db.commit(); db.refresh(condition); return condition
def delete_condition(db: Session, condition: StorageCondition) -> None: db.delete(condition); db.commit()
def evaluate_compliance(_: StorageCondition) -> dict[str,str]:
    """No category-specific scientific thresholds exist yet, so remain neutral."""
    return {'state':'unknown','reason':'No configured storage thresholds exist for this batch category.'}
def optimize_storage(_: StorageCondition) -> dict[str,str]:
    """Reserved for the future Recommendations/optimization module."""
    return {'state':'pending_optimization_rules','message':'No storage optimization rules are configured.'}
