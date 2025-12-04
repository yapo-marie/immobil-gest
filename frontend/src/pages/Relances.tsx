import { useReminders } from "@/hooks/useReminders";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Clock, AlertTriangle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import api from "@/lib/api";

export default function Relances() {
  const { data: reminders = [], isLoading, isError, refetch } = useReminders();
  const { toast } = useToast();
  const [sendingId, setSendingId] = useState<number | null>(null);

  const sendReminder = async (paymentId: number) => {
    try {
      setSendingId(paymentId);
      const res = await api.post<{ notice_url: string }>(`/payments/${paymentId}/notice`);
      toast({
        title: "Relance envoyée",
        description: "Avis généré et email envoyé.",
      });
      return res.data.notice_url;
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible d'envoyer la relance",
        variant: "destructive",
      });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header mb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Relances de paiement</h1>
          <p className="page-subtitle">Paiements en attente ou en retard (automatisés)</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          Rafraîchir
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Chargement des relances...</p>}
      {isError && (
        <p className="text-destructive">
          Impossible de charger les relances.{" "}
          <button className="underline" onClick={() => refetch()}>
            Réessayer
          </button>
        </p>
      )}

      {!isLoading && !isError && reminders.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Bell className="mx-auto mb-3" />
            Aucune relance à afficher.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {reminders.map((reminder) => {
          const isLate = reminder.status === "late" || reminder.days_until_due < 0;
          const StatusIcon = isLate ? AlertTriangle : Clock;
          return (
            <Card key={reminder.payment_id} className="hover:shadow-card-hover transition-all duration-300">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon size={18} className={isLate ? "text-destructive" : "text-warning"} />
                    <span className="text-sm font-medium">
                      {isLate ? "En retard" : "À relancer"} — échéance {new Date(reminder.due_date).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                    {reminder.property_city}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{reminder.property_title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {reminder.tenant_name} — {reminder.tenant_email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Paiement #{reminder.payment_id} — Bail #{reminder.lease_id}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">{reminder.amount.toLocaleString("fr-FR")} F CFA</p>
                    <p className="text-xs text-muted-foreground">
                      {reminder.days_until_due < 0
                        ? `${Math.abs(reminder.days_until_due)} jour(s) de retard`
                        : `Échéance dans ${reminder.days_until_due} jour(s)`}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={() => sendReminder(reminder.payment_id)}
                    disabled={sendingId === reminder.payment_id}
                  >
                    <Mail size={16} />
                    {sendingId === reminder.payment_id ? "Envoi..." : "Envoyer un rappel"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
