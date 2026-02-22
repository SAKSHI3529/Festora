from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    FACULTY = "faculty"
    EVENT_COORDINATOR = "event_coordinator"
    JUDGE = "judge"
    STUDENT = "student"

class User(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    full_name: str
    email: EmailStr
    hashed_password: str
    role: UserRole
    registration_number: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
