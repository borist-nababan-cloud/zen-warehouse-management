/**
 * Master Barang Hooks
 *
 * These hooks use TanStack Query to manage product state.
 * They provide caching, loading states, and error handling out of the box.
 *
 * ROLE-BASED ACCESS:
 * - Role 1, 5, 6: Full CRUD access to own outlet's products
 * - Role 8: Read-only access to all products
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getProductsPaginated,
  getProductById,
  getProductsByOutlet,
  createProduct,
  updateProduct,
  deleteProduct,
  softDeleteProduct,
  canCurrentUserEditProducts,
  canUserSeeAllOutlets,
} from '@/services/masterBarangService'
import type { MasterBarang } from '@/types/database'

// Query keys for cache management
export const masterBarangQueryKeys = {
  all: ['master_barang'] as const,
  lists: () => [...masterBarangQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...masterBarangQueryKeys.lists(), filters] as const,
  details: () => [...masterBarangQueryKeys.all, 'detail'] as const,
  detail: (kodeOutlet: string, id: number) =>
    [...masterBarangQueryKeys.details(), kodeOutlet, id] as const,
}

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook to get paginated products
 * Role-based filtering is handled by RLS policies
 *
 * @param page - Page number (0-based)
 * @param pageSize - Items per page (default 100)
 * @param includeDeleted - Include soft-deleted items
 */
export function useProductsPaginated(
  page: number = 0,
  pageSize: number = 100,
  includeDeleted: boolean = false
) {
  return useQuery({
    queryKey: masterBarangQueryKeys.list({ page, pageSize, includeDeleted }),
    queryFn: () => getProductsPaginated(page, pageSize, includeDeleted),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Hook to get a product by composite key (kode_outlet, id)
 * @param kodeOutlet - Outlet code
 * @param id - Product ID
 */
export function useProduct(kodeOutlet: string, id: number) {
  return useQuery({
    queryKey: masterBarangQueryKeys.detail(kodeOutlet, id),
    queryFn: () => getProductById(kodeOutlet, id),
    enabled: !!kodeOutlet && !!id,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Hook to get products by outlet code
 * @param kodeOutlet - Outlet code
 */
export function useProductsByOutlet(kodeOutlet: string) {
  return useQuery({
    queryKey: ['master_barang', 'outlet', kodeOutlet],
    queryFn: () => getProductsByOutlet(kodeOutlet),
    enabled: !!kodeOutlet,
    staleTime: 1000 * 60 * 2,
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook to create a new product
 * Requires user to have a valid kode_outlet (auto-filled)
 * Roles 1, 5, 6 can create; Role 8 cannot
 */
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<MasterBarang, 'id' | 'created_at' | 'kode_outlet'>) =>
      createProduct(data),
    onSuccess: () => {
      // Invalidate products list to refetch
      queryClient.invalidateQueries({ queryKey: masterBarangQueryKeys.lists() })
    },
  })
}

/**
 * Hook to update a product
 * Only can update products from own outlet (except SUPERUSER)
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      kodeOutlet,
      id,
      data,
    }: {
      kodeOutlet: string
      id: number
      data: Partial<Omit<MasterBarang, 'id' | 'created_at' | 'kode_outlet'>>
    }) => updateProduct(kodeOutlet, id, data),
    onSuccess: (_, variables) => {
      // Invalidate both list and detail
      queryClient.invalidateQueries({ queryKey: masterBarangQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: masterBarangQueryKeys.detail(variables.kodeOutlet, variables.id),
      })
    },
  })
}

/**
 * Hook to delete a product (hard delete)
 * Only can delete products from own outlet (except SUPERUSER)
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ kodeOutlet, id }: { kodeOutlet: string; id: number }) =>
      deleteProduct(kodeOutlet, id),
    onSuccess: () => {
      // Invalidate products list to refetch
      queryClient.invalidateQueries({ queryKey: masterBarangQueryKeys.lists() })
    },
  })
}

/**
 * Hook to soft delete a product (set deleted=true)
 * Only can delete products from own outlet (except SUPERUSER)
 */
export function useSoftDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ kodeOutlet, id }: { kodeOutlet: string; id: number }) =>
      softDeleteProduct(kodeOutlet, id),
    onSuccess: (_, variables) => {
      // Invalidate both list and detail
      queryClient.invalidateQueries({ queryKey: masterBarangQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: masterBarangQueryKeys.detail(variables.kodeOutlet, variables.id),
      })
    },
  })
}

// ============================================
// PERMISSION HOOKS
// ============================================

/**
 * Hook to check if current user can edit products
 * SUPERUSER (role 8) cannot edit
 */
export function useCanEditProducts() {
  return {
    canEdit: canCurrentUserEditProducts(),
  }
}

/**
 * Hook to check if current user can see all outlets' products
 * Only roles 1 and 8 can see all data
 */
export function useCanSeeAllOutlets() {
  return {
    canSeeAll: canUserSeeAllOutlets(),
  }
}
