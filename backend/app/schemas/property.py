from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.property import PropertyType, PropertyStatus


class PropertyBase(BaseModel):
    title: str
    description: Optional[str] = None
    property_type: PropertyType
    address: str
    city: str
    postal_code: Optional[str] = None
    surface_area: Optional[float] = None
    rooms: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    rent_amount: float
    charges: Optional[float] = 0
    deposit: Optional[float] = None
    application_fee: Optional[float] = 0
    status: PropertyStatus = PropertyStatus.AVAILABLE
    available_date: Optional[datetime] = None
    images: Optional[List[str]] = []
    amenities: Optional[List[str]] = []


class PropertyCreate(PropertyBase):
    pass


class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    property_type: Optional[PropertyType] = None
    address: Optional[str] = None
    city: Optional[str] = None
    rent_amount: Optional[float] = None
    status: Optional[PropertyStatus] = None
    images: Optional[List[str]] = None


class PropertyResponse(PropertyBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
