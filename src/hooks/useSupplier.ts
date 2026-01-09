import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '@/services/supplierService'
import { MasterSupplier } from '@/types/database'
import { useAuthUser } from './useAuth'

export const supplierQueryKeys = {
  all: ['master_supplier'] as const,
  lists: () => [...supplierQueryKeys.all, 'list'] as const,
  list: (kodeOutlet: string) => [...supplierQueryKeys.lists(), kodeOutlet] as const,
}

/**
 * Hook to get suppliers by outlet
 * @param kodeOutlet - Outlet code
 */
export function useSuppliers(kodeOutlet: string) {
  return useQuery({
    queryKey: supplierQueryKeys.list(kodeOutlet),
    queryFn: () => getSuppliers(kodeOutlet),
    // enabled: !!kodeOutlet, // <-- REMOVED: This blocked fetching when kodeOutlet was '' (All)
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook to create a new supplier
 */
export function useCreateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<MasterSupplier, 'kode_supplier' | 'created_at'>) =>
      createSupplier(data),
    onSuccess: (_, variables) => {
      // Invalidate specific outlet list if possible, or all lists
      if (variables.kode_outlet) {
          queryClient.invalidateQueries({ queryKey: supplierQueryKeys.list(variables.kode_outlet) })
      } else {
          queryClient.invalidateQueries({ queryKey: supplierQueryKeys.lists() })
      }
    },
  })
}

/**
 * Hook to update a supplier
 */
export function useUpdateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      kode_supplier,
      data,
    }: {
      kode_supplier: string
      data: Partial<MasterSupplier>
    }) => updateSupplier(kode_supplier, data),
    onSuccess: () => {
       // Ideally we know the outlet to invalidate efficiently
       // But querying all lists is safe enough
       queryClient.invalidateQueries({ queryKey: supplierQueryKeys.lists() })
    },
  })
}

/**
 * Hook to delete a supplier
 */
export function useDeleteSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (kode_supplier: string) => deleteSupplier(kode_supplier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierQueryKeys.lists() })
    },
  })
}

/**
 * Hook to check if current user can edit suppliers
 * Role 1, 6: Can Edit
 * Role 5, 8: Read Only (per requirement)
 */
export function useCanEditSuppliers() {
  const { user } = useAuthUser()
  const role = user?.user_role

  // Default false
  let canEdit = false

  if (role) {
      if (role === 1 || role === 6) {
          canEdit = true
      }
      // Explicitly redundant but clear: roles 5 and 8 are false
  }

  return canEdit
}
