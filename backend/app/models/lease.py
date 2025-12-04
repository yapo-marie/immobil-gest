from sqlalchemy import Column, Integer, Float, Date, String, Enum as SQLEnum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class LeaseStatus(str, enum.Enum):
    ACTIVE = "active"
    TERMINATED = "terminated"
    EXPIRED = "expired"


class Lease(Base):
    __tablename__ = "leases"
    
    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)  # Planned end date
    actual_end_date = Column(Date)  # Actual termination date
    rent_amount = Column(Float, nullable=False)
    charges = Column(Float, default=0)
    deposit_paid = Column(Float)
    payment_day = Column(Integer, default=1)  # Day of month (1-31)
    status = Column(SQLEnum(LeaseStatus), default=LeaseStatus.ACTIVE)
    special_conditions = Column(String)
    contract_url = Column(String)  # PDF contract URL
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    property = relationship("Property", back_populates="leases")
    tenant = relationship("Tenant", back_populates="leases")
    payments = relationship("Payment", back_populates="lease", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Lease property_id={self.property_id} tenant_id={self.tenant_id} ({self.status})>"
