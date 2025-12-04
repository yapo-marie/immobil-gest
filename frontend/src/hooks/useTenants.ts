import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Tenant } from "@/types/api";

type TenantUpdatePayload = Partial<Tenant> & {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  password?: string;
};

export function useTenants(search?: string) {
  return useQuery({
    queryKey: ["tenants", search || "all"],
    queryFn: async () => {
      const { data } = await api.get<Tenant[]>("/tenants/", {
        params: search ? { search } : undefined,
      });
      return data;
    },
  });
}

export function useCreateTenantWithUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      phone?: string;
      employment_info?: string;
      notes?: string;
    }) => {
      const { data } = await api.post("/tenants/with-user", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TenantUpdatePayload }) => {
      const response = await api.put(`/tenants/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/tenants/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}
