from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum

class EventType(str, Enum):
    SOLO = "SOLO"
    GROUP = "GROUP"

class EventStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"

class Event(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    title: str
    description: str
    category: str
    event_type: EventType
    max_team_size: int
    event_date: datetime
    registration_deadline: datetime
    location: str
    time_slot: Optional[str] = None
    status: EventStatus = EventStatus.SCHEDULED
    is_result_locked: bool = False
    reminder_24h_sent: bool = False
    reminder_start_sent: bool = False
    
    faculty_coordinator_id: str
    event_coordinator_ids: List[str] = []
    judge_ids: List[str] = []
    
    rulebook_url: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        use_enum_values = True
