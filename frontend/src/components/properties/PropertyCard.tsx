import { Building2, MapPin, Bed, Bath, Square, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PropertyCardProps {
  id: number;
  title: string;
  address: string;
  city: string;
  type: string;
  rent: number;
  status: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  surface?: number | null;
  imageUrl?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  disponible: { label: "Disponible", className: "badge-success" },
  "en maintenance": { label: "Maintenance", className: "badge-warning" },
  occupé: { label: "Occupé", className: "badge-info" },
  fermé: { label: "Archivé", className: "badge-destructive" },
};

export function PropertyCard({
  title,
  address,
  city,
  type,
  rent,
  status,
  bedrooms,
  bathrooms,
  surface,
  imageUrl,
}: PropertyCardProps) {
  const statusInfo = statusConfig[status] ?? { label: status || "N/A", className: "badge-info" };

  return (
    <Card className="overflow-hidden group hover:shadow-card-hover transition-all duration-300">
      <div className="relative h-48 bg-muted overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <Building2 size={48} className="text-primary/40" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={statusInfo.className}>{statusInfo.label}</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical size={16} />
        </Button>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-foreground line-clamp-1">{title}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin size={14} />
              <span className="line-clamp-1">{address}, {city}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Bed size={14} />
            <span>{bedrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath size={14} />
            <span>{bathrooms}</span>
          </div>
          <div className="flex items-center gap-1">
            <Square size={14} />
            <span>{surface}m²</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{type}</span>
          <span className="text-lg font-semibold text-primary">
            {rent.toLocaleString("fr-FR")} <span className="text-sm font-normal text-muted-foreground">F&nbsp;CFA / mois</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
