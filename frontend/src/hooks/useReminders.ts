import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface Reminder {
  payment_id: number;
  lease_id: number;
  property_title: string;
  property_city: string;
  amount: number;
  due_date: string;
  status: string;
  days_until_due: number;
}

export function useReminders() {
  return useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const { data } = await api.get<Reminder[]>("/reminders/");
      return data;
    },
  });
}
