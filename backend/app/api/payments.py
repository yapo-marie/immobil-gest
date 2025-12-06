from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from app.database import get_db
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.models.lease import Lease
from app.models.property import Property
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentUpdate, PaymentResponse
from app.utils.dependencies import get_current_landlord
from app.models.notification import Notification, NotificationType
from app.config import settings
import stripe
from app.utils.email import send_email
from app.utils.stripe_helper import create_checkout_session, to_stripe_amount, ZERO_DECIMAL_CURRENCIES
from app.utils.receipt import generate_payment_receipt, generate_due_notice
from app.models.tenant import Tenant
from pydantic import BaseModel

router = APIRouter(prefix="/api/payments", tags=["Payments"])

# Configure Stripe si clé dispo
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY


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


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord),
):
    payment = (
        db.query(Payment)
        .join(Lease)
        .join(Property)
        .filter(Payment.id == payment_id, Property.owner_id == current_user.id)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


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

    client_secret = None
    # Si Stripe est configuré, préparer un PaymentIntent (optionnel, front peut l'utiliser)
    if settings.STRIPE_SECRET_KEY:
        stripe_amount = to_stripe_amount(payment.amount, "xaf")
        if stripe_amount is None:
            print(f"[stripe] montant PI invalide pour paiement {new_payment.id} ({payment.amount} XAF)")
        else:
            intent = stripe.PaymentIntent.create(
                amount=stripe_amount,
                currency="xaf",
                metadata={"payment_id": new_payment.id},
                description=f"Loyer bail #{payment.lease_id}",
                automatic_payment_methods={"enabled": True},
            )
            new_payment.transaction_reference = intent.id
            client_secret = intent.client_secret
            db.commit()
            db.refresh(new_payment)

    # Inject client_secret pour la réponse (pas stocké en base)
    result = PaymentResponse.model_validate(new_payment)
    result.client_secret = client_secret
    return result


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
        # Génère une quittance simple et envoie un mail
        tenant = db.query(Tenant).join(Lease).filter(Lease.id == db_payment.lease_id, Tenant.id == Lease.tenant_id).first()
        tenant_name = ""
        tenant_email = ""
        if tenant and tenant.user:
            tenant_name = f"{tenant.user.first_name} {tenant.user.last_name}"
            tenant_email = tenant.user.email
        prop = db_payment.lease.property
        receipt_path = generate_payment_receipt(db_payment.id, db_payment.amount, tenant_name, prop.title if prop else "")
        db_payment.receipt_url = f"/{receipt_path}"
        send_email(
            tenant_email,
            "Quittance de paiement",
            f"Bonjour {tenant_name},\nVotre paiement #{db_payment.id} de {db_payment.amount:.0f} F CFA a été enregistré.\nQuittance: {db_payment.receipt_url}"
        )

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
    return PaymentResponse.model_validate(db_payment)


@router.post("/{payment_id}/intent")
def create_or_get_intent(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord),
):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=400, detail="Stripe non configuré")

    payment = (
        db.query(Payment)
        .join(Lease)
        .join(Property)
        .filter(Payment.id == payment_id, Property.owner_id == current_user.id)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable")

    # Si déjà lié à un PaymentIntent, on le récupère
    client_secret = None
    if payment.transaction_reference:
        try:
            intent = stripe.PaymentIntent.retrieve(payment.transaction_reference)
            client_secret = intent.client_secret
        except Exception:
            client_secret = None

    if not client_secret:
        stripe_amount = to_stripe_amount(payment.amount, "xaf")
        if stripe_amount is None:
            raise HTTPException(status_code=400, detail="Montant Stripe invalide pour ce paiement")
        intent = stripe.PaymentIntent.create(
            amount=stripe_amount,
            currency="xaf",
            metadata={"payment_id": payment.id},
            description=f"Loyer bail #{payment.lease_id}",
            automatic_payment_methods={"enabled": True},
        )
        payment.transaction_reference = intent.id
        client_secret = intent.client_secret
        db.commit()
        db.refresh(payment)

    response = PaymentResponse.model_validate(payment)
    response.client_secret = client_secret
    return response


@router.post("/{payment_id}/checkout-session")
def create_checkout_link(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord),
):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=400, detail="Stripe non configuré")

    payment = (
        db.query(Payment)
        .join(Lease)
        .join(Property)
        .filter(Payment.id == payment_id, Property.owner_id == current_user.id)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable")

    app_base = settings.APP_URL or settings.FRONTEND_URL or "http://localhost:8080"
    success_url = f"{app_base.rstrip('/')}/payment-success?pid={payment.id}&cs_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{app_base.rstrip('/')}/payment-cancel?pid={payment.id}"

    checkout_url = create_checkout_session(
        amount=payment.amount,
        currency="xaf",
        description=f"Loyer bail #{payment.lease_id}",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"payment_id": payment.id, "lease_id": payment.lease_id},
    )
    if not checkout_url:
        raise HTTPException(status_code=502, detail="Impossible de créer la session Stripe")

    return {"url": checkout_url}


@router.post("/{payment_id}/notice")
def send_due_notice(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_landlord),
):
    payment = (
        db.query(Payment)
        .join(Lease)
        .join(Property)
        .filter(Payment.id == payment_id, Property.owner_id == current_user.id)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable")

    tenant = (
        db.query(Tenant)
        .join(Lease)
        .filter(Lease.id == payment.lease_id, Tenant.id == Lease.tenant_id)
        .first()
    )
    tenant_name = ""
    tenant_email = ""
    if tenant and tenant.user:
        tenant_name = f"{tenant.user.first_name} {tenant.user.last_name}"
        tenant_email = tenant.user.email

    property_title = payment.lease.property.title if payment.lease and payment.lease.property else ""
    notice_path = generate_due_notice(
        payment.id,
        payment.amount,
        payment.due_date,
        tenant_name,
        property_title,
    )
    app_base = settings.APP_URL or settings.FRONTEND_URL or "http://localhost:8080"
    success_url = f"{app_base.rstrip('/')}/payments?status=success&pid={payment.id}&cs_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{app_base.rstrip('/')}/payments?status=cancel&pid={payment.id}"
    checkout_url = create_checkout_session(
        amount=payment.amount,
        currency="xaf",
        description=f"Loyer bail #{payment.lease_id}",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"payment_id": payment.id, "lease_id": payment.lease_id},
    )
    pay_line = f"\nPayer en ligne (Stripe) : {checkout_url}" if checkout_url else ""

    send_email(
        tenant_email,
        "Avis d'échéance de loyer",
        f"Bonjour {tenant_name},\nVotre loyer de {payment.amount:.0f} F CFA pour {property_title} est dû le {payment.due_date}.{pay_line}\nAvis: /{notice_path}",
    )
    return {"notice_url": f"/{notice_path}"}


class PaymentConfirmRequest(BaseModel):
    checkout_session_id: str
    payment_id: int | None = None
    lease_id: int | None = None


def _send_receipt_to_tenant(db: Session, payment: Payment) -> None:
    """Génère la quittance PDF et l'envoie au locataire par email."""
    lease = payment.lease
    tenant = lease.tenant if lease else None
    user = tenant.user if tenant else None
    prop = lease.property if lease else None

    tenant_name = ""
    tenant_email = ""
    if user:
        tenant_name = f"{user.first_name} {user.last_name}"
        tenant_email = user.email or ""

    if not tenant_email:
        return

    receipt_path = generate_payment_receipt(
        payment.id,
        payment.amount,
        tenant_name,
        prop.title if prop else "",
    )
    payment.receipt_url = f"/{receipt_path}"
    db.commit()
    db.refresh(payment)

    send_email(
        tenant_email,
        "Votre reçu de paiement",
        f"Bonjour {tenant_name},\nVotre paiement #{payment.id} a été enregistré.\nReçu : {payment.receipt_url}",
        html_content=f"<p>Bonjour {tenant_name},</p><p>Votre paiement #{payment.id} pour <strong>{prop.title if prop else ''}</strong> a été enregistré.</p><p><a href='{payment.receipt_url}'>Télécharger votre reçu</a></p>",
    )


@router.post("/confirm")
def confirm_payment_from_success(
    payload: PaymentConfirmRequest,
    db: Session = Depends(get_db),
):
    """
    Endpoint appelé par la page de succès pour marquer le paiement comme réglé
    en vérifiant la session Stripe (sécurisé par checkout_session_id).
    """
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=400, detail="Stripe non configuré")
    if not payload.checkout_session_id:
        raise HTTPException(status_code=400, detail="checkout_session_id requis")

    try:
        session = stripe.checkout.Session.retrieve(payload.checkout_session_id, expand=["payment_intent"])
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Session Stripe introuvable : {exc}")

    pi = getattr(session, "payment_intent", None)
    pi_status = getattr(pi, "status", None)
    session_paid = getattr(session, "payment_status", None) == "paid" or getattr(session, "status", None) == "complete"
    if not session_paid and pi_status not in ("succeeded", "processing", "requires_capture"):
        raise HTTPException(status_code=400, detail="Paiement non confirmé par Stripe")

    metadata = getattr(pi, "metadata", {}) or {}
    session_meta = getattr(session, "metadata", {}) or {}
    payment_id = payload.payment_id or metadata.get("payment_id") or session_meta.get("payment_id") or session.client_reference_id
    lease_id = payload.lease_id or metadata.get("lease_id") or session_meta.get("lease_id")

    payment = None
    updated = False
    created_new = False
    if payment_id:
        payment = (
            db.query(Payment)
            .filter(Payment.id == int(payment_id))
            .first()
        )
    if not payment and lease_id:
        payment = (
            db.query(Payment)
            .filter(
                Payment.lease_id == int(lease_id),
                Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.LATE, PaymentStatus.PARTIAL]),
            )
            .order_by(Payment.due_date.asc())
            .first()
        )
    if not payment:
        # Créer un paiement si absent (ex: session générée sans payment_id)
        if not lease_id:
            raise HTTPException(status_code=404, detail="Paiement introuvable")
        lease = db.query(Lease).filter(Lease.id == int(lease_id)).first()
        if not lease:
            raise HTTPException(status_code=404, detail="Paiement introuvable")

        total = getattr(session, "amount_total", None) or 0
        currency = (getattr(session, "currency", None) or "xaf").lower()
        divisor = 1 if currency in ZERO_DECIMAL_CURRENCIES else 100
        amount = float(total) / divisor

        payment = Payment(
            lease_id=lease.id,
            amount=amount,
            due_date=date.today(),
            status=PaymentStatus.PAID,
            payment_method=PaymentMethod.STRIPE,
            payment_date=date.today(),
            transaction_reference=getattr(pi, "id", None) or session.payment_intent,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        updated = True
        created_new = True

    if payment.status != PaymentStatus.PAID:
        payment.status = PaymentStatus.PAID
        payment.payment_method = PaymentMethod.STRIPE
        payment.payment_date = date.today()
        payment.transaction_reference = getattr(pi, "id", None) or session.payment_intent
        updated = True
        db.commit()
        db.refresh(payment)

    # Générer et envoyer la quittance uniquement lorsqu'on a réellement validé/créé le paiement
    if updated or created_new:
        try:
            _send_receipt_to_tenant(db, payment)
        except Exception as exc:
            # on loggue mais on ne bloque pas la réponse
            print(f"[payments.confirm] envoi reçu locataire échoué: {exc}")

    return {
        "payment_id": payment.id,
        "status": payment.status.value,
        "updated": updated,
    }
