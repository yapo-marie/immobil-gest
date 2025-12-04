import { useMemo, useState } from "react";
import { Plus, Search, Mail, Phone, MoreVertical, User, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenants } from "@/hooks/useTenants";
import { useLeases } from "@/hooks/useLeases";
import { useProperties } from "@/hooks/useProperties";
import { Tenant } from "@/types/api";

export default function Tenants() {
  const { data: tenants = [], isLoading, isError, refetch } = useTenants();
  const { data: leases = [] } = useLeases();
  const { data: properties = [] } = useProperties();
  const [searchTerm, setSearchTerm] = useState("");

  const propertyMap = useMemo(() => {
    const map = new Map<number, { title: string; city: string }>();
    properties.forEach((property) => map.set(property.id, { title: property.title, city: property.city }));
    return map;
  }, [properties]);

  const activeLeaseByTenant = useMemo(() => {
    const map = new Map<number, number>();
    leases.forEach((lease) => {
      if (lease.status === "active" && !map.has(lease.tenant_id)) {
        map.set(lease.tenant_id, lease.property_id);
      }
    });
    return map;
  }, [leases]);

  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant: Tenant) => {
      const fullName = `${tenant.user?.first_name ?? ""} ${tenant.user?.last_name ?? ""}`.trim();
      const email = tenant.user?.email ?? "";
      const lowerSearch = searchTerm.toLowerCase();
      return (
        fullName.toLowerCase().includes(lowerSearch) ||
        email.toLowerCase().includes(lowerSearch)
      );
    });
  }, [tenants, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Locataires</h1>
          <p className="page-subtitle">Données récupérées depuis l&apos;API</p>
        </div>
        <Button className="gap-2">
          <Plus size={18} />
          Ajouter un locataire
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Rechercher un locataire..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && (
          <div className="col-span-full text-muted-foreground">Chargement des locataires...</div>
        )}
        {isError && (
          <div className="col-span-full text-destructive">
            Impossible de charger les locataires.{" "}
            <button className="underline" onClick={() => refetch()}>
              Réessayer
            </button>
          </div>
        )}
        {!isLoading && !isError && filteredTenants.map((tenant, index) => {
          const propertyId = activeLeaseByTenant.get(tenant.id);
          const property = propertyId ? propertyMap.get(propertyId) : null;
          const leaseBadge = property
            ? { label: "Bail actif", className: "badge-success" }
            : { label: "Aucun bail", className: "badge-info" };

          return (
            <Card
              key={tenant.id}
              className="animate-slide-up hover:shadow-card-hover transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={24} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {tenant.user ? `${tenant.user.first_name} ${tenant.user.last_name}` : "Utilisateur inconnu"}
                      </h3>
                      <div className="flex gap-2 mt-1">
                        <span className={leaseBadge.className}>{leaseBadge.label}</span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Voir</DropdownMenuItem>
                      <DropdownMenuItem>Éditer</DropdownMenuItem>
                      <DropdownMenuItem>Envoyer un message</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail size={14} />
                    <span className="truncate">{tenant.user?.email ?? "Email non renseigné"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone size={14} />
                    <span>{tenant.user?.phone ?? "Téléphone non renseigné"}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-1">Bien associé</p>
                  {property ? (
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Home size={14} className="text-muted-foreground" />
                      {property.title} — {property.city}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun bien actif</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isLoading && !isError && filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucun locataire ne correspond à votre recherche.</p>
        </div>
      )}
    </div>
  );
}
