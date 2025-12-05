from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, Any, List, Optional
from zoneinfo import ZoneInfo
import calendar

from sqlalchemy.orm import Session

from app.models.lease import Lease, LeaseStatus
from app.models.payment import Payment, PaymentStatus
from app.models.property import Property, PropertyStatus
from app.config import settings


def _tz_today() -> date:
    try:
        tz = ZoneInfo(settings.TIMEZONE or "UTC")
    except Exception:
        tz = ZoneInfo("UTC")
    return datetime.now(tz).date()


def _add_months(dt: date, months: int) -> date:
    month = dt.month - 1 + months
    year = dt.year + month // 12
    month = month % 12 + 1
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _first_due_date(start_date: date, payment_day: int) -> date:
    target_day = max(1, min(28, payment_day or 1))
    try:
        first = start_date.replace(day=target_day)
    except ValueError:
        first = start_date

    if first < start_date or first.day != target_day:
        first = _add_months(start_date.replace(day=1), 1).replace(day=target_day)
    return first


def _ensure_payment(
    db: Session,
    lease: Lease,
    due_date: date,
    amount: float,
) -> bool:
    """Create payment if missing. Returns True if created."""
    exists = (
        db.query(Payment)
        .filter(
            Payment.lease_id == lease.id,
            Payment.due_date == due_date,
        )
        .first()
    )
    if exists:
        return False

    payment = Payment(
        lease_id=lease.id,
        amount=amount,
        due_date=due_date,
        status=PaymentStatus.PENDING,
    )
    db.add(payment)
    return True


def generate_monthly_payments(
    db: Session,
    today: Optional[date] = None,
    horizon_days: int = 40,
) -> Dict[str, Any]:
    """
    Pour chaque bail actif, crée la prochaine échéance mensuelle (idempotent par bail+due_date).
    """
    current = today or _tz_today()
    horizon = current + timedelta(days=horizon_days)

    leases: List[Lease] = (
        db.query(Lease)
        .join(Property)
        .filter(
            Lease.status == LeaseStatus.ACTIVE,
            Property.status != PropertyStatus.OFFLINE,
        )
        .all()
    )

    report = {"count": len(leases), "created": 0, "skipped": 0, "log": []}

    for lease in leases:
        # Si un paiement est déjà planifié dans la fenêtre, on n'ajoute rien pour ce bail
        existing_upcoming = (
            db.query(Payment)
            .filter(
                Payment.lease_id == lease.id,
                Payment.due_date >= current,
                Payment.due_date <= horizon,
            )
            .order_by(Payment.due_date.asc())
            .first()
        )
        if existing_upcoming:
            report["skipped"] += 1
            report["log"].append(
                {"lease_id": lease.id, "due_date": existing_upcoming.due_date.isoformat(), "status": "already_planned"}
            )
            continue

        # Vérifier dates de validité du bail
        if lease.start_date and lease.start_date > horizon:
            report["skipped"] += 1
            continue
        if lease.end_date and lease.end_date < current:
            report["skipped"] += 1
            continue

        next_due = lease.next_due_date or _first_due_date(lease.start_date, lease.payment_day or 1)
        # Avancer jusqu'à être dans la fenêtre
        while next_due < current and (not lease.end_date or next_due <= lease.end_date):
            next_due = _add_months(next_due, 1)

        if next_due > horizon:
            report["skipped"] += 1
            continue

        amount = (lease.rent_amount or 0) + (lease.charges or 0)
        created = _ensure_payment(db, lease, next_due, amount)
        lease.next_due_date = _add_months(next_due, 1)
        if created:
            report["created"] += 1
            report["log"].append({"lease_id": lease.id, "due_date": next_due.isoformat(), "status": "created"})
        else:
            report["skipped"] += 1
            report["log"].append({"lease_id": lease.id, "due_date": next_due.isoformat(), "status": "exists"})

    db.commit()
    return report
