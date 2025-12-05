from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.models.payment import Payment, PaymentStatus
from app.models.lease import Lease
from app.models.tenant import Tenant
from app.models.property import Property, PropertyStatus
from app.models.user import User
from app.models.reminder_history import ReminderHistory
from app.utils.email import send_email


ReminderStep = str  # "J-2" | "J-1" | "J0" | "J+1"


@dataclass
class PaymentReminderCandidate:
    payment_id: int
    lease_id: int
    tenant_id: int
    tenant_email: str
    tenant_name: str
    property_title: str
    property_city: str
    due_date: date
    amount: float
    owner_id: int
    status: PaymentStatus


def build_reminder_key(tenant_id: int, due_date: date, step: ReminderStep) -> str:
    return f"reminder:{tenant_id}:{due_date.isoformat()}:{step}"


def _get_timezone() -> ZoneInfo:
    try:
        return ZoneInfo(settings.TIMEZONE or "UTC")
    except Exception:
        logging.warning("Invalid TIMEZONE setting, falling back to UTC")
        return ZoneInfo("UTC")


def get_due_for_today_step(today: date, db: Session) -> List[Tuple[PaymentReminderCandidate, ReminderStep]]:
    """
    Retourne les paiements concernés par un envoi aujourd'hui (J-2/J-1/J0/J+1).
    """
    candidates: List[Tuple[PaymentReminderCandidate, ReminderStep]] = []
    payments = (
        db.query(Payment, Lease, Tenant, User, Property)
        .join(Lease, Payment.lease_id == Lease.id)
        .join(Tenant, Lease.tenant_id == Tenant.id)
        .join(User, Tenant.user_id == User.id)
        .join(Property, Lease.property_id == Property.id)
        .filter(Property.status != PropertyStatus.OFFLINE)
        .all()
    )

    for payment, lease, tenant, user, prop in payments:
        if not payment.due_date:
            continue
        delta = (payment.due_date - today).days
        step: Optional[ReminderStep] = None
        if delta == 2:
            step = "J-2"
        elif delta == 1:
            step = "J-1"
        elif delta == 0:
            step = "J0"
        elif delta == -1:
            step = "J+1"
        else:
            continue

        candidates.append(
            (
                PaymentReminderCandidate(
                    payment_id=payment.id,
                    lease_id=lease.id,
                    tenant_id=tenant.id,
                    tenant_email=user.email or "",
                    tenant_name=f"{user.first_name} {user.last_name}",
                    property_title=prop.title,
                    property_city=prop.city,
                    due_date=payment.due_date,
                    amount=payment.amount,
                    owner_id=prop.owner_id,
                    status=payment.status,
                ),
                step,
            )
        )
    return candidates


def is_paid(candidate: PaymentReminderCandidate, db: Session) -> bool:
    """
    Vérifie si le paiement est déjà réglé (statut payé ou payment_date renseignée).
    """
    payment = db.query(Payment).filter(Payment.id == candidate.payment_id).first()
    if not payment:
        return False
    status_value = getattr(payment.status, "value", payment.status)
    status_str = str(status_value).lower() if status_value is not None else ""
    if status_str == PaymentStatus.PAID.value:
        return True
    if payment.payment_date:
        return True
    return False


def already_sent(candidate: PaymentReminderCandidate, step: ReminderStep, db: Session) -> bool:
    key = build_reminder_key(candidate.tenant_id, candidate.due_date, step)
    existing = db.query(ReminderHistory).filter(ReminderHistory.key == key).first()
    return existing is not None


def mark_sent(candidate: PaymentReminderCandidate, step: ReminderStep, db: Session, meta: Optional[Dict[str, Any]] = None) -> None:
    key = build_reminder_key(candidate.tenant_id, candidate.due_date, step)
    record = ReminderHistory(
        key=key,
        tenant_id=candidate.tenant_id,
        payment_id=candidate.payment_id,
        lease_id=candidate.lease_id,
        due_date=candidate.due_date,
        step=step,
        meta=meta or {},
    )
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()


def _render_email(candidate: PaymentReminderCandidate, step: ReminderStep) -> Tuple[str, str, str]:
    due_str = candidate.due_date.strftime("%d/%m/%Y")
    base_url = getattr(settings, "APP_URL", None) or getattr(settings, "FRONTEND_URL", "http://localhost:8080")
    pay_url = f"{base_url.rstrip('/')}/payments"
    subject = f"Rappel de paiement – échéance {due_str}"
    html = f"""
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <p>Bonjour {candidate.tenant_name},</p>
      <p>Votre loyer pour <strong>{candidate.property_title}</strong> ({candidate.property_city}) est dû le <strong>{due_str}</strong>.</p>
      <p>Montant attendu : <strong>{candidate.amount:,.0f} F CFA</strong>.</p>
      <p>Merci de régler au plus vite. Si le paiement a déjà été effectué, vous pouvez ignorer ce message.</p>
      <p style="margin-top: 20px;">
        <a href="{pay_url}" style="background:#0f172a;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:600;">Payer maintenant</a>
      </p>
      <p style="font-size: 12px; color:#64748b; margin-top: 24px;">Relance automatique ({step}).</p>
    </div>
    """
    plain = (
        f"Bonjour {candidate.tenant_name},\n"
        f"Votre loyer pour {candidate.property_title} ({candidate.property_city}) est dû le {due_str}.\n"
        f"Montant attendu : {candidate.amount:,.0f} F CFA.\n"
        f"Payer maintenant : {pay_url}\n"
        f"Relance automatique ({step})."
    )
    return subject, plain, html


def send_one(candidate: PaymentReminderCandidate, step: ReminderStep) -> Tuple[bool, Optional[str], Optional[str]]:
    subject, plain, html = _render_email(candidate, step)
    success, reason = send_email(candidate.tenant_email, subject, plain, html_content=html)
    return success, reason, subject


def run_scheduled(db: Session, today: Optional[date] = None) -> Dict[str, Any]:
    tz = _get_timezone()
    current_date = today or datetime.now(tz).date()

    report = {
        "date": current_date.isoformat(),
        "count": 0,
        "sent": 0,
        "skipped_paid": 0,
        "skipped_duplicate": 0,
        "errors": [],
        "log": [],
    }

    candidates = get_due_for_today_step(current_date, db)
    report["count"] = len(candidates)

    for candidate, step in candidates:
        status_str = str(getattr(candidate.status, "value", candidate.status)).lower() if candidate.status else ""

        if is_paid(candidate, db):
            report["skipped_paid"] += 1
            report["log"].append({"payment_id": candidate.payment_id, "step": step, "status": "paid"})
            continue

        if step == "J+1" and status_str == PaymentStatus.PAID.value:
            report["skipped_paid"] += 1
            report["log"].append({"payment_id": candidate.payment_id, "step": step, "status": "paid"})
            continue

        if already_sent(candidate, step, db):
            report["skipped_duplicate"] += 1
            report["log"].append({"payment_id": candidate.payment_id, "step": step, "status": "duplicate"})
            continue

        success, reason, subject = send_one(candidate, step)
        if success:
            mark_sent(
                candidate,
                step,
                db,
                meta={
                    "subject": subject,
                    "payment_id": candidate.payment_id,
                    "lease_id": candidate.lease_id,
                    "step": step,
                },
            )
            report["sent"] += 1
            report["log"].append({"payment_id": candidate.payment_id, "step": step, "status": "sent"})
        else:
            msg = reason or "unknown error"
            logging.error(f"[reminders] send failed for payment {candidate.payment_id}: {msg}")
            report["errors"].append({"payment_id": candidate.payment_id, "step": step, "reason": msg})

    return report
