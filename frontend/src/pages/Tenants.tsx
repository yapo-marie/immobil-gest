import { useMemo, useState } from "react";
import { Plus, Search, Mail, Phone, MoreVertical, User, Home, Trash, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTenants, useCreateTenantWithUser, useUpdateTenant, useDeleteTenant } from "@/hooks/useTenants";
import { useLeases } from "@/hooks/useLeases";
import { useProperties } from "@/hooks/useProperties";
import { Tenant } from "@/types/api";
import { useToast } from "@/hooks/use-toast";
import { useCreateLease } from "@/hooks/useLeases";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TenantFormState {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  employment_info?: string;
  notes?: string;
  property_id?: number;
  start_date?: string;
}

export default function Tenants() {
const { data: tenants = [], isLoading, isError, refetch } = useTenants();
const { data: leases = [] } = useLeases();
const { data: properties = [] } = useProperties();
const [searchTerm, setSearchTerm] = useState("");
const [open, setOpen] = useState(false);
const [editTenant, setEditTenant] = useState<Tenant | null>(null);
const [form, setForm] = useState<TenantFormState>({
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  phone: "",
  employment_info: "",
  notes: "",
  property_id: 0,
  start_date: new Date().toISOString().slice(0, 10),
});
  const createTenant = useCreateTenantWithUser();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();
  const createLease = useCreateLease();
  const { toast } = useToast();

  const propertyMap = useMemo(() => {
    const map = new Map<number, { title: string; city: string; rent_amount?: number; charges?: number | null; deposit?: number | null }>();
    properties.forEach((property) =>
      map.set(property.id, {
        title: property.title,
        city: property.city,
        rent_amount: property.rent_amount,
        charges: property.charges ?? 0,
        deposit: property.deposit ?? property.rent_amount,
      })
    );
    return map;
  }, [properties]);

  const occupiedPropertyIds = useMemo(() => {
    const set = new Set<number>();
    leases.forEach((lease) => {
      if (lease.status === "active") {
        set.add(lease.property_id);
      }
    });
    return set;
  }, [leases]);

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

const resetForm = () => {
  setForm({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    employment_info: "",
    notes: "",
    property_id: 0,
    start_date: new Date().toISOString().slice(0, 10),
  });
  setEditTenant(null);
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editTenant) {
        if (!form.first_name || !form.last_name || !form.email) {
          toast({
            title: "Champs requis manquants",
            description: "Prénom, nom et email sont obligatoires",
            variant: "destructive",
          });
          return;
        }

        const payload: Record<string, string | undefined> = {
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          employment_info: form.employment_info,
          notes: form.notes,
        };

        if (form.password) {
          payload.password = form.password;
        }

        await updateTenant.mutateAsync({
          id: editTenant.id,
          data: payload,
        });
        toast({ title: "Locataire mis à jour" });
      } else {
        const tenantCreated = await createTenant.mutateAsync({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          employment_info: form.employment_info,
          notes: form.notes,
        });
        // Si un bien est sélectionné, on crée un bail automatiquement (date de début = choisie)
        if (form.property_id) {
          const property = propertyMap.get(form.property_id);
          await createLease.mutateAsync({
            property_id: form.property_id,
            tenant_id: tenantCreated.id,
            start_date: form.start_date || new Date().toISOString().slice(0, 10),
            rent_amount: property?.rent_amount ?? 0,
            charges: property?.charges ?? 0,
            payment_day: 5,
            deposit_paid: property?.deposit ?? property?.rent_amount ?? 0,
          });
        }
        toast({ title: "Locataire créé" });
      }
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible d'enregistrer le locataire",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (tenantId: number) => {
    try {
      await deleteTenant.mutateAsync(tenantId);
      toast({ title: "Locataire supprimé" });
    } catch (err: any) {
      toast({
        title: "Suppression impossible",
        description: err.response?.data?.detail || "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Locataires</h1>
          <p className="page-subtitle">Gérez vos locataires (API)</p>
        </div>
        <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={18} />
              Ajouter un locataire
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editTenant ? "Modifier le locataire" : "Nouveau locataire"}</DialogTitle>
            </DialogHeader>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Prénom</label>
                  <Input
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Nom</label>
                  <Input
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Téléphone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Mot de passe {editTenant ? "(laisser vide pour conserver l'actuel)" : ""}
                </label>
                <Input
                  type="password"
                  value={form.password}
                  placeholder={editTenant ? "Laisser vide pour ne pas modifier" : undefined}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editTenant}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Situation pro</label>
                <Input value={form.employment_info} onChange={(e) => setForm({ ...form, employment_info: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Attribuer un bien (optionnel)</label>
                  <Select
                    value={String(form.property_id ?? 0)}
                    onValueChange={(value) => setForm({ ...form, property_id: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un bien" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Ne pas attribuer</SelectItem>
                      {properties.map((property) => {
                        const isOccupied = occupiedPropertyIds.has(property.id);
                        return (
                          <SelectItem
                            key={property.id}
                            value={String(property.id)}
                            disabled={isOccupied}
                          >
                            {property.title} — {property.city} {isOccupied ? "(déjà attribué)" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Date de début du bail</label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    disabled={!form.property_id}
                  />
                </div>
              </div>
              <Button type="submit" disabled={createTenant.isPending || updateTenant.isPending} className="w-full">
                {createTenant.isPending || updateTenant.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
              style={{ animationDelay: `${index * 0.05}s` }}
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
                      <DropdownMenuItem
                        onClick={() => {
                          setEditTenant(tenant);
                          setForm({
                            email: tenant.user?.email ?? "",
                            password: "",
                            first_name: tenant.user?.first_name ?? "",
                            last_name: tenant.user?.last_name ?? "",
                            phone: tenant.user?.phone ?? "",
                            employment_info: tenant.employment_info ?? "",
                            notes: tenant.notes ?? "",
                            property_id: 0,
                            start_date: new Date().toISOString().slice(0, 10),
                          });
                          setOpen(true);
                        }}
                      >
                        <Pencil size={14} className="mr-2" /> Éditer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <div className="flex items-center gap-2 text-destructive">
                              <Trash size={14} />
                              <span>Supprimer</span>
                            </div>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ce locataire ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action supprimera le profil locataire. Confirmer ?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDelete(tenant.id)}
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuItem>
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
