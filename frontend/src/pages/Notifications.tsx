import { Bell, Check, CreditCard, FileText, Wrench, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const mockNotifications = [
  {
    id: "1",
    type: "payment",
    title: "Payment received",
    message: "Marie Dupont paid €1,350 for Apt 12B",
    time: "2 hours ago",
    read: false,
    icon: CreditCard,
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  {
    id: "2",
    type: "maintenance",
    title: "New maintenance request",
    message: "Plumbing issue reported at Apt 12B by Marie Dupont",
    time: "5 hours ago",
    read: false,
    icon: Wrench,
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
  },
  {
    id: "3",
    type: "alert",
    title: "Payment overdue",
    message: "Sophie Bernard's rent for House 7 is 3 days overdue",
    time: "1 day ago",
    read: false,
    icon: AlertCircle,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
  },
  {
    id: "4",
    type: "lease",
    title: "Lease expiring soon",
    message: "Jean Moreau's lease at Apt 4C expires in 30 days",
    time: "2 days ago",
    read: true,
    icon: FileText,
    iconBg: "bg-info/10",
    iconColor: "text-info",
  },
  {
    id: "5",
    type: "payment",
    title: "Payment received",
    message: "Pierre Martin paid €930 for Studio 3A",
    time: "3 days ago",
    read: true,
    icon: CreditCard,
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  {
    id: "6",
    type: "maintenance",
    title: "Maintenance completed",
    message: "Dishwasher repair at Apt 4C has been resolved",
    time: "5 days ago",
    read: true,
    icon: Wrench,
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
];

export default function Notifications() {
  const unreadCount = mockNotifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unreadCount} unread notifications</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Check size={18} />
          Mark all as read
        </Button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {mockNotifications.map((notification, index) => (
          <Card 
            key={notification.id}
            className={cn(
              "animate-slide-up hover:shadow-card-hover transition-all duration-300 cursor-pointer",
              !notification.read && "bg-primary/5 border-primary/20"
            )}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={cn("p-2 rounded-lg", notification.iconBg)}>
                  <notification.icon size={20} className={notification.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={cn(
                        "font-medium text-foreground",
                        !notification.read && "font-semibold"
                      )}>
                        {notification.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{notification.time}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockNotifications.length === 0 && (
        <div className="text-center py-12">
          <Bell size={48} className="text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      )}
    </div>
  );
}
