"""Authenticated storage-condition monitoring endpoints."""
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.core.security import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.storage_condition import StorageCondition
from app.models.user import User
from app.schemas.storage import StorageConditionCreate, StorageConditionResponse
from app.services.storage import delete_condition, get_batch, get_condition, latest_condition, list_conditions, record_condition
router=APIRouter(prefix='/storage',tags=['storage'])
OperationalUser=Annotated[User,Depends(require_roles(UserRole.RETAIL_MANAGER,UserRole.WAREHOUSE_OPERATOR,UserRole.ADMINISTRATOR))]
AuthenticatedUser=Annotated[User,Depends(get_current_user)]
def _batch(db:Session, ident:int)->None:
    if get_batch(db,ident) is None: raise HTTPException(status_code=404,detail='Food batch not found.')
def _condition(db:Session,ident:int)->StorageCondition:
    value=get_condition(db,ident)
    if value is None: raise HTTPException(status_code=404,detail='Storage condition not found.')
    return value
@router.get('/health')
def storage_health()->dict[str,str]: return {'module':'storage','status':'ready'}
@router.post('/conditions',response_model=StorageConditionResponse,status_code=status.HTTP_201_CREATED)
def create_condition(payload:StorageConditionCreate,db:Annotated[Session,Depends(get_db)],_:OperationalUser)->StorageCondition:
    _batch(db,payload.food_batch_id); return record_condition(db,payload)
@router.get('/conditions/{condition_id}',response_model=StorageConditionResponse)
def read_condition(condition_id:int,db:Annotated[Session,Depends(get_db)],_:AuthenticatedUser)->StorageCondition: return _condition(db,condition_id)
@router.get('/batches/{food_batch_id}/conditions',response_model=list[StorageConditionResponse])
def read_conditions(food_batch_id:int,db:Annotated[Session,Depends(get_db)],_:AuthenticatedUser)->list[StorageCondition]: _batch(db,food_batch_id); return list_conditions(db,food_batch_id)
@router.get('/batches/{food_batch_id}/latest',response_model=StorageConditionResponse)
def read_latest(food_batch_id:int,db:Annotated[Session,Depends(get_db)],_:AuthenticatedUser)->StorageCondition:
    _batch(db,food_batch_id); value=latest_condition(db,food_batch_id)
    if value is None: raise HTTPException(status_code=404,detail='No storage conditions have been recorded for this batch.')
    return value
@router.delete('/conditions/{condition_id}',status_code=status.HTTP_204_NO_CONTENT)
def remove_condition(condition_id:int,db:Annotated[Session,Depends(get_db)],_:OperationalUser)->Response: delete_condition(db,_condition(db,condition_id)); return Response(status_code=204)
