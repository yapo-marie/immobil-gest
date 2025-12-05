from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.lease import Lease, LeaseStatus
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantDetailResponse, TenantCreateWithUser
from app.utils.dependencies import get_current_landlord
from app.utils.security import get_password_hash

# Prefix sans /api pour pouvoir exposer les routes aussi bien sur /api/tenants que /tenants
router = APIRouter(prefix="/tenants", tags=["Tenants"])

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

@router.post("/with-user", response_model=TenantDetailResponse)
def create_tenant_with_user(
    payload: TenantCreateWithUser,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord)
):
    # Check email uniqueness
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        role=payload.role or "tenant",
    )
    db.add(user)
    db.flush()  # obtain user.id

    new_tenant = Tenant(
        user_id=user.id,
        date_of_birth=payload.date_of_birth,
        employment_info=payload.employment_info,
        notes=payload.notes,
        identity_documents=payload.identity_documents,
        income_proof=payload.income_proof,
        references=payload.references,
    )
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

    # Handle user updates (email, names, phone, password)
    if tenant_update.email:
        existing_user = (
            db.query(User)
            .filter(User.email == tenant_update.email, User.id != db_tenant.user_id)
            .first()
        )
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

    for field in ["email", "first_name", "last_name", "phone"]:
        value = getattr(tenant_update, field)
        if value is not None:
            setattr(db_tenant.user, field, value)

    if tenant_update.password:
        db_tenant.user.hashed_password = get_password_hash(tenant_update.password)

    # Update tenant-specific fields
    update_data = tenant_update.model_dump(
        exclude_unset=True,
        exclude={"email", "first_name", "last_name", "phone", "password"},
    )
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

    # Delete both tenant profile and its user account (to free the email)
    # Keep landlords/admins safe by only removing tenant-role users.
    if tenant.user and tenant.user.role == UserRole.TENANT:
        db.delete(tenant.user)
    else:
        db.delete(tenant)
    db.commit()
    
    return {"message": "Tenant profile and user deleted successfully"}
