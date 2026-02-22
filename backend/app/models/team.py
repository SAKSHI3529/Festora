from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TeamStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Team(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    event_id: str
    team_name: str
    leader_id: str
    member_ids: List[str]
    status: TeamStatus = TeamStatus.PENDING
    is_locked: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        use_enum_values = True
