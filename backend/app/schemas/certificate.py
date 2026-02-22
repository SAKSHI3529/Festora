from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.certificate import CertificateType

class CertificateResponse(BaseModel):
    id: str
    event_id: str
    student_id: str
    certificate_type: CertificateType
    rank: Optional[int] = None
    certificate_url: str
    generated_at: datetime
    generated_by: str

    class Config:
        populate_by_name = True
        use_enum_values = True
