from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import os
from datetime import datetime, date


def generate_payment_receipt(payment_id: int, amount: float, tenant_name: str, property_title: str, output_dir: str = "receipts") -> str:
    """Génère une quittance PDF simple et retourne le chemin du fichier."""
    os.makedirs(output_dir, exist_ok=True)
    filename = os.path.join(output_dir, f"receipt-{payment_id}.pdf")

    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4

    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "Quittance de loyer")

    c.setFont("Helvetica", 12)
    c.drawString(50, height - 90, f"Paiement #{payment_id}")
    c.drawString(50, height - 110, f"Locataire : {tenant_name}")
    c.drawString(50, height - 130, f"Bien : {property_title}")
    c.drawString(50, height - 150, f"Montant : {amount:,.0f} F CFA")
    c.drawString(50, height - 170, f"Date : {datetime.utcnow().strftime('%Y-%m-%d')}")

    c.showPage()
    c.save()
    return filename


def generate_due_notice(payment_id: int, amount: float, due_date: date, tenant_name: str, property_title: str, output_dir: str = "receipts") -> str:
    """Génère un avis d'échéance simple (PDF)."""
    os.makedirs(output_dir, exist_ok=True)
    filename = os.path.join(output_dir, f"notice-{payment_id}.pdf")

    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4

    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "Avis d'échéance")

    c.setFont("Helvetica", 12)
    c.drawString(50, height - 90, f"Paiement #{payment_id}")
    c.drawString(50, height - 110, f"Locataire : {tenant_name or 'N/A'}")
    c.drawString(50, height - 130, f"Bien : {property_title or 'N/A'}")
    c.drawString(50, height - 150, f"Montant : {amount:,.0f} F CFA")
    c.drawString(50, height - 170, f"Échéance : {due_date}")
    c.drawString(50, height - 190, f"Émis le : {datetime.utcnow().strftime('%Y-%m-%d')}")

    c.showPage()
    c.save()
    return filename
