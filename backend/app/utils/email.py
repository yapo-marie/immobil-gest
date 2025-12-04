import logging
import re
import smtplib
from email.message import EmailMessage
from email.utils import formataddr
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email
from app.config import settings


def _strip_html(html: str) -> str:
    """Fallback plain text extraction."""
    return re.sub("<[^>]+>", " ", html or "").strip()


def _send_via_smtp(to_email: str, subject: str, content: str, html_content: str | None) -> tuple[bool, str | None]:
    if not settings.SMTP_HOST:
        return False, "SMTP: hôte non configuré"
    if not settings.FROM_EMAIL:
        return False, "SMTP: FROM_EMAIL non défini"
    if not to_email:
        return False, "SMTP: destinataire vide"

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = formataddr((settings.FROM_NAME or "", settings.FROM_EMAIL))
    msg["To"] = to_email
    msg.set_content(content or _strip_html(html_content or ""))
    if html_content:
        msg.add_alternative(html_content, subtype="html")

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True, None
    except Exception as exc:
        msg = f"SMTP error: {exc}"
        logging.error(msg)
        return False, msg


def _send_via_sendgrid(to_email: str, subject: str, content: str, html_content: str | None) -> tuple[bool, str | None]:
    if not settings.SENDGRID_API_KEY:
        return False, "SendGrid: clé API manquante"
    if not settings.FROM_EMAIL:
        return False, "SendGrid: FROM_EMAIL non défini"
    if not to_email:
        return False, "SendGrid: destinataire vide"

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


def send_email(to_email: str, subject: str, content: str, html_content: str | None = None) -> tuple[bool, str | None]:
    """
    Envoie un email en tentant d'abord SMTP (configurable), puis fallback SendGrid si disponible.
    Retourne (success, reason).
    """
    # 1) SMTP si configuré
    smtp_success, smtp_reason = _send_via_smtp(to_email, subject, content, html_content)
    if smtp_success:
        return True, None
    # 2) SendGrid en fallback
    sg_success, sg_reason = _send_via_sendgrid(to_email, subject, content, html_content)
    if sg_success:
        return True, None
    # 3) Rien n'a marché
    return False, smtp_reason or sg_reason or "Aucun provider email configuré"
