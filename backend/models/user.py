from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="consumer")
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Integer, default=1)
