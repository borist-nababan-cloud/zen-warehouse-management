/**
 * Master Barang Service Layer
 *
 * This service handles all product (master_barang) operations.
 * It abstracts the Supabase client calls and provides a clean API for the hooks.
 *
 * ROLE-BASED ACCESS:
 * - Role 1 (admin_holding): Can read all outlets, edit own outlet only
 * - Role 5 (finance): Can read/edit own outlet only
 * - Role 6 (outlet_admin): Can read/edit own outlet only
 * - Role 8 (SUPERUSER): Read-only, can read all outlets
 *
 * IMPORTANT: Do not call Supabase directly from components. Use this service.
 */

import { supabase } from '@/lib/supabase'
import type { MasterBarang, MasterBarangWithType, ApiResponse, PaginatedResponse, RoleId } from '@/types/database'

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

/**
 * Get current user's role from localStorage
 */
function getCurrentUserRole(): RoleId | null {
  const roleStr = localStorage.getItem('user_role')
  if (roleStr === null) return null
  return parseInt(roleStr) as RoleId
}

/**
 * Get current user's outlet code from localStorage
 */
function getCurrentKodeOutlet(): string | null {
  return localStorage.getItem('kode_outlet')
}

// ============================================
// QUERY OPERATIONS
// ============================================

/**
 * Get products with pagination
 * Role-based filtering is handled by RLS policies
 *
 * @param page - Page number (0-based)
 * @param pageSize - Items per page (default 100)
 * @param includeDeleted - Include soft-deleted items
 * @returns Paginated products with type and outlet data
 */
export async function getProductsPaginated(
  page: number = 0,
  pageSize: number = 100,
  includeDeleted: boolean = false
): Promise<PaginatedResponse<MasterBarangWithType>> {
  try {
    // Build query with joins
    let query = supabase
      .from('master_barang')
      .select(`
        *,
        master_type:master_type(*),
        master_outlet:master_outlet(*)
      `, { count: 'exact' })

    // Filter out deleted items unless explicitly requested
    if (!includeDeleted) {
      query = query.eq('deleted', false)
    }

    // Apply pagination
    const from = page * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    return {
      data: data || [],
      error: null,
      isSuccess: true,
      count,
      page,
      pageSize,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get products',
      isSuccess: false,
      count: null,
      page,
      pageSize,
    }
  }
}

/**
 * Get product by composite key (kode_outlet, id)
 * @param kodeOutlet - Outlet code
 * @param id - Product ID
 * @returns Product with type and outlet data
 */
export async function getProductById(
  kodeOutlet: string,
  id: number
): Promise<ApiResponse<MasterBarangWithType>> {
  try {
    const { data, error } = await supabase
      .from('master_barang')
      .select(`
        *,
        master_type:master_type(*),
        master_outlet:master_outlet(*)
      `)
      .eq('kode_outlet', kodeOutlet)
      .eq('id', id)
      .single()

    if (error) throw error

    return {
      data,
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get product',
      isSuccess: false,
    }
  }
}

/**
 * Get products by outlet code
 * @param kodeOutlet - Outlet code
 * @returns List of products for the outlet
 */
export async function getProductsByOutlet(
  kodeOutlet: string
): Promise<ApiResponse<MasterBarangWithType[]>> {
  try {
    const { data, error } = await supabase
      .from('master_barang')
      .select(`
        *,
        master_type:master_type(*),
        master_outlet:master_outlet(*)
      `)
      .eq('kode_outlet', kodeOutlet)
      .eq('deleted', false)
      .order('name', { ascending: true })

    if (error) throw error

    return {
      data: data || [],
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get products by outlet',
      isSuccess: false,
    }
  }
}

// ============================================
// INSERT/UPDATE/DELETE OPERATIONS
// ============================================

/**
 * Create a new product
 * Requires user to have a valid kode_outlet (auto-filled from user's profile)
 * Roles 1, 5, 6 can create; Role 8 cannot
 *
 * @param productData - Product data (kode_outlet will be auto-filled)
 * @returns Created product
 */
export async function createProduct(
  productData: Omit<MasterBarang, 'id' | 'created_at' | 'kode_outlet'>
): Promise<ApiResponse<MasterBarang>> {
  try {
    // Get current user's outlet code
    const kodeOutlet = getCurrentKodeOutlet()

    if (!kodeOutlet) {
      return {
        data: null,
        error: 'User outlet not found. Please contact administrator.',
        isSuccess: false,
      }
    }

    // Check if user is SUPERUSER (should not create)
    const userRole = getCurrentUserRole()
    if (userRole === 8) {
      return {
        data: null,
        error: 'SUPERUSER cannot create products. Read-only access.',
        isSuccess: false,
      }
    }

    // Insert with auto-filled kode_outlet
    const { data, error } = await supabase
      .from('master_barang')
      .insert({
        ...productData,
        kode_outlet: kodeOutlet,
      })
      .select()
      .single()

    if (error) throw error

    return {
      data,
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to create product',
      isSuccess: false,
    }
  }
}

/**
 * Update a product
 * Only can update products from own outlet (except SUPERUSER who cannot update)
 *
 * @param kodeOutlet - Outlet code
 * @param id - Product ID
 * @param productData - Fields to update
 * @returns Updated product
 */
export async function updateProduct(
  kodeOutlet: string,
  id: number,
  productData: Partial<Omit<MasterBarang, 'id' | 'created_at' | 'kode_outlet'>>
): Promise<ApiResponse<MasterBarang>> {
  try {
    // Check if user is SUPERUSER (should not update)
    const userRole = getCurrentUserRole()
    if (userRole === 8) {
      return {
        data: null,
        error: 'SUPERUSER cannot update products. Read-only access.',
        isSuccess: false,
      }
    }

    // RLS will handle the outlet check automatically
    const { data, error } = await supabase
      .from('master_barang')
      .update(productData)
      .eq('kode_outlet', kodeOutlet)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return {
      data,
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to update product',
      isSuccess: false,
    }
  }
}

/**
 * Delete a product (hard delete)
 * Only can delete products from own outlet (except SUPERUSER who cannot delete)
 *
 * @param kodeOutlet - Outlet code
 * @param id - Product ID
 * @returns Success response
 */
export async function deleteProduct(
  kodeOutlet: string,
  id: number
): Promise<ApiResponse<void>> {
  try {
    // Check if user is SUPERUSER (should not delete)
    const userRole = getCurrentUserRole()
    if (userRole === 8) {
      return {
        data: null,
        error: 'SUPERUSER cannot delete products. Read-only access.',
        isSuccess: false,
      }
    }

    // RLS will handle the outlet check automatically
    const { error } = await supabase
      .from('master_barang')
      .delete()
      .eq('kode_outlet', kodeOutlet)
      .eq('id', id)

    if (error) throw error

    return {
      data: null,
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to delete product',
      isSuccess: false,
    }
  }
}

/**
 * Soft delete a product (set deleted=true)
 * Only can soft delete products from own outlet (except SUPERUSER who cannot delete)
 *
 * @param kodeOutlet - Outlet code
 * @param id - Product ID
 * @returns Success response
 */
export async function softDeleteProduct(
  kodeOutlet: string,
  id: number
): Promise<ApiResponse<void>> {
  try {
    // Check if user is SUPERUSER (should not delete)
    const userRole = getCurrentUserRole()
    if (userRole === 8) {
      return {
        data: null,
        error: 'SUPERUSER cannot delete products. Read-only access.',
        isSuccess: false,
      }
    }

    // RLS will handle the outlet check automatically
    const { error } = await supabase
      .from('master_barang')
      .update({ deleted: true })
      .eq('kode_outlet', kodeOutlet)
      .eq('id', id)

    if (error) throw error

    return {
      data: null,
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to delete product',
      isSuccess: false,
    }
  }
}

// ============================================
// CHECK PERMISSIONS
// ============================================

/**
 * Check if current user can edit products
 * SUPERUSER (role 8) cannot edit
 */
export function canCurrentUserEditProducts(): boolean {
  const userRole = getCurrentUserRole()
  return userRole !== 8 && userRole !== null
}

/**
 * Check if current user can see all outlets' products
 * Only roles 1 and 8 can see all data
 */
export function canUserSeeAllOutlets(): boolean {
  const userRole = getCurrentUserRole()
  return userRole === 1 || userRole === 8
}
