from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class PropertyType(str, enum.Enum):
    APARTMENT = "appartement"
    HOUSE = "villa"
    STUDIO = "studio"
    COMMERCIAL = "commercial"


class PropertyStatus(str, enum.Enum):
    AVAILABLE = "disponible"
    OCCUPIED = "occupé"
    MAINTENANCE = "en maintenance"
    OFFLINE = "fermé"


class Property(Base):
    __tablename__ = "properties"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String)
    property_type = Column(
        SQLEnum(PropertyType, values_callable=lambda x: [e.value for e in x], name="propertytype"),
        nullable=False,
    )
    address = Column(String, nullable=False)
    city = Column(String, nullable=False)
    postal_code = Column(String)
    surface_area = Column(Float)  # m²
    rooms = Column(Integer)
    bedrooms = Column(Integer)
    bathrooms = Column(Integer)
    rent_amount = Column(Float, nullable=False)
    charges = Column(Float, default=0)
    deposit = Column(Float)
    application_fee = Column(Float, default=0)
    status = Column(
        SQLEnum(PropertyStatus, values_callable=lambda x: [e.value for e in x], name="propertystatus"),
        default=PropertyStatus.AVAILABLE,
    )
    available_date = Column(DateTime(timezone=True))
    images = Column(JSON)  # Array of image URLs
    amenities = Column(JSON)  # Array of amenities
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="properties")
    leases = relationship("Lease", back_populates="property", cascade="all, delete-orphan")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="property", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Property {self.title} ({self.status})>"
