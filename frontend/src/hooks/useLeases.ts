import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Lease, LeaseStatus } from "@/types/api";

interface UseLeasesParams {
  status?: LeaseStatus;
  propertyId?: number;
}

export function useLeases(params?: UseLeasesParams) {
  return useQuery({
    queryKey: ["leases", params?.status, params?.propertyId],
    queryFn: async () => {
      const { data } = await api.get<Lease[]>("/leases/", {
        params: {
          status: params?.status,
          property_id: params?.propertyId,
        },
      });
      return data;
    },
  });
}

export function useCreateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      property_id: number;
      tenant_id: number;
      start_date: string;
      end_date?: string | null;
      rent_amount: number;
      charges?: number | null;
      deposit_paid?: number | null;
      payment_day?: number | null;
      special_conditions?: string | null;
    }) => {
      const { data } = await api.post<Lease>("/leases/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useUpdateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Lease> }) => {
      const response = await api.put<Lease>(`/leases/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useDeleteLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/leases/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}
