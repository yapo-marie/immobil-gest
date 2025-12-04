import { useMemo, useState } from "react";
import { Search, Download, CreditCard, Euro, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePayments, useUpdatePayment, useCreatePayment } from "@/hooks/usePayments";
import { useLeases } from "@/hooks/useLeases";
import { useProperties } from "@/hooks/useProperties";
import { useTenants } from "@/hooks/useTenants";
import { Lease, Payment, Property, Tenant } from "@/types/api";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PaymentForm } from "@/components/forms/PaymentForm";
import { useForm } from "react-hook-form";

const statusConfig: Record<
  Payment["status"],
  { label: string; className: string; icon: typeof CheckCircle2 | typeof Clock }
> = {
  paid: { label: "Payé", className: "badge-success", icon: CheckCircle2 },
  pending: { label: "En attente", className: "badge-info", icon: Clock },
  late: { label: "En retard", className: "badge-destructive", icon: Clock },
  partial: { label: "Partiel", className: "badge-warning", icon: Clock },
};

const methodConfig = {
  stripe: { label: "Carte", icon: CreditCard },
  paypal: { label: "PayPal", icon: CreditCard },
  bank_transfer: { label: "Virement", icon: Euro },
  cash: { label: "Espèces", icon: Euro },
  check: { label: "Chèque", icon: Euro },
};

export default function Payments() {
  const { data: payments = [], isLoading, isError, refetch } = usePayments();
  const { data: leases = [] } = useLeases();
  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();
  const updatePayment = useUpdatePayment();
  const createPayment = useCreatePayment();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const [statusFilter, setStatusFilter] = useState<Payment["status"] | "all">("all");
  const [search, setSearch] = useState("");

  const propertyMap = useMemo(() => {
    const map = new Map<number, Property>();
    properties.forEach((p) => map.set(p.id, p));
    return map;
  }, [properties]);

  const leaseMap = useMemo(() => {
    const map = new Map<number, Lease>();
    leases.forEach((lease) => map.set(lease.id, lease));
    return map;
  }, [leases]);

  const tenantMap = useMemo(() => {
    const map = new Map<number, Tenant>();
    tenants.forEach((tenant) => map.set(tenant.id, tenant));
    return map;
  }, [tenants]);

  const totals = useMemo(() => {
    return payments.reduce(
      (acc, payment) => {
        if (payment.status === "paid") acc.collected += payment.amount;
        if (payment.status === "pending") acc.pending += payment.amount;
        if (payment.status === "late") acc.late += payment.amount;
        return acc;
      },
      { collected: 0, pending: 0, late: 0 }
    );
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const lease = leaseMap.get(payment.lease_id);
      const tenant = lease ? tenantMap.get(lease.tenant_id) : undefined;
      const property = lease ? propertyMap.get(lease.property_id) : undefined;
      const haystack = `${tenant?.user?.first_name ?? ""} ${tenant?.user?.last_name ?? ""} ${
        tenant?.user?.email ?? ""
      } ${property?.title ?? ""} ${property?.city ?? ""}`.toLowerCase();

      const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
      const matchesSearch = !search || haystack.includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [payments, leaseMap, tenantMap, propertyMap, statusFilter, search]);

  const markAsPaid = (payment: Payment) => {
    updatePayment.mutate(
      {
        id: payment.id,
        data: {
          status: "paid",
          payment_date: new Date().toISOString().slice(0, 10),
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Paiement marqué comme payé",
            description: `Paiement #${payment.id} mis à jour.`,
          });
        },
        onError: () => {
          toast({
            title: "Erreur",
            description: "Impossible de mettre à jour le paiement.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Paiements</h1>
          <p className="page-subtitle">Suivez les loyers issus de l&apos;API</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download size={18} />
            Export CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Ajouter un paiement</Button>
            </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {selectedPayment ? "Éditer le paiement" : "Nouveau paiement"}
                      </DialogTitle>
                    </DialogHeader>
                    <PaymentForm
                      defaultValues={
                        selectedPayment
                          ? {
                            lease_id: selectedPayment.lease_id,
                            amount: selectedPayment.amount,
                            due_date: selectedPayment.due_date.slice(0, 10),
                            payment_method: selectedPayment.payment_method ?? undefined,
                            status: selectedPayment.status,
                            transaction_reference: selectedPayment.transaction_reference ?? undefined,
                            notes: selectedPayment.notes ?? undefined,
                          }
                          : undefined
                      }
                      loading={updatePayment.isPending}
                      leases={leases.map((lease) => {
                        const property = propertyMap.get(lease.property_id);
                        const tenant = tenantMap.get(lease.tenant_id);
                        return {
                          id: lease.id,
                          label: `${tenant?.name ?? `Locataire #${lease.tenant_id}`} — ${property?.title ?? `Bien #${lease.property_id}`}`,
                          amount: lease.rent_amount + (lease.charges ?? 0),
                          charges: lease.charges,
                          due_date: lease.start_date.slice(0, 10),
                        };
                      })}
                      onSubmit={(values) => {
                        if (!selectedPayment) {
                          createPayment.mutate(
                      { ...values },
                      {
                        onSuccess: () => {
                          toast({ title: "Paiement créé" });
                          setOpen(false);
                          setSelectedPayment(null);
                        },
                        onError: (err: any) => {
                          toast({
                            title: "Erreur",
                            description: err.response?.data?.detail || "Impossible de créer le paiement",
                            variant: "destructive",
                          });
                        },
                      }
                    );
                  } else {
                    updatePayment.mutate(
                      { id: selectedPayment.id, data: values },
                      {
                        onSuccess: () => {
                          toast({ title: "Paiement mis à jour" });
                          setOpen(false);
                          setSelectedPayment(null);
                        },
                      }
                    );
                  }
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle2 size={24} className="text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collectés</p>
                <p className="text-2xl font-semibold text-success">{totals.collected.toLocaleString("fr-FR")} F CFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-info/5 border-info/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <Clock size={24} className="text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-semibold text-info">{totals.pending.toLocaleString("fr-FR")} F CFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10">
                <Clock size={24} className="text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En retard</p>
                <p className="text-2xl font-semibold text-destructive">{totals.late.toLocaleString("fr-FR")} F CFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Rechercher par locataire ou bien..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as Payment["status"] | "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="paid">Payé</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="late">En retard</SelectItem>
            <SelectItem value="partial">Partiel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-6 text-muted-foreground">Chargement des paiements...</div>
          )}
          {isError && (
            <div className="p-6 text-destructive">
              Impossible de charger les paiements.{" "}
              <button className="underline" onClick={() => refetch()}>
                Réessayer
              </button>
            </div>
          )}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Bien</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Date de paiement</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => {
                  const lease = leaseMap.get(payment.lease_id);
                  const tenant = lease ? tenantMap.get(lease.tenant_id) : undefined;
                  const property = lease ? propertyMap.get(lease.property_id) : undefined;
                  const StatusIcon = statusConfig[payment.status].icon;

                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {tenant?.user
                          ? `${tenant.user.first_name} ${tenant.user.last_name}`
                          : `Locataire #${lease?.tenant_id ?? "?"}`}
                        <div className="text-xs text-muted-foreground">{tenant?.user?.email}</div>
                      </TableCell>
                      <TableCell>
                        {property ? (
                          <>
                            <div className="font-medium">{property.title}</div>
                            <div className="text-xs text-muted-foreground">{property.city}</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Bien #{lease?.property_id ?? "?"}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{payment.amount.toLocaleString("fr-FR")} F CFA</TableCell>
                      <TableCell>{new Date(payment.due_date).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        {payment.payment_date ? (
                          new Date(payment.payment_date).toLocaleDateString("fr-FR")
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.payment_method ? (
                          <div className="flex items-center gap-2 text-sm">
                            {(() => {
                              const Icon = methodConfig[payment.payment_method].icon;
                              return <Icon size={14} className="text-muted-foreground" />;
                            })()}
                            <span>{methodConfig[payment.payment_method].label}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={statusConfig[payment.status].className}>
                          <StatusIcon size={14} className="mr-1" />
                          {statusConfig[payment.status].label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {payment.status !== "paid" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => markAsPaid(payment)}
                            disabled={updatePayment.isPending}
                          >
                            Marquer payé
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setOpen(true);
                          }}
                        >
                          Éditer
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredPayments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                      Aucun paiement trouvé.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
