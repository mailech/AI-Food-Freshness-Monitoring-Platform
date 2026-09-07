from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "consumer"

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str

    class Config:
        from_attributes = True
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"        
from datetime import datetime
from typing import Optional

class FoodItemCreate(BaseModel):
    name: str
    category: str
    quantity: float = 1
    unit: str = "units"
    batch_number: Optional[str] = None
    expiry_date: Optional[datetime] = None
    storage_location: Optional[str] = None

class FoodItemResponse(BaseModel):
    id: int
    name: str
    category: str
    quantity: float
    unit: str
    batch_number: Optional[str]
    expiry_date: Optional[datetime]
    storage_location: Optional[str]
    created_at: datetime
    owner_id: int

    class Config:
        from_attributes = True