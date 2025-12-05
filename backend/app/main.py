from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from fastapi import UploadFile, File, HTTPException
import os
from uuid import uuid4
from fastapi.staticfiles import StaticFiles
import cloudinary
import cloudinary.uploader
import asyncio
from datetime import datetime, timedelta
from app.utils.email import send_email
from app.database import SessionLocal
from app.models.payment import Payment, PaymentStatus
from app.models.lease import Lease
from app.models.property import Property, PropertyStatus
from app.models.tenant import Tenant
from app.models.user import User
from app.models.reminder_history import ReminderHistory
from sqlalchemy import and_
from app.utils.dependencies import get_current_user

app = FastAPI(
    title="LOCATUS API",
    description="API for LOCATUS Rental Management Platform",
    version="1.0.0",
    redirect_slashes=False,  # évite les redirections 307 qui suppriment l'en-tête Authorization côté navigateur
)

# CORS Configuration
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:8081",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import auth, properties, tenants, leases, payments, maintenance, notifications, reminders, stripe_webhook

api_prefix = "/api"

app.include_router(auth.router)
# Exposition principale sur /api/...
app.include_router(properties.router, prefix=api_prefix)
app.include_router(tenants.router, prefix=api_prefix)
app.include_router(leases.router, prefix=api_prefix)
app.include_router(payments.router)
app.include_router(maintenance.router)
app.include_router(notifications.router)
app.include_router(reminders.router)
app.include_router(stripe_webhook.router)
# Alias plats sans /api pour les appels directs depuis http://localhost:8080/tenants, /properties, /leases
app.include_router(properties.router, include_in_schema=False)
app.include_router(tenants.router, include_in_schema=False)
app.include_router(leases.router, include_in_schema=False)

@app.get("/")
async def root():
    return {
        "message": "Welcome to LOCATUS API",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Endpoint simple d'upload (stockage local ./uploads)
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
RECEIPTS_DIR = "receipts"
os.makedirs(RECEIPTS_DIR, exist_ok=True)
app.mount("/receipts", StaticFiles(directory=RECEIPTS_DIR), name="receipts")

# Configure Cloudinary (si clés disponibles)
if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )

@app.post("/api/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    # petite protection : uniquement images
    allowed_types = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Format de fichier non supporté")

    # on lit une fois le payload pour le réutiliser
    data = await file.read()

    # Si Cloudinary est configuré on l'utilise, sinon fallback local
    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
        try:
            upload_result = cloudinary.uploader.upload(
                data,
                folder="locatus"
            )
            return {"url": upload_result.get("secure_url")}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {e}")
    else:
        ext = os.path.splitext(file.filename or "")[1].lower()
        safe_name = f"{uuid4().hex}{ext if ext in ['.png', '.jpg', '.jpeg', '.webp'] else ''}"
        path = os.path.join(UPLOAD_DIR, safe_name)
        with open(path, "wb") as buffer:
            buffer.write(data)
        return {"url": f"/uploads/{safe_name}"}


# ===== Relances automatiques (paiements) =====
REMINDER_INTERVAL_HOURS = 30
REMINDER_MAX = 3
REMINDER_WINDOW_DAYS = 5  # paiements dont l'échéance est dans <= 5 jours ou déjà en retard
LAST_MONTHLY_REMINDER_RUN = None


async def reminder_loop():
    """Boucle périodique pour envoyer des relances de paiement (SendGrid)."""
    can_email = bool(settings.SMTP_HOST or settings.SENDGRID_API_KEY)
    if not can_email:
        return
    global LAST_MONTHLY_REMINDER_RUN
    while True:
        try:
            now = datetime.utcnow()
            # Relance élargie le 1er du mois (tous les paiements du mois en cours)
            if now.day == 1 and LAST_MONTHLY_REMINDER_RUN != now.date():
                send_monthly_first_day_reminders()
                LAST_MONTHLY_REMINDER_RUN = now.date()
            send_pending_reminders()
        except Exception as e:
            print(f"[reminders] error: {e}")
        await asyncio.sleep(3600)  # vérifie toutes les heures


def send_pending_reminders():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        cutoff = now + timedelta(days=REMINDER_WINDOW_DAYS)
        payments = (
            db.query(Payment, Lease, Property, Tenant, User)
            .join(Lease, Payment.lease_id == Lease.id)
            .join(Property, Lease.property_id == Property.id)
            .join(Tenant, Lease.tenant_id == Tenant.id)
            .join(User, Tenant.user_id == User.id)
            .filter(
                Property.status != PropertyStatus.OFFLINE,
                Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.LATE, PaymentStatus.PARTIAL]),
                Payment.due_date <= cutoff.date(),
                (Payment.reminder_count == None) | (Payment.reminder_count < REMINDER_MAX),
                (
                    (Payment.last_reminder_at == None)
                    | (Payment.last_reminder_at <= now - timedelta(hours=REMINDER_INTERVAL_HOURS))
                ),
            )
            .all()
        )

        for payment, lease, prop, tenant, user in payments:
            send_reminder_email(user.email, user.first_name, prop.title, payment)
            payment.reminder_count = (payment.reminder_count or 0) + 1
            payment.last_reminder_at = now
        db.commit()
    finally:
        db.close()


def send_reminder_email(to_email: str, first_name: str, property_title: str, payment: Payment):
    """Envoie une relance via SMTP (fallback SendGrid si configuré)."""
    if not to_email:
        return
    subject = f"Relance de paiement - {property_title}"
    pay_link = f"{settings.APP_URL.rstrip('/')}/payments" if settings.APP_URL else "http://localhost:8080/payments"
    content = f"""
Bonjour {first_name},

Une échéance de {payment.amount:.0f} F CFA est prévue le {payment.due_date}.
Bien : {property_title}
Statut actuel : {payment.status.value}

Payer en ligne (Stripe) : {pay_link}

Merci de régulariser au plus vite si ce n'est pas déjà fait.
"""
    send_email(
        to_email,
        subject,
        content,
        html_content=f"<p>Bonjour {first_name},</p><p>Votre échéance pour <strong>{property_title}</strong> est fixée au <strong>{payment.due_date}</strong> pour {payment.amount:.0f} F CFA.</p><p><a href='{pay_link}'>Payer en ligne</a></p><p>Merci de régulariser au plus vite.</p>",
    )

def send_monthly_first_day_reminders():
    """Le 1er du mois, envoie une relance pour tous les paiements du mois (Stripe par lien /payments)."""
    today = datetime.utcnow().date()
    first_day = today.replace(day=1)
    # Fin de mois : on ajoute un mois puis on retire un jour
    if first_day.month == 12:
        next_month = first_day.replace(year=first_day.year + 1, month=1, day=1)
    else:
        next_month = first_day.replace(month=first_day.month + 1, day=1)
    month_end = next_month - timedelta(days=1)

    db = SessionLocal()
    try:
        payments = (
            db.query(Payment, Lease, Property, Tenant, User)
            .join(Lease, Payment.lease_id == Lease.id)
            .join(Property, Lease.property_id == Property.id)
            .join(Tenant, Lease.tenant_id == Tenant.id)
            .join(User, Tenant.user_id == User.id)
            .filter(
                Property.status != PropertyStatus.OFFLINE,
                Payment.due_date >= first_day,
                Payment.due_date <= month_end,
                Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.LATE, PaymentStatus.PARTIAL]),
            )
            .all()
        )

        for payment, lease, prop, tenant, user in payments:
            key = f"reminder:{tenant.id}:{payment.due_date}:M1"
            already_sent = db.query(ReminderHistory).filter(ReminderHistory.key == key).first()
            if already_sent:
                continue

            try:
                send_reminder_email(user.email, user.first_name, prop.title, payment)
            except Exception as e:
                print(f"[reminders] monthly send failed for payment {payment.id}: {e}")
                continue

            payment.reminder_count = (payment.reminder_count or 0) + 1
            payment.last_reminder_at = datetime.utcnow()
            record = ReminderHistory(
                key=key,
                tenant_id=tenant.id,
                payment_id=payment.id,
                lease_id=lease.id,
                due_date=payment.due_date,
                step="M1",
                meta={"reason": "first_day_batch"},
            )
            db.add(record)

        db.commit()
    finally:
        db.close()


@app.on_event("startup")
async def startup_event():
    if settings.SENDGRID_API_KEY:
        asyncio.create_task(reminder_loop())
