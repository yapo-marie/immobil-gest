from sqlalchemy import Column, Integer, String, Date, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    date_of_birth = Column(Date)
    identity_documents = Column(JSON)  # Array of URLs to uploaded documents
    income_proof = Column(JSON)  # Array of URLs
    employment_info = Column(String)
    references = Column(JSON)  # Array of reference objects
    notes = Column(String)
    
    # Relationships
    user = relationship("User", back_populates="tenant_profile")
    leases = relationship("Lease", back_populates="tenant", cascade="all, delete-orphan")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="tenant", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Tenant {self.user_id}>"
