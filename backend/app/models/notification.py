from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class NotificationType(str, enum.Enum):
    PAYMENT_CONFIRMATION = "payment_confirmation"
    PAYMENT_REMINDER = "payment_reminder"
    PAYMENT_LATE = "payment_late"
    LEASE_EXPIRING = "lease_expiring"
    MAINTENANCE_UPDATE = "maintenance_update"
    GENERAL = "general"


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(SQLEnum(NotificationType), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    
    def __repr__(self):
        return f"<Notification user_id={self.user_id} type={self.type} read={self.is_read}>"
