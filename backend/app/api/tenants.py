from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.models.lease import Lease, LeaseStatus
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantDetailResponse
from app.utils.dependencies import get_current_landlord

router = APIRouter(prefix="/api/tenants", tags=["Tenants"])

@router.get("/", response_model=List[TenantDetailResponse])
def get_tenants(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord)
):
    query = db.query(Tenant)
    # Join with User to search by name/email if needed
    if search:
        query = query.join(User).filter(
            (User.first_name.ilike(f"%{search}%")) | 
            (User.last_name.ilike(f"%{search}%")) | 
            (User.email.ilike(f"%{search}%"))
        )
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=TenantDetailResponse)
def create_tenant(
    tenant: TenantCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord)
):
    # Check if user exists
    user = db.query(User).filter(User.id == tenant.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check if tenant profile already exists
    existing_tenant = db.query(Tenant).filter(Tenant.user_id == tenant.user_id).first()
    if existing_tenant:
        raise HTTPException(status_code=400, detail="Tenant profile already exists for this user")
    
    new_tenant = Tenant(**tenant.model_dump())
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    return new_tenant

@router.get("/{tenant_id}", response_model=TenantDetailResponse)
def get_tenant(
    tenant_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord)
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

@router.put("/{tenant_id}", response_model=TenantDetailResponse)
def update_tenant(
    tenant_id: int, 
    tenant_update: TenantUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord)
):
    db_tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not db_tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    update_data = tenant_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_tenant, key, value)
        
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

@router.delete("/{tenant_id}")
def delete_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord)
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Check for active leases
    active_leases = db.query(Lease).filter(
        Lease.tenant_id == tenant_id,
        Lease.status == LeaseStatus.ACTIVE
    ).first()
    
    if active_leases:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete tenant with active leases. Terminate lease first."
        )
    
    # Delete the tenant profile
    # Note: The associated User account remains, only the tenant profile is deleted
    db.delete(tenant)
    db.commit()
    
    return {"message": "Tenant profile deleted successfully"}
