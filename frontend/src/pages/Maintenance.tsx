import { useMemo, useState } from "react";
import { Search, Wrench, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMaintenanceRequests, useUpdateMaintenance } from "@/hooks/useMaintenance";
import { useProperties } from "@/hooks/useProperties";
import { useTenants } from "@/hooks/useTenants";
import { MaintenanceRequest, Property, Tenant } from "@/types/api";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MaintenanceForm } from "@/components/forms/MaintenanceForm";

const statusConfig = {
  pending: { label: "En attente", className: "badge-warning", icon: Clock },
  in_progress: { label: "En cours", className: "badge-info", icon: Wrench },
  resolved: { label: "Résolu", className: "badge-success", icon: CheckCircle2 },
  rejected: { label: "Rejeté", className: "badge-destructive", icon: AlertTriangle },
};

const priorityConfig = {
  high: { label: "Haute", className: "text-destructive" },
  medium: { label: "Moyenne", className: "text-warning" },
  low: { label: "Basse", className: "text-muted-foreground" },
  urgent: { label: "Urgent", className: "text-destructive" },
};

const typeConfig: Record<string, string> = {
  plumbing: "Plomberie",
  heating: "Chauffage/AC",
  electrical: "Électricité",
  appliance: "Électroménager",
  other: "Autre",
};

export default function Maintenance() {
  const { data: requests = [], isLoading, isError, refetch } = useMaintenanceRequests();
  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();
  const updateRequest = useUpdateMaintenance();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);

  const [statusFilter, setStatusFilter] = useState<MaintenanceRequest["status"] | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<MaintenanceRequest["priority"] | "all">("all");
  const [search, setSearch] = useState("");

  const propertyMap = useMemo(() => {
    const map = new Map<number, Property>();
    properties.forEach((p) => map.set(p.id, p));
    return map;
  }, [properties]);

  const tenantMap = useMemo(() => {
    const map = new Map<number, Tenant>();
    tenants.forEach((tenant) => map.set(tenant.id, tenant));
    return map;
  }, [tenants]);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const property = propertyMap.get(req.property_id);
      const tenant = tenantMap.get(req.tenant_id);
      const haystack = `${property?.title ?? ""} ${property?.city ?? ""} ${
        tenant?.user?.first_name ?? ""
      } ${tenant?.user?.last_name ?? ""} ${req.description}`.toLowerCase();

      const matchesStatus = statusFilter === "all" || req.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || req.priority === priorityFilter;
      const matchesSearch = !search || haystack.includes(search.toLowerCase());

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [requests, propertyMap, tenantMap, statusFilter, priorityFilter, search]);

  const updateStatus = (request: MaintenanceRequest, nextStatus: MaintenanceRequest["status"]) => {
    updateRequest.mutate(
      { id: request.id, data: { status: nextStatus } },
      {
        onSuccess: () => {
          toast({
            title: "Demande mise à jour",
            description: `Statut passé à ${statusConfig[nextStatus]?.label ?? nextStatus}.`,
          });
        },
        onError: () => {
          toast({
            title: "Erreur",
            description: "Impossible de mettre à jour la demande.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;
  const highPriorityCount = requests.filter(
    (r) => (r.priority === "high" || r.priority === "urgent") && r.status !== "resolved"
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">Demandes issues de vos biens</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Nouvelle demande</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedRequest ? "Éditer la demande" : "Créer une demande"}
              </DialogTitle>
            </DialogHeader>
            <MaintenanceForm
              defaultValues={
                selectedRequest
                  ? {
                      type: selectedRequest.type,
                      priority: selectedRequest.priority,
                      status: selectedRequest.status,
                      description: selectedRequest.description,
                    }
                  : undefined
              }
              loading={updateRequest.isPending}
              onSubmit={(values) => {
                if (!selectedRequest) {
                  toast({
                    title: "Non implémenté (démo)",
                    description: "L'API de création de maintenance est à ajouter côté backend.",
                  });
                  return;
                }
                updateRequest.mutate(
                  { id: selectedRequest.id, data: values },
                  {
                    onSuccess: () => {
                      toast({ title: "Demande mise à jour" });
                      setOpen(false);
                      setSelectedRequest(null);
                    },
                  }
                );
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock size={24} className="text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-semibold text-warning">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-info/5 border-info/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10">
                <Wrench size={24} className="text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-2xl font-semibold text-info">{inProgressCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/10">
                <AlertTriangle size={24} className="text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priorité haute</p>
                <p className="text-2xl font-semibold text-destructive">{highPriorityCount}</p>
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
            placeholder="Rechercher une demande..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as MaintenanceRequest["status"] | "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="resolved">Résolu</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as MaintenanceRequest["priority"] | "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les priorités</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">Haute</SelectItem>
            <SelectItem value="medium">Moyenne</SelectItem>
            <SelectItem value="low">Basse</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {isLoading && <p className="text-muted-foreground">Chargement des demandes...</p>}
        {isError && (
          <p className="text-destructive">
            Impossible de charger les demandes.{" "}
            <button className="underline" onClick={() => refetch()}>
              Réessayer
            </button>
          </p>
        )}
        {!isLoading &&
          !isError &&
          filteredRequests.map((request, index) => {
            const statusInfo =
              statusConfig[request.status] ?? { label: request.status, className: "badge-info", icon: Clock };
            const StatusIcon = statusInfo.icon;
            const property = propertyMap.get(request.property_id);
            const tenant = tenantMap.get(request.tenant_id);
            const priority = priorityConfig[request.priority] ?? {
              label: request.priority,
              className: "text-muted-foreground",
            };
            return (
              <Card
                key={request.id}
                className="animate-slide-up hover:shadow-card-hover transition-all duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            request.status === "pending" && "bg-warning/10",
                            request.status === "in_progress" && "bg-info/10",
                            request.status === "resolved" && "bg-success/10",
                            request.status === "rejected" && "bg-destructive/10"
                          )}
                        >
                          <StatusIcon
                            size={20}
                            className={cn(
                              request.status === "pending" && "text-warning",
                              request.status === "in_progress" && "text-info",
                              request.status === "resolved" && "text-success",
                              request.status === "rejected" && "text-destructive"
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground">
                              {typeConfig[request.type] ?? request.type}
                            </h3>
                            <span className={cn("text-xs font-medium", priority.className)}>
                              {priority.label}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                            <span>📍 {property ? `${property.title} — ${property.city}` : `Bien #${request.property_id}`}</span>
                            <span>
                              👤{" "}
                              {tenant?.user
                                ? `${tenant.user.first_name} ${tenant.user.last_name}`
                                : `Locataire #${request.tenant_id}`}
                            </span>
                            <span>
                              🕒 {new Date(request.created_at).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={statusInfo.className}>{statusInfo.label}</span>
                      {request.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(request, "in_progress")}
                          disabled={updateRequest.isPending}
                        >
                          Démarrer
                        </Button>
                      )}
                      {request.status === "in_progress" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => updateStatus(request, "resolved")}
                          disabled={updateRequest.isPending}
                        >
                          Marquer résolu
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        {!isLoading && !isError && filteredRequests.length === 0 && (
          <p className="text-center text-muted-foreground py-6">Aucune demande trouvée.</p>
        )}
      </div>
    </div>
  );
}
