import { useMemo, useState } from "react";
import { Plus, Search, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PropertyCard } from "@/components/properties/PropertyCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProperties, useCreateProperty } from "@/hooks/useProperties";
import { PropertyStatus, PropertyType } from "@/types/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTenants } from "@/hooks/useTenants";
import { useCreateLease } from "@/hooks/useLeases";

const statusFilterOptions: { value: PropertyStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "disponible", label: "Disponible" },
  { value: "occupé", label: "Occupé" },
  { value: "en maintenance", label: "En maintenance" },
  { value: "fermé", label: "Archivé" },
];

export default function Properties() {
  const { data: properties = [], isLoading, isError, refetch } = useProperties();
  const { data: tenants = [] } = useTenants();
  const createProperty = useCreateProperty();
  const createLease = useCreateLease();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    address: "",
    city: "",
    postal_code: "",
    surface_area: 0,
    rooms: 0,
    bedrooms: 0,
    bathrooms: 0,
    rent_amount: 0,
    charges: 0,
    image_file: null as File | null,
    property_type: "appartement" as PropertyType,
    tenant_id: 0,
    lease_start_date: new Date().toISOString().slice(0, 10),
  });

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const matchesStatus = statusFilter === "all" || property.status === statusFilter;
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        property.title.toLowerCase().includes(lowerSearch) ||
        property.city.toLowerCase().includes(lowerSearch) ||
        property.address.toLowerCase().includes(lowerSearch);
      return matchesStatus && matchesSearch;
    });
  }, [properties, searchTerm, statusFilter]);

const resetForm = () => {
  setForm({
    title: "",
    description: "",
    address: "",
    city: "",
    postal_code: "",
    surface_area: 0,
    rooms: 0,
    bedrooms: 0,
    bathrooms: 0,
    rent_amount: 0,
    charges: 0,
    image_file: null,
    property_type: "appartement",
    tenant_id: 0,
    lease_start_date: new Date().toISOString().slice(0, 10),
  });
};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Biens</h1>
          <p className="page-subtitle">Liste des biens issus de l&apos;API FastAPI</p>
        </div>
        <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={18} />
              Ajouter un bien
            </Button>
          </DialogTrigger>
          <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau bien</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                  let uploadedUrl: string | undefined;
                  if (form.image_file) {
                    const data = new FormData();
                    data.append("file", form.image_file);
                    const res = await fetch("/api/upload", {
                      method: "POST",
                      body: data,
                    });
                    if (!res.ok) throw new Error("Upload image échoué");
                    const json = await res.json();
                    uploadedUrl = json.url;
                  }

                  const created = await createProperty.mutateAsync({
                    title: form.title,
                    description: form.description,
                    address: form.address,
                    city: form.city,
                    postal_code: form.postal_code,
                    surface_area: form.surface_area,
                    rooms: form.rooms,
                    bedrooms: form.bedrooms,
                    bathrooms: form.bathrooms,
                    rent_amount: form.rent_amount,
                    charges: form.charges,
                    property_type: form.property_type,
                    images: uploadedUrl ? [uploadedUrl] : [],
                  });
                  // Si un locataire est choisi, on crée un bail automatiquement
                  if (form.tenant_id) {
                    await createLease.mutateAsync({
                      property_id: created.id,
                      tenant_id: form.tenant_id,
                      start_date: form.lease_start_date,
                      rent_amount: form.rent_amount,
                      charges: form.charges,
                      payment_day: 5,
                      deposit_paid: form.rent_amount,
                    });
                  }
                  toast({ title: "Bien créé" });
                  resetForm();
                  setOpen(false);
                  } catch (err: any) {
                    toast({
                      title: "Erreur",
                      description: err.response?.data?.detail || "Impossible de créer le bien",
                      variant: "destructive",
                  });
                }
              }}
            >
              <div>
                <label className="text-sm font-medium">Titre</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Description courte</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Adresse</label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Ville</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Code postal</label>
                <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Loyer</label>
                  <Input
                    type="number"
                    value={form.rent_amount}
                    onChange={(e) => setForm({ ...form, rent_amount: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Charges</label>
                  <Input
                    type="number"
                    value={form.charges}
                    onChange={(e) => setForm({ ...form, charges: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={form.property_type}
                    onValueChange={(value) => setForm({ ...form, property_type: value as PropertyType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="appartement">Appartement</SelectItem>
                      <SelectItem value="villa">Maison/Villa</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Surface (m²)</label>
                  <Input
                    type="number"
                    value={form.surface_area}
                    onChange={(e) => setForm({ ...form, surface_area: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Pièces</label>
                  <Input type="number" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Chambres</label>
                  <Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Salles de bain</label>
                  <Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Image (upload)</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm({ ...form, image_file: e.target.files?.[0] || null })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Attribuer à un locataire (optionnel)</label>
                  <Select
                    value={String(form.tenant_id)}
                    onValueChange={(value) => setForm({ ...form, tenant_id: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un locataire" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Ne pas attribuer</SelectItem>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={String(tenant.id)}>
                          {tenant.user ? `${tenant.user.first_name} ${tenant.user.last_name}` : `Locataire #${tenant.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Date de début de bail</label>
                  <Input
                    type="date"
                    value={form.lease_start_date}
                    onChange={(e) => setForm({ ...form, lease_start_date: e.target.value })}
                    disabled={!form.tenant_id}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createProperty.isPending}>
                {createProperty.isPending ? "Création..." : "Créer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Rechercher un bien..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PropertyStatus | "all")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              {statusFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid size={18} />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List size={18} />
          </Button>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && (
          <div className="col-span-full text-muted-foreground">Chargement des biens...</div>
        )}
        {isError && (
          <div className="col-span-full text-destructive">
            Impossible de charger les biens. <button className="underline" onClick={() => refetch()}>Réessayer</button>
          </div>
        )}
        {!isLoading && !isError && filteredProperties.map((property, index) => (
          <div key={property.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
            <PropertyCard
              id={property.id}
              title={property.title}
              address={property.address}
              city={property.city}
              type={property.property_type}
              rent={property.rent_amount}
              status={property.status}
              bedrooms={property.bedrooms}
              bathrooms={property.bathrooms}
              surface={property.surface_area}
              imageUrl={property.images?.[0]}
            />
          </div>
        ))}
      </div>

      {!isLoading && !isError && filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucun bien ne correspond à votre recherche.</p>
        </div>
      )}
    </div>
  );
}
