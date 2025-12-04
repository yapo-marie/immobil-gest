from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from app.config import settings
import logging


def send_email(to_email: str, subject: str, content: str):
    """Envoie un email simple via SendGrid, ignore silencieusement si la clé ou le destinataire manque."""
    if not settings.SENDGRID_API_KEY or not to_email:
        return
    try:
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        message = Mail(
            from_email=settings.FROM_EMAIL,
            to_emails=to_email,
            subject=subject,
            plain_text_content=content,
        )
        sg.send(message)
    except Exception as exc:
        logging.error(f"SendGrid error: {exc}")
