from sqlalchemy import Column, Integer, String, Date, DateTime, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class ReminderHistory(Base):
    """
    Trace minimale pour éviter les doublons de relance.
    La clé unique suit le format reminder:{tenant_id}:{due_date}:{step}.
    """

    __tablename__ = "reminder_history"
    __table_args__ = (
        UniqueConstraint("key", name="uq_reminder_history_key"),
    )

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, nullable=False, unique=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)
    lease_id = Column(Integer, ForeignKey("leases.id"), nullable=True)
    due_date = Column(Date, nullable=False)
    step = Column(String, nullable=False)
    meta = Column(JSON, nullable=True)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())

