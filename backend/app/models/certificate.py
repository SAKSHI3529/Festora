from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class CertificateType(str, Enum):
    PARTICIPATION = "PARTICIPATION"
    WINNER = "WINNER"

class Certificate(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    event_id: str
    student_id: str
    certificate_type: CertificateType
    rank: Optional[int] = None # 1, 2, 3 for winners
    certificate_url: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    generated_by: str

    class Config:
        populate_by_name = True
        use_enum_values = True
