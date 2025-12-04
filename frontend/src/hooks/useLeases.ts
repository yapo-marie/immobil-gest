import { useQuery } from "@tanstack/react-query";
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
      const { data } = await api.get<Lease[]>("/leases", {
        params: {
          status: params?.status,
          property_id: params?.propertyId,
        },
      });
      return data;
    },
  });
}
