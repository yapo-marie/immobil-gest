from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.maintenance import MaintenanceRequest
from app.models.property import Property
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate, MaintenanceResponse
from app.utils.dependencies import get_current_landlord
from app.models.notification import Notification, NotificationType

router = APIRouter(prefix="/api/maintenance", tags=["Maintenance"])


@router.get("/", response_model=List[MaintenanceResponse])
def list_requests(
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord),
):
    return (
        db.query(MaintenanceRequest)
        .join(Property)
        .filter(Property.owner_id == current_user.id)
        .order_by(MaintenanceRequest.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/", response_model=MaintenanceResponse)
def create_request(
    request: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord),
):
    property_obj = db.query(Property).filter(Property.id == request.property_id).first()
    if not property_obj or property_obj.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Property not found for this landlord")

    tenant = db.query(Tenant).filter(Tenant.id == request.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    new_request = MaintenanceRequest(**request.model_dump())
    db.add(new_request)
    db.flush()

    db.add(
        Notification(
            user_id=current_user.id,
            type=NotificationType.MAINTENANCE_UPDATE,
            title="Nouvelle demande",
            message=f"Demande #{new_request.id} créée.",
        )
    )
    db.commit()
    db.refresh(new_request)
    return new_request


@router.put("/{request_id}", response_model=MaintenanceResponse)
def update_request(
    request_id: int,
    request_update: MaintenanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord),
):
    db_request = (
        db.query(MaintenanceRequest)
        .join(Property)
        .filter(MaintenanceRequest.id == request_id, Property.owner_id == current_user.id)
        .first()
    )

    if not db_request:
        raise HTTPException(status_code=404, detail="Maintenance request not found")

    update_data = request_update.model_dump(exclude_unset=True)
    previous_status = db_request.status
    for key, value in update_data.items():
        setattr(db_request, key, value)

    if previous_status != db_request.status:
        db.add(
            Notification(
                user_id=current_user.id,
                type=NotificationType.MAINTENANCE_UPDATE,
                title="Mise à jour maintenance",
                message=f"Demande #{db_request.id} -> {db_request.status.value}",
            )
        )

    db.commit()
    db.refresh(db_request)
    return db_request
