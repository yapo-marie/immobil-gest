import os
from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret")

from app.database import Base  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402
from app.models.property import Property, PropertyType, PropertyStatus  # noqa: E402
from app.models.tenant import Tenant  # noqa: E402
from app.models.lease import Lease, LeaseStatus  # noqa: E402
from app.models.payment import Payment  # noqa: E402
from app.services.payment_generation_service import generate_monthly_payments  # noqa: E402


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
    db.commit()
    db.refresh(lease)
    return lease


def test_generate_creates_next_payment_and_updates_pointer(db_session):
    lease = seed(db_session)
    today = date(2024, 1, 10)

    report = generate_monthly_payments(db_session, today=today, horizon_days=40)
    assert report["created"] == 1

    payment = db_session.query(Payment).first()
    assert payment is not None
    assert payment.due_date == date(2024, 1, 15)
    db_session.refresh(lease)
    assert lease.next_due_date == date(2024, 2, 15)

    # Idempotent on the same window
    report2 = generate_monthly_payments(db_session, today=today, horizon_days=40)
    assert report2["created"] == 0
    assert db_session.query(Payment).count() == 1
