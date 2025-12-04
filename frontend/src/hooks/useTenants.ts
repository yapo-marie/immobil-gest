import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Tenant } from "@/types/api";

export function useTenants(search?: string) {
  return useQuery({
    queryKey: ["tenants", search || "all"],
    queryFn: async () => {
      const { data } = await api.get<Tenant[]>("/tenants", {
        params: search ? { search } : undefined,
      });
      return data;
    },
  });
}
