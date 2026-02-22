from pydantic import BaseModel
from typing import Optional, List

class ResultEntry(BaseModel):
    rank: int
    participant_name: Optional[str] = None # For Solo
    team_name: Optional[str] = None # For Group
    registration_number: Optional[str] = None # For Solo
    total_score: float
    average_score: float
    score_count: int

class EventResultResponse(BaseModel):
    event_id: str
    is_locked: bool
    results: List[ResultEntry]
