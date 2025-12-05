import os
from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("APP_URL", "http://localhost:8080")
os.environ.setdefault("TIMEZONE", "UTC")

from app.database import Base  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402
from app.models.property import Property, PropertyType, PropertyStatus  # noqa: E402
from app.models.tenant import Tenant  # noqa: E402
from app.models.lease import Lease, LeaseStatus  # noqa: E402
from app.models.payment import Payment, PaymentStatus  # noqa: E402
from app.models.reminder_history import ReminderHistory  # noqa: E402
from app.services.scheduled_reminder_service import run_scheduled  # noqa: E402


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSession()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


def seed(db):
    owner = User(
        email="owner@example.com",
        hashed_password="x",
        first_name="Owner",
        last_name="Test",
        role=UserRole.LANDLORD,
    )
    tenant_user = User(
        email="tenant@example.com",
        hashed_password="x",
        first_name="Tenant",
        last_name="Test",
        role=UserRole.TENANT,
    )
    db.add_all([owner, tenant_user])
    db.flush()

    prop = Property(
        owner_id=owner.id,
        title="Appartement A",
        address="1 rue",
        city="Paris",
        property_type=PropertyType.APARTMENT,
        rent_amount=500,
        status=PropertyStatus.AVAILABLE,
    )
    db.add(prop)
    db.flush()

    tenant = Tenant(user_id=tenant_user.id)
    db.add(tenant)
    db.flush()

    lease = Lease(
        property_id=prop.id,
        tenant_id=tenant.id,
        start_date=date(2024, 1, 1),
        rent_amount=500,
        charges=50,
        payment_day=15,
        status=LeaseStatus.ACTIVE,
    )
    db.add(lease)
    db.flush()

    payment = Payment(
        lease_id=lease.id,
        amount=550,
        due_date=date(2024, 1, 10),
        status=PaymentStatus.PENDING,
    )
    db.add(payment)

    paid_payment = Payment(
        lease_id=lease.id,
        amount=550,
        due_date=date(2024, 1, 9),
        status=PaymentStatus.PAID,
        payment_date=date(2024, 1, 9),
    )
    db.add(paid_payment)
    db.commit()
    return lease, payment


def test_run_scheduled_sends_once_and_tracks_history(db_session, monkeypatch):
    _, payment = seed(db_session)
    today = date(2024, 1, 10)
    sent = []

    def fake_send_email(to_email, subject, content, html_content=None):
        sent.append({"to": to_email, "subject": subject})
        return True, None

    monkeypatch.setattr("app.services.scheduled_reminder_service.send_email", fake_send_email)

    report = run_scheduled(db_session, today=today)
    assert report["sent"] == 1
    assert len(sent) == 1
    assert db_session.query(ReminderHistory).count() == 1

    # Second run should not resend the same reminder
    report2 = run_scheduled(db_session, today=today)
    assert report2["sent"] == 0
    assert report2["skipped_duplicate"] == 1
    assert len(sent) == 1
    assert db_session.query(ReminderHistory).count() == 1
