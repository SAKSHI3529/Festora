from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class AuditAction(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    SUBMIT = "SUBMIT"
    LOCK = "LOCK"
    GENERATE = "GENERATE"
    LOGIN = "LOGIN"

class AuditModule(str, Enum):
    AUTH = "AUTH"
    EVENTS = "EVENTS"
    REGISTRATIONS = "REGISTRATIONS"
    TEAMS = "TEAMS"
    SCORES = "SCORES"
    BUDGETS = "BUDGETS"
    CERTIFICATES = "CERTIFICATES"

class AuditLog(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    user_role: str
    action: AuditAction
    module: AuditModule
    ref_id: Optional[str] = None # Event ID, Reg ID, etc.
    description: str
    ip_address: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        use_enum_values = True
