import { useMemo, useState } from "react";
import { Plus, Search, FileText, Calendar, Euro, MoreVertical } from "lucide-react";
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
import { useLeases } from "@/hooks/useLeases";
import { useProperties } from "@/hooks/useProperties";
import { useTenants } from "@/hooks/useTenants";
import { Lease } from "@/types/api";

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

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

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
        <Button className="gap-2">
          <Plus size={18} />
          Nouveau bail
        </Button>
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
                <p className="text-2xl font-semibold text-foreground">€{totalMonthlyRent.toLocaleString()}</p>
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
                          <p className="font-medium">€{lease.rent_amount.toLocaleString()}</p>
                          <p className="text-muted-foreground">+ €{(lease.charges ?? 0).toLocaleString()}</p>
                        </div>
                      </TableCell>
                      <TableCell>€{(lease.deposit_paid ?? 0).toLocaleString()}</TableCell>
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
                            <DropdownMenuItem>Voir</DropdownMenuItem>
                            <DropdownMenuItem>Télécharger le PDF</DropdownMenuItem>
                            <DropdownMenuItem>Renouveler</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Résilier</DropdownMenuItem>
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
