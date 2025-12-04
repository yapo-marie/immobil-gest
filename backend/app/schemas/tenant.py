from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from app.schemas.user import UserResponse


class TenantBase(BaseModel):
    date_of_birth: Optional[date] = None
    employment_info: Optional[str] = None
    notes: Optional[str] = None
    identity_documents: Optional[List[str]] = []
    income_proof: Optional[List[str]] = []
    references: Optional[List[dict]] = []


class TenantCreate(TenantBase):
    user_id: int


class TenantUpdate(TenantBase):
    pass


class TenantResponse(TenantBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class TenantDetailResponse(TenantResponse):
    user: UserResponse

    class Config:
        from_attributes = True
