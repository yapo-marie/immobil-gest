import stripe
from fastapi import APIRouter, Request, HTTPException
from app.config import settings
from app.database import SessionLocal
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.models.notification import Notification, NotificationType
from app.models.lease import Lease
from app.models.property import Property
from app.models.tenant import Tenant
from app.models.user import User
from app.utils.email import send_email
from app.utils.receipt import generate_payment_receipt
from datetime import date

router = APIRouter(prefix="/api/stripe", tags=["Stripe"])

# Configure Stripe
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY


def _mark_payment_paid(db, payment: Payment, pi_id: str):
    """Met à jour un paiement, notifie le propriétaire et envoie un email."""
    if payment.status == PaymentStatus.PAID:
        return
    payment.status = PaymentStatus.PAID
    payment.payment_date = date.today()
    payment.payment_method = PaymentMethod.STRIPE
    payment.transaction_reference = pi_id

    lease = payment.lease
    prop = lease.property if lease else None
    owner: User | None = prop.owner if prop else None
    tenant: Tenant | None = lease.tenant if lease else None
    tenant_name = ""
    if tenant and tenant.user:
        tenant_name = f"{tenant.user.first_name} {tenant.user.last_name}"

    message = (
        f"Paiement #{payment.id} confirmé pour {prop.title if prop else 'un bien'} "
        f"({payment.amount:.0f} F CFA) par {tenant_name or 'locataire'}."
    )
    receipt_path = generate_payment_receipt(
        payment.id,
        payment.amount,
        tenant_name,
        prop.title if prop else "",
    )

    # Mail propriétaire
    if owner and owner.email:
        success, reason = send_email(
            owner.email,
            "Paiement locataire confirmé",
            f"{message}\nReçu : /{receipt_path}",
            html_content=f"<p>{message}</p><p><a href='/{receipt_path}'>Télécharger le reçu</a></p>",
        )
        if not success:
            print(f"[stripe_webhook] email propriétaire non envoyé: {reason}")
        notif = Notification(
            user_id=owner.id,
            type=NotificationType.PAYMENT_CONFIRMATION,
            title="Paiement reçu",
            message=message,
        )
        db.add(notif)

    # Mail locataire (si email dispo)
    if tenant and tenant.user and tenant.user.email:
        tenant_email = tenant.user.email
        success, reason = send_email(
            tenant_email,
            "Votre reçu de paiement",
            f"Bonjour {tenant_name},\nVotre paiement #{payment.id} pour {prop.title if prop else ''} est confirmé.\nReçu : /{receipt_path}",
            html_content=f"<p>Bonjour {tenant_name},</p><p>Votre paiement #{payment.id} pour <strong>{prop.title if prop else ''}</strong> est confirmé.</p><p><a href='/{receipt_path}'>Télécharger votre reçu</a></p>",
        )
        if not success:
            print(f"[stripe_webhook] email locataire non envoyé ({tenant_email}): {reason}")


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    def handle_payment_id(payment_id: str | None, pi_id: str | None, lease_id: str | None = None):
        if not payment_id and not lease_id:
            return
        db = SessionLocal()
        try:
            payment = None
            if payment_id:
                payment = (
                    db.query(Payment)
                    .join(Lease)
                    .join(Property)
                    .filter(Payment.id == int(payment_id))
                    .first()
                )
            # Fallback : prendre le premier paiement en attente pour ce bail
            if not payment and lease_id:
                payment = (
                    db.query(Payment)
                    .join(Lease)
                    .join(Property)
                    .filter(
                        Payment.lease_id == int(lease_id),
                        Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.LATE, PaymentStatus.PARTIAL]),
                    )
                    .order_by(Payment.due_date.asc())
                    .first()
                )

            if payment and pi_id:
                _mark_payment_paid(db, payment, pi_id)
                db.commit()
        finally:
            db.close()

    event_type = event["type"]

    if event_type == "payment_intent.succeeded":
        pi = event["data"]["object"]
        metadata = pi.get("metadata", {})
        payment_id = metadata.get("payment_id")
        lease_id = metadata.get("lease_id")
        handle_payment_id(payment_id, pi.get("id"), lease_id)

    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.get("metadata", {}) or {}
        payment_id = metadata.get("payment_id") or session.get("client_reference_id")
        pi_id = session.get("payment_intent")
        lease_id = metadata.get("lease_id")
        handle_payment_id(payment_id, pi_id, lease_id)

    return {"received": True}
