/**
 * Master Type Hooks
 *
 * These hooks use TanStack Query to manage product type state.
 * They provide caching, loading states, and error handling out of the box.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAllTypes,
  getTypeById,
  createType,
  updateType,
  deleteType,
} from '@/services/masterTypeService'
import type { MasterType } from '@/types/database'

// Query keys for cache management
export const masterTypeQueryKeys = {
  all: ['master_type'] as const,
  lists: () => [...masterTypeQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...masterTypeQueryKeys.lists(), filters] as const,
  details: () => [...masterTypeQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...masterTypeQueryKeys.details(), id] as const,
}

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to get all product types
 * Used for dropdown in product form
 */
export function useAllTypes() {
  return useQuery({
    queryKey: masterTypeQueryKeys.lists(),
    queryFn: getAllTypes,
    staleTime: 1000 * 60 * 10, // 10 minutes - types don't change often
  })
}

/**
 * Hook to get a product type by ID
 * @param id - Type ID
 */
export function useType(id: number) {
  return useQuery({
    queryKey: masterTypeQueryKeys.detail(id),
    queryFn: () => getTypeById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to create a new product type
 * Only available to role 1 (admin_holding)
 */
export function useCreateType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<MasterType, 'id' | 'created_at'>) => createType(data),
    onSuccess: () => {
      // Invalidate types list to refetch
      queryClient.invalidateQueries({ queryKey: masterTypeQueryKeys.lists() })
    },
  })
}

/**
 * Hook to update a product type
 * Only available to role 1 (admin_holding)
 */
export function useUpdateType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<MasterType, 'id' | 'created_at'>> }) =>
      updateType(id, data),
    onSuccess: (_, variables) => {
      // Invalidate both list and detail
      queryClient.invalidateQueries({ queryKey: masterTypeQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: masterTypeQueryKeys.detail(variables.id) })
    },
  })
}

/**
 * Hook to delete a product type
 * Only available to role 1 (admin_holding)
 */
export function useDeleteType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteType(id),
    onSuccess: () => {
      // Invalidate types list to refetch
      queryClient.invalidateQueries({ queryKey: masterTypeQueryKeys.lists() })
    },
  })
}
