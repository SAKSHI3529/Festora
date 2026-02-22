from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class Score(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    event_id: str
    judge_id: str
    registration_id: Optional[str] = None
    team_id: Optional[str] = None
    score: float
    remarks: Optional[str] = None
    submitted_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
