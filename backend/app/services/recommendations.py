from datetime import UTC,datetime
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.food_batch import FoodBatch
from app.models.recommendation import Recommendation
from app.schemas.recommendations import RecommendationCreate,RecommendationStatus
def get_batch(db:Session,i:int)->FoodBatch|None:return db.get(FoodBatch,i)
def get_recommendation(db:Session,i:int)->Recommendation|None:return db.get(Recommendation,i)
def list_recommendations(db:Session,batch_id=None,recommendation_type=None,priority=None,status=None):
 s=select(Recommendation).order_by(Recommendation.created_at.desc(),Recommendation.id.desc())
 for col,val in [(Recommendation.food_batch_id,batch_id),(Recommendation.recommendation_type,recommendation_type),(Recommendation.priority,priority),(Recommendation.status,status)]:
  if val is not None:s=s.where(col==getattr(val,'value',val))
 return list(db.scalars(s))
def generate_recommendation(db:Session,p:RecommendationCreate)->Recommendation:
 r=Recommendation(**p.model_dump(mode='json'));r.status=p.status.value;r.completed_at=datetime.now(UTC) if p.status is RecommendationStatus.COMPLETED else None;db.add(r);db.commit();db.refresh(r);return r
def update_status(db:Session,r:Recommendation,status:RecommendationStatus)->Recommendation:r.status=status.value;r.completed_at=datetime.now(UTC) if status is RecommendationStatus.COMPLETED else None;db.commit();db.refresh(r);return r
def delete_recommendation(db:Session,r:Recommendation):db.delete(r);db.commit()
