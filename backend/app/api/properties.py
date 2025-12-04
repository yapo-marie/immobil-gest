from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.property import Property, PropertyStatus, PropertyType
from app.models.user import User
from app.schemas.property import PropertyCreate, PropertyUpdate, PropertyResponse
from app.utils.dependencies import get_current_landlord, get_current_user

router = APIRouter(prefix="/api/properties", tags=["Properties"])

@router.get("/", response_model=List[PropertyResponse])
def get_properties(
    skip: int = 0, 
    limit: int = 100, 
    city: Optional[str] = None,
    type: Optional[PropertyType] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Property).filter(Property.status != PropertyStatus.OFFLINE)
    
    if city:
        query = query.filter(Property.city.ilike(f"%{city}%"))
    if type:
        query = query.filter(Property.property_type == type)
    if min_price:
        query = query.filter(Property.rent_amount >= min_price)
    if max_price:
        query = query.filter(Property.rent_amount <= max_price)
        
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=PropertyResponse)
def create_property(
    property: PropertyCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord)
):
    new_property = Property(
        **property.model_dump(),
        owner_id=current_user.id
    )
    db.add(new_property)
    db.commit()
    db.refresh(new_property)
    return new_property

@router.get("/{property_id}", response_model=PropertyResponse)
def get_property(property_id: int, db: Session = Depends(get_db)):
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(status_code=404, detail="Property not found")
    return property

@router.put("/{property_id}", response_model=PropertyResponse)
def update_property(
    property_id: int, 
    property_update: PropertyUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord)
):
    db_property = db.query(Property).filter(Property.id == property_id).first()
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if db_property.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this property")
    
    update_data = property_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_property, key, value)
        
    db.commit()
    db.refresh(db_property)
    return db_property

@router.delete("/{property_id}")
def delete_property(
    property_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord)
):
    db_property = db.query(Property).filter(Property.id == property_id).first()
    if not db_property:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if db_property.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this property")
    
    # Soft delete by setting status to OFFLINE
    db_property.status = PropertyStatus.OFFLINE
    db.commit()
    return {"message": "Property archived successfully"}
