from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.models.attendance import AttendanceStatus

class AttendanceCreate(BaseModel):
    student_id: str
    status: AttendanceStatus

class AttendanceResponse(BaseModel):
    id: str
    event_id: str
    student_id: str
    status: AttendanceStatus
    marked_by: str
    marked_at: datetime

    class Config:
        populate_by_name = True
        use_enum_values = True
