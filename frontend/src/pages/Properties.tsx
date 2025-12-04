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
import { useProperties } from "@/hooks/useProperties";
import { PropertyStatus } from "@/types/api";

const statusFilterOptions: { value: PropertyStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "disponible", label: "Disponible" },
  { value: "occupé", label: "Occupé" },
  { value: "en maintenance", label: "En maintenance" },
  { value: "fermé", label: "Archivé" },
];

export default function Properties() {
  const { data: properties = [], isLoading, isError, refetch } = useProperties();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Biens</h1>
          <p className="page-subtitle">Liste des biens issus de l&apos;API FastAPI</p>
        </div>
        <Button className="gap-2">
          <Plus size={18} />
          Ajouter un bien
        </Button>
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
