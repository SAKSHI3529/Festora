from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.models.team import TeamStatus

class TeamBase(BaseModel):
    team_name: str
    event_id: str
    leader_id: str
    member_ids: List[str]
    status: TeamStatus
    is_locked: bool

class TeamResponse(TeamBase):
    id: str
    created_at: datetime

    class Config:
        populate_by_name = True
        use_enum_values = True
