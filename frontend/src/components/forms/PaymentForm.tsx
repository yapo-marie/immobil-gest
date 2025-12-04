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
import { PaymentMethod, PaymentStatus } from "@/types/api";

const schema = z.object({
  amount: z.number().positive("Montant requis"),
  due_date: z.string().min(1, "Échéance requise"),
  payment_method: z.enum(["stripe", "paypal", "bank_transfer", "cash", "check"]).optional(),
  status: z.enum(["pending", "paid", "late", "partial"]).default("pending"),
  transaction_reference: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PaymentFormProps {
  defaultValues?: Partial<FormValues>;
  onSubmit: (values: FormValues) => void;
  submitLabel?: string;
  loading?: boolean;
}

export function PaymentForm({
  defaultValues,
  onSubmit,
  submitLabel = "Enregistrer",
  loading,
}: PaymentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "pending",
      ...defaultValues,
    },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label className="block text-sm font-medium mb-1">Montant</label>
        <Input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} />
        {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Échéance</label>
        <Input type="date" {...register("due_date")} />
        {errors.due_date && <p className="text-xs text-destructive mt-1">{errors.due_date.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Méthode</label>
          <Select onValueChange={(value) => setValue("payment_method", value as PaymentMethod)} defaultValue={defaultValues?.payment_method ?? ""}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stripe">Carte</SelectItem>
              <SelectItem value="paypal">PayPal</SelectItem>
              <SelectItem value="bank_transfer">Virement</SelectItem>
              <SelectItem value="cash">Espèces</SelectItem>
              <SelectItem value="check">Chèque</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Statut</label>
          <Select onValueChange={(value) => setValue("status", value as PaymentStatus)} defaultValue={defaultValues?.status ?? "pending"}>
            <SelectTrigger>
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="paid">Payé</SelectItem>
              <SelectItem value="late">En retard</SelectItem>
              <SelectItem value="partial">Partiel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Référence transaction</label>
        <Input {...register("transaction_reference")} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <Input {...register("notes")} />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "En cours..." : submitLabel}
      </Button>
    </form>
  );
}
