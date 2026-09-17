"""Storage condition persistence and deliberately neutral policy boundaries.

``storage_duration`` is persisted in hours so it can be used as shelf-life
``dwell_hours``. ``door_opens_count`` is the non-negative opening count.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.food_batch import FoodBatch
from app.models.storage_condition import StorageCondition
from app.models.storage_rule import StorageRule
from app.schemas.storage import StorageConditionCreate, StorageRuleCreate, StorageRuleUpdate

def get_batch(db: Session, batch_id: int) -> FoodBatch | None: return db.get(FoodBatch, batch_id)
def get_condition(db: Session, condition_id: int) -> StorageCondition | None: return db.get(StorageCondition, condition_id)
def list_conditions(db: Session, batch_id: int) -> list[StorageCondition]: return list(db.scalars(select(StorageCondition).where(StorageCondition.food_batch_id == batch_id).order_by(StorageCondition.recorded_at.desc(), StorageCondition.id.desc())))
def latest_condition(db: Session, batch_id: int) -> StorageCondition | None: return db.scalar(select(StorageCondition).where(StorageCondition.food_batch_id == batch_id).order_by(StorageCondition.recorded_at.desc(), StorageCondition.id.desc()).limit(1))
def record_condition(db: Session, payload: StorageConditionCreate) -> StorageCondition:
    condition=StorageCondition(food_batch_id=payload.food_batch_id,temperature=payload.temperature,humidity=payload.humidity,air_circulation=payload.air_circulation,light_level=payload.light_level,storage_duration=payload.storage_duration,door_opens_count=payload.door_opens_count)
    db.add(condition); db.commit(); db.refresh(condition); return condition
def delete_condition(db: Session, condition: StorageCondition) -> None: db.delete(condition); db.commit()
def list_rules(db: Session) -> list[StorageRule]: return list(db.scalars(select(StorageRule).order_by(StorageRule.category)))
def get_rule(db: Session, rule_id: int) -> StorageRule | None: return db.get(StorageRule, rule_id)
def rule_for_batch(db: Session, batch: FoodBatch) -> StorageRule | None:
    return db.scalar(select(StorageRule).where(StorageRule.category == batch.food_item.category))
def create_rule(db: Session, payload: StorageRuleCreate) -> StorageRule:
    rule = StorageRule(**payload.model_dump()); db.add(rule); db.commit(); db.refresh(rule); return rule
def update_rule(db: Session, rule: StorageRule, payload: StorageRuleUpdate) -> StorageRule:
    for key, value in payload.model_dump().items(): setattr(rule, key, value)
    db.commit(); db.refresh(rule); return rule
def delete_rule(db: Session, rule: StorageRule) -> None: db.delete(rule); db.commit()

_CONDITIONS = (("temperature", "Temperature"), ("humidity", "Humidity"), ("air_circulation", "Air Circulation"), ("light_level", "Light Level"))

def evaluate_compliance(condition: StorageCondition | None, rule: StorageRule | None) -> dict:
    if condition is None:
        return {"overall_status": "No Data", "message": "No storage data recorded.", "conditions": []}
    entries = []
    for field, label in _CONDITIONS:
        value = getattr(condition, field)
        minimum, maximum = (getattr(rule, f"{field}_min"), getattr(rule, f"{field}_max")) if rule else (None, None)
        if minimum is None and maximum is None:
            status, message = "Not Configured", "No rule configured for this condition."
        elif value is None:
            status, message = "No Data", "No recorded value for this condition."
        elif (minimum is not None and value < minimum) or (maximum is not None and value > maximum):
            status, message = "Needs Attention", "This reading is outside the configured range."
        else:
            status, message = "Compliant", "Within the configured range."
        entries.append({"condition": label, "value": value, "status": status, "message": message})
    configured = [item for item in entries if item["status"] != "Not Configured"]
    if not configured: overall, message = "Not Configured", "No storage rule has been configured for this category."
    elif any(item["status"] == "Needs Attention" for item in configured): overall, message = "Needs Attention", "One or more recorded conditions need attention."
    elif any(item["status"] == "No Data" for item in configured): overall, message = "No Data", "Some configured conditions do not have recorded values."
    elif len(configured) != len(entries): overall, message = "Not Configured", "Configured conditions are compliant; additional conditions have no rule configured."
    else: overall, message = "Compliant", "All recorded conditions are within the configured ranges."
    return {"overall_status": overall, "message": message, "conditions": entries}

def optimize_storage(condition: StorageCondition | None, rule: StorageRule | None) -> dict:
    compliance = evaluate_compliance(condition, rule)
    if condition is None: return {"status": "No Data", "message": "No storage data recorded.", "recommendations": []}
    if rule is None or not any(getattr(rule, f"{field}_{bound}") is not None for field, _ in _CONDITIONS for bound in ("min", "max")):
        return {"status": "Not Configured", "message": "Storage optimization is unavailable because no storage rules are configured for this category.", "recommendations": []}
    actions = []
    for item in compliance["conditions"]:
        if item["status"] == "Needs Attention": actions.append(f"{item['condition']} is outside the configured range. Review storage controls.")
        elif item["status"] == "Compliant": actions.append(f"Maintain the current {item['condition'].lower()}.")
    return {"status": compliance["overall_status"], "message": compliance["message"], "recommendations": actions}
