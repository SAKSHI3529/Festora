from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
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
    status: Optional[EventStatus] = EventStatus.SCHEDULED
    faculty_coordinator_id: str
    event_coordinator_ids: List[str] = []
    judge_ids: List[str] = []
    is_result_locked: bool = False

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
    rulebook_url: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
