from sqlalchemy import Column, Integer, Float, Date, String, Enum as SQLEnum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    LATE = "late"
    PARTIAL = "partial"


class PaymentMethod(str, enum.Enum):
    STRIPE = "stripe"
    PAYPAL = "paypal"
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"
    CHECK = "check"


class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    lease_id = Column(Integer, ForeignKey("leases.id"), nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(Date, nullable=False)
    payment_date = Column(Date)
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(SQLEnum(PaymentMethod))
    transaction_reference = Column(String)
    receipt_url = Column(String)  # PDF receipt URL
    notes = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    lease = relationship("Lease", back_populates="payments")
    
    def __repr__(self):
        return f"<Payment lease_id={self.lease_id} amount={self.amount} ({self.status})>"
