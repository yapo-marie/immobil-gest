import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Payment, PaymentStatus } from "@/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface UsePaymentsParams {
  status?: PaymentStatus;
  dueBefore?: string;
}

export function usePayments(params?: UsePaymentsParams) {
  return useQuery({
    queryKey: ["payments", params?.status, params?.dueBefore],
    queryFn: async () => {
      const { data } = await api.get<Payment[]>("/payments/", {
        params: {
          status: params?.status,
          due_before: params?.dueBefore,
        },
      });
      return data;
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Payment> }) => {
      const response = await api.put<Payment>(`/payments/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}
