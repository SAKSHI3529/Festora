from datetime import datetime
from typing import Optional, List
import re
from pydantic import BaseModel, ConfigDict, field_validator
from app.models.event import EventType, EventStatus

class EventBase(BaseModel):
    title: str
    description: str
    category: str
    event_type: EventType
    max_team_size: int
    min_participants: Optional[int] = 1
    max_participants: Optional[int] = 100
    event_date: datetime
    registration_deadline: datetime
    location: str
    time_slot: Optional[str] = None
    status: Optional[EventStatus] = EventStatus.SCHEDULED
    faculty_coordinator_id: str
    event_coordinator_ids: List[str] = []
    judge_ids: List[str] = []
    is_result_locked: bool = False
    reminder_24h_sent: bool = False
    reminder_start_sent: bool = False

    @field_validator('time_slot')
    @classmethod
    def validate_time_slot(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        # HH:MM AM/PM - HH:MM AM/PM
        pattern = r"^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)\s?-\s?(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$"
        if not re.match(pattern, v, re.IGNORECASE):
            raise ValueError("Time Slot must be in format 'HH:MM AM/PM - HH:MM AM/PM' (e.g. 10:00 AM - 12:00 PM)")
        return v.upper()

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    event_type: Optional[EventType] = None
    max_team_size: Optional[int] = None
    min_participants: Optional[int] = None
    max_participants: Optional[int] = None
    event_date: Optional[datetime] = None
    registration_deadline: Optional[datetime] = None
    location: Optional[str] = None
    status: Optional[EventStatus] = None
    faculty_coordinator_id: Optional[str] = None
    event_coordinator_ids: Optional[List[str]] = None
    judge_ids: Optional[List[str]] = None
    is_result_locked: Optional[bool] = None
    rulebook_url: Optional[str] = None

class EventResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, use_enum_values=True, extra='ignore')
    id: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    event_type: Optional[EventType] = None
    max_team_size: Optional[int] = None
    min_participants: Optional[int] = None
    max_participants: Optional[int] = None
    event_date: Optional[datetime] = None
    registration_deadline: Optional[datetime] = None
    location: Optional[str] = None
    status: Optional[EventStatus] = None
    faculty_coordinator_id: Optional[str] = None
    event_coordinator_ids: Optional[List[str]] = []
    judge_ids: Optional[List[str]] = []
    is_result_locked: Optional[bool] = False
    reminder_24h_sent: bool = False
    reminder_start_sent: bool = False
    rulebook_url: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
