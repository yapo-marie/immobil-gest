import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Payment, PaymentStatus } from "@/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PaymentMethod } from "@/types/api";

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

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      lease_id: number;
      amount: number;
      due_date: string;
      payment_date?: string | null;
      status?: PaymentStatus;
      payment_method?: PaymentMethod;
      transaction_reference?: string | null;
      notes?: string | null;
    }) => {
      const { data } = await api.post<Payment>("/payments/", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["leases"] });
    },
  });
}
