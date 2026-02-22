from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class Category(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        use_enum_values = True
