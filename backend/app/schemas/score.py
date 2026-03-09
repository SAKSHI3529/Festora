from pydantic import BaseModel, root_validator
from typing import Optional
from datetime import datetime

class ScoreCreate(BaseModel):
    event_id: str
    registration_id: Optional[str] = None
    team_id: Optional[str] = None
    score: float
    remarks: Optional[str] = None

    @root_validator(pre=True)
    def check_target(cls, values):
        reg = values.get('registration_id')
        team = values.get('team_id')
        if not reg and not team:
            raise ValueError('Either registration_id or team_id must be provided')
        if reg and team:
            raise ValueError('Cannot provide both registration_id and team_id')
        
        score = values.get('score')
        if score is not None and score < 0:
             raise ValueError('Score cannot be negative')

        return values

class ScoreResponse(BaseModel):
    id: str
    event_id: str
    judge_id: str
    registration_id: Optional[str] = None
    team_id: Optional[str] = None
    score: float
    remarks: Optional[str] = None
    submitted_at: datetime

    class Config:
        populate_by_name = True

class ScoreUpdate(BaseModel):
    score: float
    remarks: Optional[str] = None

    @root_validator(pre=True)
    def check_score(cls, values):
        score = values.get('score')
        if score is not None and score < 0:
            raise ValueError('Score cannot be negative')
        return values
