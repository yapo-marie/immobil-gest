import stripe
from fastapi import APIRouter, Request, HTTPException
from app.config import settings
from app.database import SessionLocal
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from datetime import date

router = APIRouter(prefix="/api/stripe", tags=["Stripe"])

# Configure Stripe
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    if event["type"] == "payment_intent.succeeded":
        pi = event["data"]["object"]
        metadata = pi.get("metadata", {})
        payment_id = metadata.get("payment_id")
        payment_date = date.today()

        if payment_id:
            db = SessionLocal()
            try:
                payment = db.query(Payment).filter(Payment.id == int(payment_id)).first()
                if payment:
                    payment.status = PaymentStatus.PAID
                    payment.payment_date = payment_date
                    payment.payment_method = PaymentMethod.STRIPE
                    payment.transaction_reference = pi.get("id")
                    db.commit()
            finally:
                db.close()

    return {"received": True}
