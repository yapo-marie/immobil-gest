import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Property } from "@/types/api";

export function useProperties() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data } = await api.get<Property[]>("/properties");
      return data;
    },
  });
}
