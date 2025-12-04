from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.database import get_db
from app.models.lease import Lease, LeaseStatus
from app.models.property import Property, PropertyStatus
from app.models.user import User
from app.schemas.lease import LeaseCreate, LeaseUpdate, LeaseResponse
from app.utils.dependencies import get_current_landlord

router = APIRouter(prefix="/api/leases", tags=["Leases"])

@router.get("/", response_model=List[LeaseResponse])
def get_leases(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[LeaseStatus] = None,
    property_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord)
):
    query = db.query(Lease)
    
    # Filter by properties owned by current landlord
    query = query.join(Property).filter(Property.owner_id == current_user.id)
    
    if status:
        query = query.filter(Lease.status == status)
    if property_id:
        query = query.filter(Lease.property_id == property_id)
        
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=LeaseResponse)
def create_lease(
    lease: LeaseCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord)
):
    # Verify property ownership
    property = db.query(Property).filter(Property.id == lease.property_id).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    if property.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this property")
        
    # Check if property is available
    if property.status != PropertyStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Property is not available")
    
    new_lease = Lease(**lease.model_dump())
    db.add(new_lease)
    
    # Update property status
    property.status = PropertyStatus.OCCUPIED
    
    db.commit()
    db.refresh(new_lease)
    return new_lease

@router.get("/{lease_id}", response_model=LeaseResponse)
def get_lease(
    lease_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord)
):
    lease = db.query(Lease).join(Property).filter(
        Lease.id == lease_id,
        Property.owner_id == current_user.id
    ).first()
    
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    return lease

@router.post("/{lease_id}/terminate", response_model=LeaseResponse)
def terminate_lease(
    lease_id: int, 
    end_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord)
):
    lease = db.query(Lease).join(Property).filter(
        Lease.id == lease_id,
        Property.owner_id == current_user.id
    ).first()
    
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
        
    lease.status = LeaseStatus.TERMINATED
    lease.actual_end_date = end_date
    
    # Free up the property
    lease.property.status = PropertyStatus.AVAILABLE
    
    db.commit()
    db.refresh(lease)
    return lease
