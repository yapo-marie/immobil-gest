import stripe
from typing import Optional, Dict, Any
from app.config import settings

# Configure Stripe globally if clé présente
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY

ZERO_DECIMAL_CURRENCIES = {
    "bif",
    "clp",
    "djf",
    "gnf",
    "jpy",
    "kmf",
    "krw",
    "mga",
    "pyg",
    "rwf",
    "ugx",
    "vnd",
    "vuv",
    "xaf",
    "xof",
    "xpf",
}


def to_stripe_amount(amount: float, currency: str) -> Optional[int]:
    """
    Convertit un montant en plus petite unité Stripe (centimes ou unité entière pour XAF).
    Retourne None si le montant est invalide ou dépasse les limites Stripe.
    """
    if amount is None:
        return None
    try:
        currency_code = (currency or "").lower()
    except Exception:
        currency_code = "xaf"

    multiplier = 1 if currency_code in ZERO_DECIMAL_CURRENCIES else 100
    smallest = int(round(amount * multiplier))

    if smallest <= 0:
        return None
    # Stripe impose un plafond à 99 999 999 (en plus petite unité)
    if smallest > 99_999_999:
        return None

    return smallest


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
        print("[stripe] clé secrète absente, checkout non créé")
        return None

    stripe_amount = to_stripe_amount(amount, currency)
    if stripe_amount is None:
        print(f"[stripe] montant invalide pour checkout ({amount} {currency})")
        return None

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[
                {
                    "price_data": {
                        "currency": currency,
                        "unit_amount": stripe_amount,
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
        # Fallback : Payment Link (sans success/cancel)
        try:
            pl = stripe.PaymentLink.create(
                line_items=[
                    {
                        "price_data": {
                            "currency": currency,
                            "unit_amount": stripe_amount,
                            "product_data": {"name": description},
                        },
                        "quantity": 1,
                    }
                ],
                metadata=metadata or {},
            )
            return getattr(pl, "url", None)
        except Exception as sub_exc:
            print(f"[stripe] payment link error: {sub_exc}")
            return None
