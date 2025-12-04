"""
Script de seed de données démo.
Usage :
    cd backend && python seed_demo.py
Le script ne fait rien si des utilisateurs existent déjà (pour éviter les doublons).
"""
from datetime import date, timedelta

from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.property import Property, PropertyType, PropertyStatus
from app.models.tenant import Tenant
from app.models.lease import Lease, LeaseStatus
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.models.maintenance import (
    MaintenanceRequest,
    MaintenancePriority,
    MaintenanceStatus,
    MaintenanceType,
)
from app.models.notification import Notification, NotificationType
from app.utils.security import get_password_hash


def main():
    # S'assure que les tables existent (utile pour SQLite en démo)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if db.query(User).count() > 0:
            print("Seed ignoré : des utilisateurs existent déjà.")
            return

        # Utilisateur bailleur
        landlord = User(
            email="bailleur@locatus.com",
            hashed_password=get_password_hash("motdepasse123"),
            first_name="Jean",
            last_name="Dupont",
            phone="0612345678",
            role=UserRole.LANDLORD,
        )
        db.add(landlord)
        db.commit()
        db.refresh(landlord)

        # Locataires + profils
        tenants_data = [
            ("marie.dupont@example.com", "Marie", "Dupont", "0600000001", "Paris"),
            ("pierre.martin@example.com", "Pierre", "Martin", "0600000002", "Paris"),
            ("sophie.bernard@example.com", "Sophie", "Bernard", "0600000003", "Lyon"),
        ]
        tenants = []
        for email, first_name, last_name, phone, city in tenants_data:
            user = User(
                email=email,
                hashed_password=get_password_hash("locatus123"),
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                role=UserRole.TENANT,
            )
            db.add(user)
            db.flush()
            tenant_profile = Tenant(
                user_id=user.id,
                employment_info="CDI",
            )
            db.add(tenant_profile)
            tenants.append((user, tenant_profile, city))

        db.commit()

        # Biens
        properties = []
        for idx, city in enumerate(["Paris", "Paris", "Lyon"]):
            prop = Property(
                owner_id=landlord.id,
                title=f"Bien démo #{idx + 1}",
                description="Appartement cosy pour démonstration",
                property_type=PropertyType.APARTMENT,
                address=f"{10 + idx} Rue de la Démo",
                city=city,
                postal_code="75000",
                surface_area=45 + idx * 5,
                rooms=2 + idx,
                bedrooms=1 + (idx % 2),
                bathrooms=1,
                rent_amount=1200 + idx * 200,
                charges=100,
                status=PropertyStatus.AVAILABLE,
                images=[],
                amenities=["ascenseur", "balcon"],
            )
            db.add(prop)
            properties.append(prop)

        db.commit()
        for prop in properties:
            db.refresh(prop)

        # Baux (liaison 3 biens/locataires)
        leases = []
        start = date.today().replace(day=1)
        for prop, (tenant_user, tenant_profile, _) in zip(properties, tenants):
            lease = Lease(
                property_id=prop.id,
                tenant_id=tenant_profile.id,
                start_date=start - timedelta(days=90),
                end_date=start + timedelta(days=275),
                rent_amount=prop.rent_amount,
                charges=prop.charges,
                deposit_paid=prop.rent_amount * 2,
                payment_day=5,
                status=LeaseStatus.ACTIVE,
            )
            prop.status = PropertyStatus.OCCUPIED
            db.add(lease)
            leases.append(lease)

        db.commit()
        for lease in leases:
            db.refresh(lease)

        # Paiements (en retard, en attente, payé)
        payments = []
        for idx, lease in enumerate(leases):
            due = start + timedelta(days=5)
            payment = Payment(
                lease_id=lease.id,
                amount=lease.rent_amount + (lease.charges or 0),
                due_date=due,
                status=PaymentStatus.PENDING if idx == 1 else PaymentStatus.PAID,
                payment_date=None if idx == 1 else due - timedelta(days=1),
                payment_method=PaymentMethod.STRIPE if idx != 1 else None,
                transaction_reference="demo-tx" if idx != 1 else None,
            )
            payments.append(payment)
            db.add(payment)

        # Paiement en retard
        late_payment = Payment(
            lease_id=leases[0].id,
            amount=leases[0].rent_amount + (leases[0].charges or 0),
            due_date=start - timedelta(days=15),
            status=PaymentStatus.LATE,
        )
        db.add(late_payment)

        db.commit()

        # Maintenance
        maintenance = MaintenanceRequest(
            property_id=properties[0].id,
            tenant_id=tenants[0][1].id,
            type=MaintenanceType.PLUMBING,
            description="Fuite sous l'évier de la cuisine.",
            status=MaintenanceStatus.PENDING,
            priority=MaintenancePriority.HIGH,
        )
        db.add(maintenance)

        maintenance2 = MaintenanceRequest(
            property_id=properties[1].id,
            tenant_id=tenants[1][1].id,
            type=MaintenanceType.ELECTRICAL,
            description="Prise qui grésille dans le salon.",
            status=MaintenanceStatus.IN_PROGRESS,
            priority=MaintenancePriority.MEDIUM,
        )
        db.add(maintenance2)

        # Notifications pour le bailleur
        db.add_all(
            [
                Notification(
                    user_id=landlord.id,
                    type=NotificationType.PAYMENT_LATE,
                    title="Paiement en retard",
                    message="Un loyer est en retard.",
                    is_read=False,
                ),
                Notification(
                    user_id=landlord.id,
                    type=NotificationType.MAINTENANCE_UPDATE,
                    title="Nouvelle demande",
                    message="Une demande de maintenance a été créée.",
                    is_read=False,
                ),
            ]
        )

        db.commit()
        print("Seed terminé avec succès.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
