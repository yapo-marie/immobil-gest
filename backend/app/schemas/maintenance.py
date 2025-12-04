from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.maintenance import (
    MaintenanceType,
    MaintenanceStatus,
    MaintenancePriority,
)


class MaintenanceBase(BaseModel):
    property_id: int
    tenant_id: int
    type: MaintenanceType
    description: str
    status: MaintenanceStatus = MaintenanceStatus.PENDING
    priority: MaintenancePriority = MaintenancePriority.MEDIUM
    images: Optional[List[str]] = []
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None


class MaintenanceCreate(MaintenanceBase):
    pass


class MaintenanceUpdate(BaseModel):
    status: Optional[MaintenanceStatus] = None
    priority: Optional[MaintenancePriority] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    description: Optional[str] = None
    images: Optional[List[str]] = None


class MaintenanceResponse(MaintenanceBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
