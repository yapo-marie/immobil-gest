import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { Payment } from "@/types/api";

interface RecentActivityProps {
  payments: Payment[];
  loading?: boolean;
}

export function RecentActivity({ payments, loading }: RecentActivityProps) {
  const activities = payments
    .slice()
    .sort(
      (a, b) =>
        new Date(b.payment_date ?? b.due_date).getTime() -
        new Date(a.payment_date ?? a.due_date).getTime()
    )
    .slice(0, 5)
    .map((payment) => ({
      id: payment.id,
      title: payment.status === "paid" ? "Paiement reçu" : "Paiement à suivre",
      description: `Loyer #${payment.lease_id}`,
      amount: payment.amount,
      time: new Date(payment.payment_date ?? payment.due_date).toLocaleDateString("fr-FR"),
      icon: payment.status === "paid" ? CreditCard : Wrench,
      iconBg: payment.status === "paid" ? "bg-success/10" : "bg-warning/10",
      iconColor: payment.status === "paid" ? "text-success" : "text-warning",
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Activités récentes {loading && "(chargement...)"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-muted-foreground text-sm">Chargement...</p>}
        {!loading && activities.length === 0 && (
          <p className="text-muted-foreground text-sm">Aucune activité récente.</p>
        )}
        {!loading &&
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className={cn("p-2 rounded-lg", activity.iconBg)}>
                <activity.icon size={18} className={activity.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-success">
                  {activity.amount.toLocaleString("fr-FR")} F CFA
                </p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
