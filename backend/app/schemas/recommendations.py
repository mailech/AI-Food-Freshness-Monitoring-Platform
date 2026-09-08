from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.models.enums import RecommendationType
class RecommendationPriority(str,Enum): HIGH='High'; MEDIUM='Medium'; LOW='Low'
class RecommendationStatus(str,Enum): NEW='New'; IN_PROGRESS='In Progress'; COMPLETED='Completed'
class RecommendationCreate(BaseModel):
 food_batch_id:int=Field(gt=0); recommendation_type:RecommendationType; priority:RecommendationPriority; message:str=Field(min_length=1,max_length=10000); status:RecommendationStatus=RecommendationStatus.NEW
 @field_validator('message')
 @classmethod
 def msg(cls,v):
  v=v.strip()
  if not v: raise ValueError('Message is required.')
  return v
class RecommendationStatusUpdate(BaseModel): status:RecommendationStatus
class RecommendationResponse(BaseModel):
 model_config=ConfigDict(from_attributes=True)
 id:int; food_batch_id:int; recommendation_type:RecommendationType; priority:str; message:str; status:str; completed_at:datetime|None; created_at:datetime; updated_at:datetime
