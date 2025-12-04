import { useMemo, useState } from "react";
import { Plus, Search, FileText, Calendar, Euro, MoreVertical, Trash, Pencil } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLeases, useCreateLease, useUpdateLease, useDeleteLease } from "@/hooks/useLeases";
import { useProperties } from "@/hooks/useProperties";
import { useTenants } from "@/hooks/useTenants";
import { Lease } from "@/types/api";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Actif", className: "badge-success" },
  terminated: { label: "Résilié", className: "badge-destructive" },
  expired: { label: "Expiré", className: "badge-warning" },
};

const isExpiringSoon = (endDate?: string | null) => {
  if (!endDate) return false;
  const today = new Date();
  const diffDays = (new Date(endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 60;
};

export default function Leases() {
  const { data: leases = [], isLoading, isError, refetch } = useLeases();
  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();
  const createLease = useCreateLease();
  const updateLease = useUpdateLease();
  const deleteLease = useDeleteLease();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [editingLease, setEditingLease] = useState<Lease | null>(null);
  const [form, setForm] = useState({
    property_id: 0,
    tenant_id: 0,
    start_date: "",
    end_date: "",
    rent_amount: 0,
    charges: 0,
    deposit_paid: 0,
    payment_day: 5,
    special_conditions: "",
  });

  const propertyMap = useMemo(() => {
    const map = new Map<number, { title: string; city: string }>();
    properties.forEach((property) => map.set(property.id, { title: property.title, city: property.city }));
    return map;
  }, [properties]);

  const tenantMap = useMemo(() => {
    const map = new Map<number, { name: string; email: string }>();
    tenants.forEach((tenant) => {
      const name = tenant.user ? `${tenant.user.first_name} ${tenant.user.last_name}` : `Locataire #${tenant.id}`;
      map.set(tenant.id, { name, email: tenant.user?.email ?? "" });
    });
    return map;
  }, [tenants]);

  const resetForm = () => {
    setForm({
      property_id: 0,
      tenant_id: 0,
      start_date: "",
      end_date: "",
      rent_amount: 0,
      charges: 0,
      deposit_paid: 0,
      payment_day: 5,
      special_conditions: "",
    });
    setEditingLease(null);
  };

  const submitLease = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingLease) {
        if (!form.property_id || !form.tenant_id || !form.start_date) {
          toast({ title: "Champs requis manquants", variant: "destructive" });
          return;
        }
      }
      if (editingLease) {
        await updateLease.mutateAsync({
          id: editingLease.id,
          data: {
            property_id: form.property_id || editingLease.property_id,
            tenant_id: form.tenant_id || editingLease.tenant_id,
            start_date: form.start_date || editingLease.start_date,
            end_date: form.end_date || undefined,
            rent_amount: form.rent_amount || editingLease.rent_amount,
            charges: form.charges,
            deposit_paid: form.deposit_paid,
            payment_day: form.payment_day,
            special_conditions: form.special_conditions,
          },
        });
        toast({ title: "Bail mis à jour" });
      } else {
        await createLease.mutateAsync({
          property_id: form.property_id,
          tenant_id: form.tenant_id,
          start_date: form.start_date,
          end_date: form.end_date || undefined,
          rent_amount: form.rent_amount,
          charges: form.charges,
          deposit_paid: form.deposit_paid,
          payment_day: form.payment_day,
          special_conditions: form.special_conditions,
        });
        toast({ title: "Bail créé" });
      }
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible d'enregistrer le bail",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteLease.mutateAsync(id);
      toast({ title: "Bail supprimé" });
    } catch (err: any) {
      toast({
        title: "Suppression impossible",
        description: err.response?.data?.detail || "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  const filteredLeases = useMemo(() => {
    return leases.filter((lease: Lease) => {
      const matchesStatus = statusFilter === "all" || lease.status === statusFilter;
      const property = propertyMap.get(lease.property_id);
      const tenant = tenantMap.get(lease.tenant_id);
      const lowerSearch = searchTerm.toLowerCase();
      const haystack = `${property?.title ?? ""} ${property?.city ?? ""} ${tenant?.name ?? ""} ${tenant?.email ?? ""}`.toLowerCase();
      return matchesStatus && haystack.includes(lowerSearch);
    });
  }, [leases, propertyMap, tenantMap, searchTerm, statusFilter]);

  const activeLeases = filteredLeases.filter((lease) => lease.status === "active").length;
  const expiringLeases = filteredLeases.filter((lease) => lease.status === "active" && isExpiringSoon(lease.end_date)).length;
  const totalMonthlyRent = filteredLeases
    .filter((lease) => lease.status === "active")
    .reduce((sum, lease) => sum + lease.rent_amount + (lease.charges ?? 0), 0);

  const getStatusBadge = (lease: Lease) => {
    if (lease.status === "active" && isExpiringSoon(lease.end_date)) {
      return { label: "Actif - expire bientôt", className: "badge-warning" };
    }
    return statusConfig[lease.status] ?? { label: lease.status, className: "badge-info" };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Baux</h1>
          <p className="page-subtitle">Contrats issus de l&apos;API</p>
        </div>
        <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={18} />
              Nouveau bail
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLease ? "Modifier le bail" : "Créer un bail"}</DialogTitle>
            </DialogHeader>
            <form className="space-y-3" onSubmit={submitLease}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Bien</label>
                  <Select
                    value={form.property_id ? String(form.property_id) : undefined}
                    onValueChange={(value) => setForm({ ...form, property_id: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un bien" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={String(property.id)}>
                          {property.title} — {property.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Locataire</label>
                  <Select
                    value={form.tenant_id ? String(form.tenant_id) : undefined}
                    onValueChange={(value) => setForm({ ...form, tenant_id: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un locataire" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={String(tenant.id)}>
                          {tenant.user ? `${tenant.user.first_name} ${tenant.user.last_name}` : `Locataire #${tenant.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Date début</label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Date fin</label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Loyer</label>
                  <Input type="number" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: Number(e.target.value) })} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Charges</label>
                  <Input type="number" value={form.charges} onChange={(e) => setForm({ ...form, charges: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Dépôt</label>
                  <Input type="number" value={form.deposit_paid} onChange={(e) => setForm({ ...form, deposit_paid: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Jour de paiement</label>
                  <Input type="number" value={form.payment_day} onChange={(e) => setForm({ ...form, payment_day: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Conditions spéciales</label>
                  <Input value={form.special_conditions} onChange={(e) => setForm({ ...form, special_conditions: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createLease.isPending || updateLease.isPending}>
                {createLease.isPending || updateLease.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <FileText size={24} className="text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Baux actifs</p>
                <p className="text-2xl font-semibold text-foreground">{activeLeases}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <Calendar size={24} className="text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Qui expirent bientôt</p>
                <p className="text-2xl font-semibold text-foreground">{expiringLeases}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Euro size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loyer mensuel (actifs)</p>
                <p className="text-2xl font-semibold text-foreground">{totalMonthlyRent.toLocaleString("fr-FR")} F CFA</p>
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
            placeholder="Rechercher un bail..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="terminated">Résilié</SelectItem>
            <SelectItem value="expired">Expiré</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leases Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-6 text-muted-foreground">Chargement des baux...</div>
          )}
          {isError && (
            <div className="p-6 text-destructive">
              Impossible de charger les baux.{" "}
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
                  <TableHead>Durée</TableHead>
                  <TableHead>Loyer + Charges</TableHead>
                  <TableHead>Dépôt</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeases.map((lease) => {
                  const property = propertyMap.get(lease.property_id);
                  const tenant = tenantMap.get(lease.tenant_id);
                  const badge = getStatusBadge(lease);

                  return (
                    <TableRow key={lease.id}>
                      <TableCell className="font-medium">
                        {tenant?.name ?? `Locataire #${lease.tenant_id}`}
                        <div className="text-xs text-muted-foreground">{tenant?.email}</div>
                      </TableCell>
                      <TableCell>
                        {property ? (
                          <>
                            <div className="font-medium">{property.title}</div>
                            <div className="text-sm text-muted-foreground">{property.city}</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Bien #{lease.property_id}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{new Date(lease.start_date).toLocaleDateString("fr-FR")}</p>
                          {lease.end_date && (
                            <p className="text-muted-foreground">
                              → {new Date(lease.end_date).toLocaleDateString("fr-FR")}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{lease.rent_amount.toLocaleString("fr-FR")} F CFA</p>
                          <p className="text-muted-foreground">+ {(lease.charges ?? 0).toLocaleString("fr-FR")} F CFA</p>
                        </div>
                      </TableCell>
                      <TableCell>{(lease.deposit_paid ?? 0).toLocaleString("fr-FR")} F CFA</TableCell>
                      <TableCell>
                        <span className={badge.className}>{badge.label}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingLease(lease);
                                setForm({
                                  property_id: lease.property_id,
                                  tenant_id: lease.tenant_id,
                                  start_date: lease.start_date.slice(0, 10),
                                  end_date: lease.end_date?.slice(0, 10) || "",
                                  rent_amount: lease.rent_amount,
                                  charges: lease.charges ?? 0,
                                  deposit_paid: lease.deposit_paid ?? 0,
                                  payment_day: lease.payment_day ?? 5,
                                  special_conditions: lease.special_conditions ?? "",
                                });
                                setOpen(true);
                              }}
                            >
                              <Pencil size={14} className="mr-2" /> Éditer
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(lease.id)}
                            >
                              <Trash size={14} className="mr-2" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredLeases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                      Aucun bail trouvé avec ces critères.
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
