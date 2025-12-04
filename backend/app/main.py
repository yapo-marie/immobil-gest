from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from fastapi import UploadFile, File, HTTPException
import os
from fastapi.staticfiles import StaticFiles
import cloudinary
import cloudinary.uploader
import asyncio
from datetime import datetime, timedelta
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from app.database import SessionLocal
from app.models.payment import Payment, PaymentStatus
from app.models.lease import Lease
from app.models.property import Property, PropertyStatus
from app.models.tenant import Tenant
from app.models.user import User
from sqlalchemy import and_

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

app.include_router(auth.router)
app.include_router(properties.router)
app.include_router(tenants.router)
app.include_router(leases.router)
app.include_router(payments.router)
app.include_router(maintenance.router)
app.include_router(notifications.router)
app.include_router(reminders.router)
app.include_router(stripe_webhook.router)

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
async def upload_image(file: UploadFile = File(...)):
    # Si Cloudinary est configuré on l'utilise, sinon fallback local
    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
        try:
            upload_result = cloudinary.uploader.upload(
                await file.read(),
                folder="locatus"
            )
            return {"url": upload_result.get("secure_url")}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {e}")
    else:
        filename = file.filename
        path = os.path.join(UPLOAD_DIR, filename)
        with open(path, "wb") as buffer:
            buffer.write(await file.read())
        return {"url": f"/uploads/{filename}"}


# ===== Relances automatiques (paiements) =====
REMINDER_INTERVAL_HOURS = 30
REMINDER_MAX = 3
REMINDER_WINDOW_DAYS = 5  # paiements dont l'échéance est dans <= 5 jours ou déjà en retard


async def reminder_loop():
    """Boucle périodique pour envoyer des relances de paiement (SendGrid)."""
    if not settings.SENDGRID_API_KEY:
        return
    while True:
        try:
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
    if not to_email:
        return
    sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
    subject = f"Relance de paiement - {property_title}"
    content = f"""
Bonjour {first_name},

Une échéance de {payment.amount:.0f} F CFA est prévue le {payment.due_date}.
Bien : {property_title}
Statut actuel : {payment.status.value}

Merci de régulariser au plus vite si ce n'est pas déjà fait.
"""
    message = Mail(
        from_email=settings.FROM_EMAIL,
        to_emails=to_email,
        subject=subject,
        plain_text_content=content,
    )
    sg.send(message)


@app.on_event("startup")
async def startup_event():
    if settings.SENDGRID_API_KEY:
        asyncio.create_task(reminder_loop())
