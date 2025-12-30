/**
 * Barang Price & Unit Hooks
 *
 * TanStack Query hooks for product price and unit management.
 * Provides caching, loading states, and error handling.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getPriceUnitsPaginated,
  searchPriceUnits,
  updatePriceUnit,
  canEditProduct,
  getOutletLabel,
} from '@/services/barangPriceUnitService'
import type { PriceUnitUpdateData } from '@/types/database'

// Query keys for cache management
export const barangPriceUnitQueryKeys = {
  all: ['barang_price_unit'] as const,
  lists: () => [...barangPriceUnitQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...barangPriceUnitQueryKeys.lists(), filters] as const,
  search: (query: string) => [...barangPriceUnitQueryKeys.all, 'search', query] as const,
}

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to get products with prices and units (paginated)
 *
 * @param kode_outlet - Outlet code to filter by
 * @param page - Page number (0-indexed)
 * @param pageSize - Items per page
 */
export function usePriceUnitsPaginated(kode_outlet: string, page: number = 0, pageSize: number = 100) {
  return useQuery({
    queryKey: barangPriceUnitQueryKeys.list({ kode_outlet, page, pageSize }),
    queryFn: () => getPriceUnitsPaginated(kode_outlet, page, pageSize),
    enabled: !!kode_outlet,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to search products with prices and units
 *
 * @param kode_outlet - Outlet code
 * @param searchQuery - Search term
 */
export function useSearchPriceUnits(kode_outlet: string, searchQuery: string) {
  return useQuery({
    queryKey: barangPriceUnitQueryKeys.search(searchQuery),
    queryFn: () => searchPriceUnits(kode_outlet, searchQuery),
    enabled: !!kode_outlet && searchQuery.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes for search results
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to update price and unit for a product
 */
export function useUpdatePriceUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ updateData, updatedBy }: { updateData: PriceUnitUpdateData; updatedBy: string }) =>
      updatePriceUnit(updateData, updatedBy),
    onSuccess: () => {
      // Invalidate the list query to refetch
      queryClient.invalidateQueries({
        queryKey: barangPriceUnitQueryKeys.lists(),
      })
    },
  })
}

// ============================================
// HELPER HOOKS
// ============================================

/**
 * Hook to check if current user can edit a product
 *
 * @param userOutletCode - User's outlet code from localStorage
 */
export function useCanEditProduct(userOutletCode: string | null) {
  return {
    canEdit: (productOutletCode: string) => {
      if (!userOutletCode) return false
      return canEditProduct(userOutletCode, productOutletCode)
    },
  }
}

/**
 * Hook to get outlet label
 */
export function useOutletLabel() {
  return {
    getLabel: getOutletLabel,
  }
}
