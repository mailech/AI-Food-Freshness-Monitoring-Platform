"""Authenticated storage-condition monitoring endpoints."""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.storage_condition import StorageCondition
from app.models.user import User
from app.schemas.storage import (StorageConditionCreate, StorageConditionResponse, StorageComplianceResponse, StorageOptimizationResponse, StorageRuleCreate, StorageRuleResponse, StorageRuleUpdate)
from app.services.storage import (create_rule, delete_condition, delete_rule, evaluate_compliance, get_batch, get_condition, get_rule, latest_condition, list_conditions, list_rules, optimize_storage, record_condition, rule_for_batch, update_rule)
from app.services.automatic_alerts import evaluate_automatic_alerts
from app.services.automatic_recommendations import evaluate_automatic_recommendations
router=APIRouter(prefix='/storage',tags=['storage'])
OperationalUser=Annotated[User,Depends(require_roles(UserRole.WAREHOUSE_OPERATOR,UserRole.ADMINISTRATOR))]
AuthenticatedUser=Annotated[User,Depends(get_current_user)]
Administrator=Annotated[User,Depends(require_roles(UserRole.ADMINISTRATOR))]
def _batch(db:Session, ident:int)->None:
    if get_batch(db,ident) is None: raise HTTPException(status_code=404,detail='Food batch not found.')
def _condition(db:Session,ident:int)->StorageCondition:
    value=get_condition(db,ident)
    if value is None: raise HTTPException(status_code=404,detail='Storage condition not found.')
    return value
@router.get('/health')
def storage_health()->dict[str,str]: return {'module':'storage','status':'ready'}
@router.post('/conditions',response_model=StorageConditionResponse,status_code=status.HTTP_201_CREATED)
def create_condition(payload:StorageConditionCreate,db:Annotated[Session,Depends(get_db)],current_user:OperationalUser)->StorageCondition:
    """Persist a storage record. ``storage_duration`` is hours; ``door_opens_count`` is required."""
    _batch(db,payload.food_batch_id)
    condition=record_condition(db,payload)
    evaluate_automatic_alerts(db, food_batch_id=payload.food_batch_id, user_id=current_user.id)
    evaluate_automatic_recommendations(db, food_batch_id=payload.food_batch_id)
    return condition
@router.get('/conditions/{condition_id}',response_model=StorageConditionResponse)
def read_condition(condition_id:int,db:Annotated[Session,Depends(get_db)],_:AuthenticatedUser)->StorageCondition: return _condition(db,condition_id)
@router.get('/batches/{food_batch_id}/conditions',response_model=list[StorageConditionResponse])
def read_conditions(food_batch_id:int,db:Annotated[Session,Depends(get_db)],_:AuthenticatedUser)->list[StorageCondition]: _batch(db,food_batch_id); return list_conditions(db,food_batch_id)
@router.get('/batches/{food_batch_id}/latest',response_model=StorageConditionResponse)
def read_latest(food_batch_id:int,db:Annotated[Session,Depends(get_db)],_:AuthenticatedUser)->StorageCondition:
    _batch(db,food_batch_id); value=latest_condition(db,food_batch_id)
    if value is None: raise HTTPException(status_code=404,detail='No storage conditions have been recorded for this batch.')
    return value
@router.get('/rules', response_model=list[StorageRuleResponse])
def read_rules(db:Annotated[Session,Depends(get_db)],_:AuthenticatedUser): return list_rules(db)
@router.post('/rules', response_model=StorageRuleResponse, status_code=status.HTTP_201_CREATED)
def add_rule(payload:StorageRuleCreate, db:Annotated[Session,Depends(get_db)],_:Administrator):
    if any(rule.category == payload.category for rule in list_rules(db)): raise HTTPException(status_code=409, detail='A storage rule already exists for this category.')
    return create_rule(db, payload)
@router.put('/rules/{rule_id}', response_model=StorageRuleResponse)
def edit_rule(rule_id:int, payload:StorageRuleUpdate, db:Annotated[Session,Depends(get_db)],_:Administrator):
    rule=get_rule(db, rule_id)
    if rule is None: raise HTTPException(status_code=404,detail='Storage rule not found.')
    return update_rule(db, rule, payload)
@router.delete('/rules/{rule_id}', status_code=status.HTTP_204_NO_CONTENT)
def remove_rule(rule_id:int, db:Annotated[Session,Depends(get_db)],_:Administrator):
    rule=get_rule(db, rule_id)
    if rule is None: raise HTTPException(status_code=404,detail='Storage rule not found.')
    delete_rule(db, rule); return Response(status_code=204)
@router.get('/batches/{food_batch_id}/compliance', response_model=StorageComplianceResponse)
def read_compliance(food_batch_id:int, db:Annotated[Session,Depends(get_db)],_:AuthenticatedUser):
    batch=get_batch(db, food_batch_id)
    if batch is None: raise HTTPException(status_code=404,detail='Food batch not found.')
    result=evaluate_compliance(latest_condition(db, food_batch_id), rule_for_batch(db, batch)); result['rule']=rule_for_batch(db, batch); return result
@router.get('/batches/{food_batch_id}/optimization', response_model=StorageOptimizationResponse)
def read_optimization(food_batch_id:int, db:Annotated[Session,Depends(get_db)],_:AuthenticatedUser):
    batch=get_batch(db, food_batch_id)
    if batch is None: raise HTTPException(status_code=404,detail='Food batch not found.')
    return optimize_storage(latest_condition(db, food_batch_id), rule_for_batch(db, batch))
@router.delete('/conditions/{condition_id}',status_code=status.HTTP_204_NO_CONTENT)
def remove_condition(condition_id:int,db:Annotated[Session,Depends(get_db)],_:OperationalUser)->Response: delete_condition(db,_condition(db,condition_id)); return Response(status_code=204)
