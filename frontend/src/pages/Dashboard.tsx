import {
  Building2,
  Users,
  FileText,
  CreditCard,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { PropertyDistribution } from "@/components/dashboard/PropertyDistribution";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { useProperties } from "@/hooks/useProperties";
import { useTenants } from "@/hooks/useTenants";
import { useLeases } from "@/hooks/useLeases";
import { usePayments } from "@/hooks/usePayments";
import { Lease, Payment, Property } from "@/types/api";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const {
    data: properties = [],
    isLoading: propertiesLoading,
    isError: propertiesError,
    refetch: refetchProperties,
  } = useProperties();
  const {
    data: tenants = [],
    isLoading: tenantsLoading,
    isError: tenantsError,
    refetch: refetchTenants,
  } = useTenants();
  const {
    data: leases = [],
    isLoading: leasesLoading,
    isError: leasesError,
    refetch: refetchLeases,
  } = useLeases();
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    isError: paymentsError,
    refetch: refetchPayments,
  } = usePayments();

  const loading = propertiesLoading || tenantsLoading || leasesLoading || paymentsLoading;
  const hasError = propertiesError || tenantsError || leasesError || paymentsError;

  const activeLeases = leases.filter((lease) => lease.status === "active");
  const monthlyRevenue = activeLeases.reduce(
    (sum, lease) => sum + lease.rent_amount + (lease.charges ?? 0),
    0
  );

  const today = new Date();
  const latePayments = payments.filter((payment) => {
    const dueDate = new Date(payment.due_date);
    return (
      payment.status === "late" ||
      (payment.status !== "paid" && dueDate < today)
    );
  });

  const propertyDistribution = properties.reduce<Record<string, number>>((acc, property) => {
    acc[property.property_type] = (acc[property.property_type] ?? 0) + 1;
    return acc;
  }, {});

  const revenueTrend = buildRevenueTrend(payments);

  const upcomingPayments = payments
    .filter((payment) => {
      const dueDate = new Date(payment.due_date);
      return payment.status !== "paid" && dueDate >= today;
    })
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 4);

  const propertyMap = new Map<number, Property>();
  properties.forEach((property) => propertyMap.set(property.id, property));

  const leaseMap = new Map<number, Lease>();
  leases.forEach((lease) => leaseMap.set(lease.id, lease));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-subtitle">Bon retour ! Voici un aperçu de vos biens.</p>
      </div>

      {hasError && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive">
          Impossible de charger toutes les données.{" "}
          <button
            className="underline"
            onClick={() => {
              refetchProperties();
              refetchTenants();
              refetchLeases();
              refetchPayments();
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/properties" className="animate-slide-up stagger-1 block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-xl">
          <StatCard
            title="Total des Biens"
            value={loading ? "—" : properties.length}
            change="Actifs + archivés"
            changeType="neutral"
            icon={Building2}
          />
        </Link>
        <Link to="/tenants" className="animate-slide-up stagger-2 block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-xl">
          <StatCard
            title="Locataires"
            value={loading ? "—" : tenants.length}
            change="Profils créés"
            changeType="neutral"
            icon={Users}
          />
        </Link>
        <Link to="/leases" className="animate-slide-up stagger-3 block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-xl">
          <StatCard
            title="Baux actifs"
            value={loading ? "—" : activeLeases.length}
            change="Sur vos biens"
            changeType="neutral"
            icon={FileText}
          />
        </Link>
        <Link to="/payments" className="animate-slide-up stagger-4 block focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-xl">
          <StatCard
            title="Loyer + charges"
            value={loading ? "—" : `${monthlyRevenue.toLocaleString("fr-FR")} F CFA / mois`}
            change="Basé sur baux actifs"
            changeType="positive"
            icon={TrendingUp}
          />
        </Link>
      </div>

      {/* Alerts */}
      {!loading && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-warning shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-foreground">
              {latePayments.length} paiement{latePayments.length > 1 ? "s" : ""} en retard
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Vérifiez et envoyez des rappels aux locataires concernés.
            </p>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueChart data={revenueTrend} loading={loading} />
        <PropertyDistribution distribution={propertyDistribution} loading={loading} />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity payments={payments.slice(0, 5)} loading={loading} />

        {/* Upcoming Payments */}
        <div className="stat-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Paiements à venir</h3>
          <div className="space-y-3">
            {loading && <p className="text-muted-foreground">Chargement...</p>}
            {!loading && upcomingPayments.length === 0 && (
              <p className="text-muted-foreground">Aucun paiement à venir.</p>
            )}
            {!loading &&
              upcomingPayments.map((payment) => {
                const lease = leaseMap.get(payment.lease_id);
                const property = lease ? propertyMap.get(lease.property_id) : undefined;
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-foreground">
                        {property ? property.title : `Bien #${lease?.property_id ?? "?"}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Échéance {new Date(payment.due_date).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {payment.amount.toLocaleString("fr-FR")} F CFA
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {property?.city ?? "Ville inconnue"}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildRevenueTrend(payments: Payment[]) {
  const months: { label: string; revenue: number }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = date.toLocaleDateString("fr-FR", { month: "short" });
    const monthRevenue = payments
      .filter(
        (payment) =>
          payment.status === "paid" &&
          new Date(payment.payment_date ?? payment.due_date).getMonth() === date.getMonth() &&
          new Date(payment.payment_date ?? payment.due_date).getFullYear() === date.getFullYear()
      )
      .reduce((sum, payment) => sum + payment.amount, 0);

    months.push({ label, revenue: monthRevenue });
  }

  return months;
}
