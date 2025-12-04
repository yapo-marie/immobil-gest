import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, FileText, Wrench, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const activities = [
  {
    id: 1,
    type: 'payment',
    title: 'Paiement reçu',
    description: 'Marie Dupont - Apt 12B',
    amount: '1 200 F CFA',
    time: 'il y a 2 heures',
    icon: CreditCard,
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
  },
  {
    id: 2,
    type: 'lease',
    title: 'Nouveau bail signé',
    description: 'Pierre Martin - Studio 3A',
    time: 'il y a 5 heures',
    icon: FileText,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    id: 3,
    type: 'maintenance',
    title: 'Demande de maintenance',
    description: 'Problème de plomberie - Apt 7C',
    time: 'il y a 1 jour',
    icon: Wrench,
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
  },
  {
    id: 4,
    type: 'tenant',
    title: 'Nouveau locataire ajouté',
    description: 'Sophie Bernard',
    time: 'il y a 2 jours',
    icon: UserPlus,
    iconBg: 'bg-info/10',
    iconColor: 'text-info',
  },
];

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Activités récentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <div className={cn("p-2 rounded-lg", activity.iconBg)}>
              <activity.icon size={18} className={activity.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{activity.title}</p>
              <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
            </div>
            <div className="text-right">
              {activity.amount && (
                <p className="text-sm font-semibold text-success">{activity.amount}</p>
              )}
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
