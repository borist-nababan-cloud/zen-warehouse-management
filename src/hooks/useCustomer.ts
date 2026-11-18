import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '@/services/customerService'
import { MasterCustomer } from '@/types/database'

export const customerQueryKeys = {
  all: ['master_customer'] as const,
  lists: () => [...customerQueryKeys.all, 'list'] as const,
  list: (kodeOutlet: string) => [...customerQueryKeys.lists(), kodeOutlet] as const,
}

export function useCustomers(kodeOutlet: string) {
  return useQuery({
    queryKey: customerQueryKeys.list(kodeOutlet || 'ALL'),
    queryFn: () => getCustomers(kodeOutlet),
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<MasterCustomer, 'kode_customer' | 'created_at' | 'update_at'>) =>
      createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      kode_customer,
      data,
    }: {
      kode_customer: string
      data: Partial<MasterCustomer>
    }) => updateCustomer(kode_customer, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (kode_customer: string) => deleteCustomer(kode_customer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() })
    },
  })
}
