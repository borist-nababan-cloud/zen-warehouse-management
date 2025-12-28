/**
 * Master Type Service Layer
 *
 * This service handles all product type (master_type) operations.
 * It abstracts the Supabase client calls and provides a clean API for the hooks.
 *
 * IMPORTANT: Do not call Supabase directly from components. Use this service.
 */

import { supabase } from '@/lib/supabase'
import type { MasterType, ApiResponse } from '@/types/database'

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get all product types
 * @returns List of all product types ordered by name
 */
export async function getAllTypes(): Promise<ApiResponse<MasterType[]>> {
  try {
    const { data, error } = await supabase
      .from('master_type')
      .select('*')
      .order('nama_type', { ascending: true })

    if (error) throw error

    return {
      data: data || [],
      error: null,
      isSuccess: true,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to get product types',
      isSuccess: false,
    }
  }
}

/**
 * Get product type by ID
 * @param id - Type ID
 * @returns Product type data
 */
export async function getTypeById(id: number): Promise<ApiResponse<MasterType>> {
  try {
    const { data, error } = await supabase
      .from('master_type')
      .select('*')
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
      error: error instanceof Error ? error.message : 'Failed to get product type',
      isSuccess: false,
    }
  }
}

/**
 * Create a new product type
 * Only role 1 (admin_holding) can create types
 * @param typeData - Product type data
 * @returns Created product type
 */
export async function createType(
  typeData: Omit<MasterType, 'id' | 'created_at'>
): Promise<ApiResponse<MasterType>> {
  try {
    const { data, error } = await supabase
      .from('master_type')
      .insert(typeData)
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
      error: error instanceof Error ? error.message : 'Failed to create product type',
      isSuccess: false,
    }
  }
}

/**
 * Update a product type
 * Only role 1 (admin_holding) can update types
 * @param id - Type ID
 * @param typeData - Fields to update
 * @returns Updated product type
 */
export async function updateType(
  id: number,
  typeData: Partial<Omit<MasterType, 'id' | 'created_at'>>
): Promise<ApiResponse<MasterType>> {
  try {
    const { data, error } = await supabase
      .from('master_type')
      .update(typeData)
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
      error: error instanceof Error ? error.message : 'Failed to update product type',
      isSuccess: false,
    }
  }
}

/**
 * Delete a product type
 * Only role 1 (admin_holding) can delete types
 * @param id - Type ID
 * @returns Success response
 */
export async function deleteType(id: number): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('master_type')
      .delete()
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
      error: error instanceof Error ? error.message : 'Failed to delete product type',
      isSuccess: false,
    }
  }
}
