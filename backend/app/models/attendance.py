from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class AttendanceStatus(str, Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"

class Attendance(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    event_id: str
    student_id: str
    status: AttendanceStatus = AttendanceStatus.PRESENT
    marked_by: str
    marked_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        use_enum_values = True
