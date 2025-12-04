import { Building2, Users, FileText, CreditCard, TrendingUp, AlertCircle } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { PropertyDistribution } from "@/components/dashboard/PropertyDistribution";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-subtitle">Bon retour ! Voici un aperçu de vos biens.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="animate-slide-up stagger-1">
          <StatCard
            title="Total des Biens"
            value={24}
            change="+2 ce mois-ci"
            changeType="positive"
            icon={Building2}
          />
        </div>
        <div className="animate-slide-up stagger-2">
          <StatCard
            title="Locataires Actifs"
            value={18}
            change="75% d'occupation"
            changeType="neutral"
            icon={Users}
          />
        </div>
        <div className="animate-slide-up stagger-3">
          <StatCard
            title="Baux Actifs"
            value={18}
            change="2 expirant bientôt"
            changeType="neutral"
            icon={FileText}
          />
        </div>
        <div className="animate-slide-up stagger-4">
          <StatCard
            title="Revenu Mensuel"
            value="18 200 F CFA"
            change="+12% vs mois dernier"
            changeType="positive"
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="text-warning shrink-0 mt-0.5" size={20} />
        <div>
          <p className="font-medium text-foreground">3 paiements sont en retard</p>
          <p className="text-sm text-muted-foreground mt-1">
            Vérifiez et envoyez des rappels aux locataires avec des paiements en retard.
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueChart />
        <PropertyDistribution />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />

        {/* Upcoming Payments */}
        <div className="stat-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Paiements à venir</h3>
          <div className="space-y-3">
            {[
              { tenant: "Marie Dupont", property: "Apt 12B", amount: 1200000, due: "5 Déc" },
              { tenant: "Pierre Martin", property: "Studio 3A", amount: 850000, due: "5 Déc" },
              { tenant: "Sophie Bernard", property: "Maison 7", amount: 1800000, due: "10 Déc" },
              { tenant: "Jean Moreau", property: "Apt 4C", amount: 950000, due: "10 Déc" },
            ].map((payment, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-foreground">{payment.tenant}</p>
                  <p className="text-sm text-muted-foreground">{payment.property}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    {payment.amount.toLocaleString("fr-FR")} F CFA
                  </p>
                  <p className="text-sm text-muted-foreground">Échéance {payment.due}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
