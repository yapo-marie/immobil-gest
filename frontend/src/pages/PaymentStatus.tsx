import { useSearchParams, Link } from "react-router-dom";

export default function PaymentStatus() {
  const [params] = useSearchParams();
  const status = params.get("status") || params.get("redirect_status") || "success";
  const pid = params.get("pid");

  const success = status === "success" || status === "succeeded";
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-background px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 shadow-lg text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">
          {success ? "Paiement confirmé" : "Paiement annulé"}
        </h1>
        <p className="text-muted-foreground">
          {success
            ? "Merci ! Votre paiement a été pris en compte. Le propriétaire sera notifié."
            : "Le paiement n'a pas abouti ou a été annulé."}
        </p>
        {pid && (
          <p className="text-sm text-muted-foreground">
            Référence interne : <span className="font-medium text-foreground">{pid}</span>
          </p>
        )}
        <div className="space-y-2">
          <Link to="/login" className="underline text-primary">
            Retour à l&apos;espace bailleur
          </Link>
        </div>
      </div>
    </div>
  );
}
