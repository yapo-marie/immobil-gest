import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { MaintenanceRequest } from "@/types/api";

export function useMaintenanceRequests() {
  return useQuery({
    queryKey: ["maintenance"],
    queryFn: async () => {
      const { data } = await api.get<MaintenanceRequest[]>("/maintenance/");
      return data;
    },
  });
}

export function useUpdateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MaintenanceRequest> }) => {
      const response = await api.put<MaintenanceRequest>(`/maintenance/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    },
  });
}
