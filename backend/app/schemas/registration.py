from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.registration import RegistrationStatus

class RegistrationCreate(BaseModel):
    event_id: str
    team_name: Optional[str] = None
    member_ids: Optional[List[str]] = []

class RegistrationResponse(BaseModel):
    id: str
    event_id: str
    student_id: str
    team_id: Optional[str] = None
    status: RegistrationStatus
    registered_at: datetime
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        use_enum_values = True
