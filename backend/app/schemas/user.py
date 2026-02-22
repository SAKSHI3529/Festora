from pydantic import BaseModel, EmailStr, validator
from pydantic import ConfigDict
from typing import Optional
from app.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.STUDENT
    registration_number: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None

class UserCreate(UserBase):
    password: str

    @validator('registration_number', 'department', always=True)
    def validate_student_fields(cls, v, values):
        if values.get('role') == UserRole.STUDENT and not v:
            raise ValueError('This field is required for students')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: Optional[str] = None

    # use_enum_values=True ensures role is returned as "admin" not "UserRole.ADMIN"
    model_config = ConfigDict(populate_by_name=True, use_enum_values=True)
