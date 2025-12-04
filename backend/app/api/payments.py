from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.database import get_db
from app.models.payment import Payment, PaymentStatus
from app.models.lease import Lease
from app.models.property import Property
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentUpdate, PaymentResponse
from app.utils.dependencies import get_current_landlord
from app.models.notification import Notification, NotificationType

router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.get("/", response_model=List[PaymentResponse])
def list_payments(
    skip: int = 0,
    limit: int = 200,
    status: Optional[PaymentStatus] = None,
    due_before: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord),
):
    query = (
        db.query(Payment)
        .join(Lease)
        .join(Property)
        .filter(Property.owner_id == current_user.id)
    )

    if status:
        query = query.filter(Payment.status == status)
    if due_before:
        query = query.filter(Payment.due_date <= due_before)

    return query.order_by(Payment.due_date.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=PaymentResponse)
def create_payment(
    payment: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord),
):
    lease = db.query(Lease).join(Property).filter(
        Lease.id == payment.lease_id,
        Property.owner_id == current_user.id,
    ).first()

    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found for this landlord")

    new_payment = Payment(**payment.model_dump())
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    return new_payment


@router.put("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: int,
    payment_update: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord),
):
    db_payment = (
        db.query(Payment)
        .join(Lease)
        .join(Property)
        .filter(Payment.id == payment_id, Property.owner_id == current_user.id)
        .first()
    )

    if not db_payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    update_data = payment_update.model_dump(exclude_unset=True)
    previous_status = db_payment.status

    for key, value in update_data.items():
        setattr(db_payment, key, value)

    # Si un paiement passe en payé, ajouter une notification
    if previous_status != PaymentStatus.PAID and db_payment.status == PaymentStatus.PAID:
        notification = Notification(
            user_id=current_user.id,
            type=NotificationType.PAYMENT_CONFIRMATION,
            title="Paiement reçu",
            message=f"Paiement #{db_payment.id} enregistré.",
        )
        db.add(notification)

    if db_payment.status == PaymentStatus.LATE and previous_status != PaymentStatus.LATE:
        notification = Notification(
            user_id=current_user.id,
            type=NotificationType.PAYMENT_LATE,
            title="Paiement en retard",
            message=f"Paiement #{db_payment.id} est en retard.",
        )
        db.add(notification)

    db.commit()
    db.refresh(db_payment)
    return db_payment
