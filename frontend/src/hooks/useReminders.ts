import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface LeaseReminder {
  lease_id: number;
  tenant_id: number;
  tenant_name: string;
  tenant_email: string;
  property_id: number;
  property_title: string;
  property_city: string;
  start_date: string;
  end_date: string;
  status: string;
  days_until_end: number | null;
  rent_amount?: number;
  pay_url?: string;
}

export interface PaymentReminder {
  payment_id: number;
  lease_id: number;
  property_title: string;
  property_city: string;
  tenant_name: string;
  tenant_email: string;
  amount: number;
  due_date: string;
  status: string;
  days_until_due: number;
}

export function useReminders() {
  return useQuery({
    queryKey: ["reminders", "leases"],
    queryFn: async () => {
      const { data } = await api.get<LeaseReminder[]>("/reminders/leases");
      return data;
    },
  });
}

export function usePaymentReminders() {
  return useQuery({
    queryKey: ["reminders", "payments"],
    queryFn: async () => {
      const { data } = await api.get<PaymentReminder[]>("/reminders/", {
        params: { include_late: true, due_within_days: 60 },
      });
      return data;
    },
  });
}
