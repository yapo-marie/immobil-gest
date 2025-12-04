import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MaintenancePriority, MaintenanceStatus, MaintenanceType } from "@/types/api";

const schema = z.object({
  type: z.enum(["plumbing", "electrical", "heating", "appliance", "other"]),
  description: z.string().min(5, "Description requise"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z.enum(["pending", "in_progress", "resolved", "rejected"]).default("pending"),
});

type FormValues = z.infer<typeof schema>;

interface MaintenanceFormProps {
  defaultValues?: Partial<FormValues>;
  onSubmit: (values: FormValues) => void;
  submitLabel?: string;
  loading?: boolean;
}

export function MaintenanceForm({
  defaultValues,
  onSubmit,
  submitLabel = "Enregistrer",
  loading,
}: MaintenanceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "pending",
      priority: "medium",
      ...defaultValues,
    },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <Select onValueChange={(value) => setValue("type", value as MaintenanceType)} defaultValue={defaultValues?.type ?? ""}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plumbing">Plomberie</SelectItem>
              <SelectItem value="electrical">Électricité</SelectItem>
              <SelectItem value="heating">Chauffage/AC</SelectItem>
              <SelectItem value="appliance">Électroménager</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Priorité</label>
          <Select
            onValueChange={(value) => setValue("priority", value as MaintenancePriority)}
            defaultValue={defaultValues?.priority ?? "medium"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Priorité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">Haute</SelectItem>
              <SelectItem value="medium">Moyenne</SelectItem>
              <SelectItem value="low">Basse</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Statut</label>
        <Select
          onValueChange={(value) => setValue("status", value as MaintenanceStatus)}
          defaultValue={defaultValues?.status ?? "pending"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="resolved">Résolu</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <Textarea rows={4} {...register("description")} />
        {errors.description && (
          <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "En cours..." : submitLabel}
      </Button>
    </form>
  );
}
