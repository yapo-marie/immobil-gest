import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";

export default function PaymentStatus() {
  const [params] = useSearchParams();
  const status = params.get("status") || params.get("redirect_status") || "success";
  const pid = params.get("pid");
  const leaseId = params.get("lease_id");
  const checkoutSessionId = params.get("cs_id");

  const success = status === "success" || status === "succeeded";
  const receiptUrl = pid ? `/receipts/receipt-${pid}.pdf` : null;
  const [syncState, setSyncState] = useState<"pending" | "ok" | "error">("pending");
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!success) {
      setSyncState("error");
      setSyncError("Paiement non confirmé.");
      return;
    }
    if (!checkoutSessionId) {
      setSyncState("error");
      setSyncError("Identifiant de session manquant.");
      return;
    }
    const paymentId = pid ? Number(pid) : undefined;
    const lease = leaseId ? Number(leaseId) : undefined;
    const confirm = async () => {
      try {
        await api.post("/payments/confirm", {
          checkout_session_id: checkoutSessionId,
          payment_id: paymentId,
          lease_id: lease,
        });
        setSyncState("ok");
        setSyncError(null);
      } catch (err: any) {
        setSyncState("error");
        setSyncError(err?.response?.data?.detail || "Synchronisation du paiement impossible.");
      }
    };
    confirm();
  }, [success, checkoutSessionId, pid, leaseId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-background px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 shadow-lg text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">
          {success ? "Paiement confirmé" : "Paiement annulé"}
        </h1>
        <p className="text-muted-foreground">
          {success
            ? "Merci ! Votre paiement a été pris en compte. Un reçu vous a été envoyé par e-mail."
            : "Le paiement n'a pas abouti ou a été annulé."}
        </p>
        {pid && (
          <p className="text-sm text-muted-foreground">
            Référence interne : <span className="font-medium text-foreground">{pid}</span>
          </p>
        )}
        {success && receiptUrl && (
          <div className="space-y-2">
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
            >
              Télécharger votre reçu
            </a>
          </div>
        )}
        {success && (
          <p className="text-xs text-muted-foreground">
            {syncState === "pending" && "Synchronisation en cours..."}
            {syncState === "ok" && "Paiement synchronisé avec la base."}
            {syncState === "error" && (syncError || "Synchronisation non confirmée.")}
          </p>
        )}
      </div>
    </div>
  );
}
