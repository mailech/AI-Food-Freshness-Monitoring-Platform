from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "Consumer"

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str