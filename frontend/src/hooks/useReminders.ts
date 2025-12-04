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
