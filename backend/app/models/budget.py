from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class BudgetStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Budget(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    event_id: str
    requested_by: str
    requested_amount: float
    description: str
    justification: str
    status: BudgetStatus = BudgetStatus.PENDING
    
    approved_amount: Optional[float] = None
    approved_by: Optional[str] = None
    
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        use_enum_values = True
