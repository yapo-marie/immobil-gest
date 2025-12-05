import stripe
from typing import Optional, Dict, Any
from app.config import settings

# Configure Stripe globally if clé présente
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY


def create_checkout_session(
    amount: float,
    currency: str,
    description: str,
    success_url: str,
    cancel_url: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    """
    Crée une session Stripe Checkout et retourne l'URL.
    Retourne None si Stripe n'est pas configuré ou en cas d'erreur.
    """
    if not settings.STRIPE_SECRET_KEY:
        return None

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[
                {
                    "price_data": {
                        "currency": currency,
                        "unit_amount": int(amount * 100),
                        "product_data": {"name": description},
                    },
                    "quantity": 1,
                }
            ],
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=str(metadata.get("payment_id")) if metadata and metadata.get("payment_id") else None,
            metadata=metadata or {},
            automatic_tax={"enabled": False},
        )
        return session.url
    except Exception as exc:
        print(f"[stripe] checkout session error: {exc}")
        return None
