from typing import Annotated
from fastapi import APIRouter,Depends,HTTPException,Response,status
from sqlalchemy.orm import Session
from app.core.security import get_current_user,require_roles
from app.db.session import get_db
from app.models.enums import RecommendationType,UserRole
from app.models.recommendation import Recommendation
from app.models.user import User
from app.schemas.recommendations import RecommendationCreate,RecommendationResponse,RecommendationStatus,RecommendationStatusUpdate
from app.services.recommendations import *
router=APIRouter(prefix='/recommendations',tags=['recommendations'])
Op=Annotated[User,Depends(require_roles(UserRole.RETAIL_MANAGER,UserRole.WAREHOUSE_OPERATOR,UserRole.FOOD_QUALITY_INSPECTOR,UserRole.ADMINISTRATOR))]; Auth=Annotated[User,Depends(get_current_user)]
def rec(db,i):
 r=get_recommendation(db,i)
 if not r:raise HTTPException(404,'Recommendation not found.')
 return r
@router.get('/health')
def recommendations_health():return {'module':'recommendations','status':'ready'}
@router.post('',response_model=RecommendationResponse,status_code=201)
def create(p:RecommendationCreate,db:Annotated[Session,Depends(get_db)],_:Op):
 if not get_batch(db,p.food_batch_id):raise HTTPException(404,'Food batch not found.')
 return generate_recommendation(db,p)
@router.get('',response_model=list[RecommendationResponse])
def listing(db:Annotated[Session,Depends(get_db)],_:Auth,food_batch_id:int|None=None,recommendation_type:RecommendationType|None=None,priority:str|None=None,status:str|None=None):return list_recommendations(db,food_batch_id,recommendation_type,priority,status)
@router.get('/batches/{batch_id}',response_model=list[RecommendationResponse])
def bybatch(batch_id:int,db:Annotated[Session,Depends(get_db)],_:Auth):
 if not get_batch(db,batch_id):raise HTTPException(404,'Food batch not found.')
 return list_recommendations(db,batch_id)
@router.get('/{recommendation_id}',response_model=RecommendationResponse)
def get(recommendation_id:int,db:Annotated[Session,Depends(get_db)],_:Auth):return rec(db,recommendation_id)
@router.patch('/{recommendation_id}/status',response_model=RecommendationResponse)
def patch(recommendation_id:int,p:RecommendationStatusUpdate,db:Annotated[Session,Depends(get_db)],_:Op):return update_status(db,rec(db,recommendation_id),p.status)
@router.delete('/{recommendation_id}',status_code=204)
def remove(recommendation_id:int,db:Annotated[Session,Depends(get_db)],_:Op):delete_recommendation(db,rec(db,recommendation_id));return Response(status_code=204)
