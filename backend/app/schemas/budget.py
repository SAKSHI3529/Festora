from pydantic import BaseModel, parse_obj_as
from typing import Optional, List
from datetime import datetime
from app.models.budget import BudgetStatus

class BudgetCreate(BaseModel):
    event_id: str
    requested_amount: float
    description: str
    justification: Optional[str] = None

class BudgetApprove(BaseModel):
    approved_amount: float

class BudgetResponse(BaseModel):
    id: Optional[str] = None
    event_id: str
    requested_by: str
    requested_amount: float
    description: Optional[str] = None
    justification: Optional[str] = None
    status: BudgetStatus
    approved_amount: Optional[float] = None
    approved_by: Optional[str] = None
    requested_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        use_enum_values = True
        extra = 'ignore'
