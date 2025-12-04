from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.payment import Payment, PaymentStatus
from app.models.lease import Lease
from app.models.property import Property
from app.models.user import User
from app.utils.dependencies import get_current_landlord

router = APIRouter(prefix="/api/reminders", tags=["Reminders"])


@router.get("/", response_model=List[dict])
def get_payment_reminders(
    due_within_days: int = 30,
    include_late: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord),
):
    """Retourne les paiements en attente/retard pour alimenter la page de relance."""
    cutoff = date.today() + timedelta(days=due_within_days)

    query = (
        db.query(Payment, Lease, Property)
        .join(Lease, Payment.lease_id == Lease.id)
        .join(Property, Lease.property_id == Property.id)
        .filter(Property.owner_id == current_user.id)
    )

    if include_late:
        query = query.filter(Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.LATE, PaymentStatus.PARTIAL]))
    else:
        query = query.filter(Payment.status == PaymentStatus.PENDING)

    query = query.filter(Payment.due_date <= cutoff)

    results = []
    for payment, lease, prop in query.order_by(Payment.due_date.asc()).all():
        days_due = (payment.due_date - date.today()).days
        results.append(
            {
                "payment_id": payment.id,
                "lease_id": lease.id,
                "property_title": prop.title,
                "property_city": prop.city,
                "amount": payment.amount,
                "due_date": payment.due_date,
                "status": payment.status.value,
                "days_until_due": days_due,
            }
        )
    return results
