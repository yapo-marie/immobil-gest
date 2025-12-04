from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email
from app.config import settings
import logging
import re


def _strip_html(html: str) -> str:
    """Fallback plain text extraction."""
    return re.sub("<[^>]+>", " ", html or "").strip()


def send_email(to_email: str, subject: str, content: str, html_content: str | None = None) -> tuple[bool, str | None]:
    """
    Envoie un email via SendGrid (plain text + optionnel HTML), conforme au quickstart officiel.
    Retourne (success, reason) pour surface l'erreur à l'API.
    """
    if not settings.SENDGRID_API_KEY:
        msg = "SendGrid: clé API manquante"
        logging.error(msg)
        return False, msg
    if not settings.FROM_EMAIL:
        msg = "SendGrid: FROM_EMAIL non défini"
        logging.error(msg)
        return False, msg
    if not to_email:
        msg = "SendGrid: destinataire vide"
        logging.error(msg)
        return False, msg

    sender = Email(settings.FROM_EMAIL, settings.FROM_NAME or None)

    try:
        message = Mail(
            from_email=sender,
            to_emails=to_email,
            subject=subject,
            plain_text_content=content or _strip_html(html_content or ""),
            html_content=html_content,
        )
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)
        status = getattr(response, "status_code", 500)
        if status >= 400:
            body = getattr(response, "body", b"")
            msg = f"SendGrid {status}: {body}"
            logging.error(msg)
            return False, msg
        return True, None
    except Exception as exc:
        msg = f"SendGrid error: {exc}"
        logging.error(msg)
        return False, msg
