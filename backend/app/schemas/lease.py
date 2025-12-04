from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from app.models.lease import LeaseStatus


class LeaseBase(BaseModel):
    property_id: int
    tenant_id: int
    start_date: date
    end_date: Optional[date] = None
    rent_amount: float
    charges: Optional[float] = 0
    deposit_paid: Optional[float] = None
    payment_day: Optional[int] = 1
    special_conditions: Optional[str] = None


class LeaseCreate(LeaseBase):
    pass


class LeaseUpdate(BaseModel):
    end_date: Optional[date] = None
    rent_amount: Optional[float] = None
    charges: Optional[float] = None
    payment_day: Optional[int] = None
    status: Optional[LeaseStatus] = None
    special_conditions: Optional[str] = None


class LeaseResponse(LeaseBase):
    id: int
    status: LeaseStatus
    contract_url: Optional[str] = None
    created_at: datetime
    actual_end_date: Optional[date] = None

    class Config:
        from_attributes = True
