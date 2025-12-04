from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from app.models.payment import PaymentStatus, PaymentMethod


class PaymentBase(BaseModel):
    lease_id: int
    amount: float
    due_date: date
    payment_date: Optional[date] = None
    status: PaymentStatus = PaymentStatus.PENDING
    payment_method: Optional[PaymentMethod] = None
    transaction_reference: Optional[str] = None
    receipt_url: Optional[str] = None
    notes: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    payment_date: Optional[date] = None
    status: Optional[PaymentStatus] = None
    payment_method: Optional[PaymentMethod] = None
    transaction_reference: Optional[str] = None
    receipt_url: Optional[str] = None
    notes: Optional[str] = None


class PaymentResponse(PaymentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
