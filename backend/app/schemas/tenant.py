from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date
from app.schemas.user import UserResponse, UserCreate


class TenantBase(BaseModel):
    date_of_birth: Optional[date] = None
    employment_info: Optional[str] = None
    notes: Optional[str] = None
    identity_documents: Optional[List[str]] = []
    income_proof: Optional[List[str]] = []
    references: Optional[List[dict]] = []


class TenantCreate(TenantBase):
    user_id: int

class TenantCreateWithUser(TenantBase):
    email: str
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str = "tenant"


class TenantUpdate(TenantBase):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None


class TenantResponse(TenantBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class TenantDetailResponse(TenantResponse):
    user: UserResponse

    class Config:
        from_attributes = True
