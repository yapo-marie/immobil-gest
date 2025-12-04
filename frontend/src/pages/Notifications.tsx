import { Bell, Check, CreditCard, FileText, Wrench, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useNotifications, useMarkNotificationRead } from "@/hooks/useNotifications";
import { Notification } from "@/types/api";

const typeConfig: Record<
  Notification["type"],
  { icon: typeof CreditCard; iconBg: string; iconColor: string; defaultTitle: string }
> = {
  payment_confirmation: {
    icon: CreditCard,
    iconBg: "bg-success/10",
    iconColor: "text-success",
    defaultTitle: "Paiement reçu",
  },
  payment_reminder: {
    icon: CreditCard,
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    defaultTitle: "Rappel de paiement",
  },
  payment_late: {
    icon: AlertCircle,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    defaultTitle: "Paiement en retard",
  },
  lease_expiring: {
    icon: FileText,
    iconBg: "bg-info/10",
    iconColor: "text-info",
    defaultTitle: "Bail à renouveler",
  },
  maintenance_update: {
    icon: Wrench,
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    defaultTitle: "Maintenance",
  },
  general: {
    icon: Bell,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    defaultTitle: "Notification",
  },
};

export default function Notifications() {
  const { data: notifications = [], isLoading, isError, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAll = () => {
    notifications
      .filter((n) => !n.is_read)
      .forEach((notification) => markRead.mutate(notification.id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {isLoading ? "Chargement..." : `${unreadCount} non lues`}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleMarkAll} disabled={unreadCount === 0}>
          <Check size={18} />
          Tout marquer comme lu
        </Button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading && <p className="text-muted-foreground">Chargement des notifications...</p>}
        {isError && (
          <p className="text-destructive">
            Impossible de charger les notifications.{" "}
            <button className="underline" onClick={() => refetch()}>
              Réessayer
            </button>
          </p>
        )}
        {!isLoading &&
          !isError &&
          notifications.map((notification, index) => {
            const config = typeConfig[notification.type] ?? typeConfig.general;
            return (
              <Card
                key={notification.id}
                className={cn(
                  "animate-slide-up hover:shadow-card-hover transition-all duration-300 cursor-pointer",
                  !notification.is_read && "bg-primary/5 border-primary/20"
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => markRead.mutate(notification.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("p-2 rounded-lg", config.iconBg)}>
                      <config.icon size={20} className={config.iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3
                            className={cn(
                              "font-medium text-foreground",
                              !notification.is_read && "font-semibold"
                            )}
                          >
                            {notification.title || config.defaultTitle}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(notification.created_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {!isLoading && !isError && notifications.length === 0 && (
        <div className="text-center py-12">
          <Bell size={48} className="text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune notification pour le moment</p>
        </div>
      )}
    </div>
  );
}
