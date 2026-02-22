from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

class RegistrationStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Registration(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    event_id: str
    student_id: str
    team_id: Optional[str] = None
    status: RegistrationStatus = RegistrationStatus.PENDING
    registered_at: datetime = Field(default_factory=datetime.utcnow)
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        use_enum_values = True
