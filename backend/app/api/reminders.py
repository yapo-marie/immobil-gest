from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.payment import Payment, PaymentStatus
from app.models.lease import Lease, LeaseStatus
from app.models.tenant import Tenant
from app.models.user import User
from app.models.property import Property
from app.utils.dependencies import get_current_landlord
from app.utils.email import send_email
from pydantic import BaseModel, Field
from app.config import settings
from app.utils.stripe_helper import create_checkout_session

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
        db.query(Payment, Lease, Property, Tenant, User)
        .join(Lease, Payment.lease_id == Lease.id)
        .join(Property, Lease.property_id == Property.id)
        .join(Tenant, Lease.tenant_id == Tenant.id)
        .join(User, Tenant.user_id == User.id)
        .filter(Property.owner_id == current_user.id)
    )

    if include_late:
        query = query.filter(Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.LATE, PaymentStatus.PARTIAL]))
    else:
        query = query.filter(Payment.status == PaymentStatus.PENDING)

    query = query.filter(Payment.due_date <= cutoff)

    results = []
    for payment, lease, prop, tenant, user in query.order_by(Payment.due_date.asc()).all():
        days_due = (payment.due_date - date.today()).days
        results.append(
            {
                "payment_id": payment.id,
                "lease_id": lease.id,
                "property_title": prop.title,
                "property_city": prop.city,
                "tenant_name": f"{user.first_name} {user.last_name}",
                "tenant_email": user.email,
                "amount": payment.amount,
                "due_date": payment.due_date,
                "status": payment.status.value,
                "days_until_due": days_due,
            }
        )
    return results


class LeaseReminderRequest(BaseModel):
    subject: str = Field(..., min_length=3, max_length=200)
    html_content: str
    plain_text_content: Optional[str] = None


@router.get("/leases", response_model=List[dict])
def get_lease_expiration_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord),
):
    """Retourne les baux classés par date de fin (proche → lointain) pour préparer les relances."""
    today = date.today()
    app_base = (settings.APP_URL or settings.FRONTEND_URL or "http://localhost:8080").rstrip("/")
    query = (
        db.query(Lease, Property, Tenant, User)
        .join(Property, Lease.property_id == Property.id)
        .join(Tenant, Lease.tenant_id == Tenant.id)
        .join(User, Tenant.user_id == User.id)
        .filter(
            Property.owner_id == current_user.id,
            Lease.status == LeaseStatus.ACTIVE,
            Lease.end_date.isnot(None),
        )
        .order_by(Lease.end_date.asc())
    )

    reminders = []
    for lease, prop, tenant, user in query.all():
        days_left = (lease.end_date - today).days if lease.end_date else None
        pay_url = f"{app_base}/payments"

        # Trouver un paiement en attente/retard pour ce bail afin de lier la session Stripe
        payment = (
            db.query(Payment)
            .filter(
                Payment.lease_id == lease.id,
                Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.LATE, PaymentStatus.PARTIAL]),
            )
            .order_by(Payment.due_date.asc())
            .first()
        )
        payment_id = payment.id if payment else None

        # Générer un lien Checkout Stripe (montant = loyer ou montant du paiement)
        checkout_url = create_checkout_session(
            amount=(payment.amount if payment else lease.rent_amount) or 0,
            currency="xaf",
            description=f"Loyer bail #{lease.id}",
            success_url=f"{app_base}/payment-success?lease_id={lease.id}&pid={payment_id or ''}",
            cancel_url=f"{app_base}/payment-cancel?lease_id={lease.id}&pid={payment_id or ''}",
            metadata={"lease_id": lease.id, "payment_id": payment_id} if payment_id else {"lease_id": lease.id},
        )
        if checkout_url:
            pay_url = checkout_url

        reminders.append(
            {
                "lease_id": lease.id,
                "tenant_id": tenant.id,
                "tenant_name": f"{user.first_name} {user.last_name}",
                "tenant_email": user.email,
                "property_id": prop.id,
                "property_title": prop.title,
                "property_city": prop.city,
                "start_date": lease.start_date,
                "end_date": lease.end_date,
                "status": lease.status.value,
                "days_until_end": days_left,
                "rent_amount": lease.rent_amount,
                "pay_url": pay_url,
            }
        )
    return reminders


@router.post("/leases/{lease_id}/send")
def send_lease_expiration_reminder(
    lease_id: int,
    payload: LeaseReminderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord),
):
    lease = (
        db.query(Lease, Property, Tenant, User)
        .join(Property, Lease.property_id == Property.id)
        .join(Tenant, Lease.tenant_id == Tenant.id)
        .join(User, Tenant.user_id == User.id)
        .filter(Property.owner_id == current_user.id, Lease.id == lease_id)
        .first()
    )
    if not lease:
        raise HTTPException(status_code=404, detail="Bail introuvable")

    lease_obj, prop, tenant, user = lease
    if not user.email:
        raise HTTPException(status_code=400, detail="Le locataire n'a pas d'email")

    subject = payload.subject
    html = payload.html_content
    plain = payload.plain_text_content or html

    success, reason = send_email(
        user.email,
        subject,
        plain,
        html_content=html,
    )
    if not success:
        raise HTTPException(status_code=502, detail=reason or "Envoi SendGrid refusé (clé ou configuration)")

    return {
        "message": "Relance envoyée",
        "sent_to": user.email,
        "lease_id": lease_obj.id,
    }
