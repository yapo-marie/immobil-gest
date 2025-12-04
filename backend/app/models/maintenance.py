from sqlalchemy import Column, Integer, String, Enum as SQLEnum, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class MaintenanceType(str, enum.Enum):
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    HEATING = "heating"
    APPLIANCE = "appliance"
    OTHER = "other"


class MaintenanceStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class MaintenancePriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    type = Column(SQLEnum(MaintenanceType), nullable=False)
    description = Column(String, nullable=False)
    status = Column(SQLEnum(MaintenanceStatus), default=MaintenanceStatus.PENDING)
    priority = Column(SQLEnum(MaintenancePriority), default=MaintenancePriority.MEDIUM)
    images = Column(JSON)  # Array of image URLs
    resolution_notes = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True))
    
    # Relationships
    property = relationship("Property", back_populates="maintenance_requests")
    tenant = relationship("Tenant", back_populates="maintenance_requests")
    
    def __repr__(self):
        return f"<MaintenanceRequest {self.id} ({self.status})>"
