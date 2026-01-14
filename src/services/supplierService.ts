import { supabase } from '../lib/supabase'
import { MasterSupplier, MasterSupplierWithBank, ApiResponse } from '../types/database'

/**
 * Get suppliers for a specific outlet
 * RLS: Users only see their own outlet's data (or Holding '111' sees all if policy allows)
 */
export async function getSuppliers(kode_outlet: string): Promise<ApiResponse<MasterSupplierWithBank[]>> {
  try {
    // We join with master_bank to get bank details
    // RLS policies will automatically filter by kode_outlet
    // BUT we add explicit filter to be safe and consistent with other modules
    let query = supabase
      .from('master_supplier')
      .select(`
        *,
        master_bank:kode_bank (*),
        master_outlet:kode_outlet (*)
      `)
      .order('created_at', { ascending: false })

    // Apply outlet filter if not holding seeing all
    // Usually RLS handles this, but explicit filter doesn't hurt
    // We'll trust RLS primarily, but if the caller passes kode_outlet, we can use it
    if (kode_outlet) {
        query = query.eq('kode_outlet', kode_outlet)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      data: data as MasterSupplierWithBank[],
      error: null,
      isSuccess: true,
    }
  } catch (error: any) {
    console.error('Error fetching suppliers:', error)
    return {
      data: null,
      error: error.message || 'Failed to fetch suppliers',
      isSuccess: false,
    }
  }
}

/**
 * Create a new supplier
 */
export async function createSupplier(supplierData: Omit<MasterSupplier, 'kode_supplier' | 'created_at'>): Promise<ApiResponse<MasterSupplier>> {
  try {
    // Sanitize data: Ensure empty strings for UUID fields are null
    const payload = {
      ...supplierData,
      kode_bank: supplierData.kode_bank === '' ? null : supplierData.kode_bank,
      // Table doesn't have default for created_at, so we must provide it
      created_at: new Date().toISOString() 
    }

    const { data, error } = await supabase
      .from('master_supplier')
      .insert(payload)
      .select()
      .single()

    if (error) throw error

    return {
      data,
      error: null,
      isSuccess: true,
    }
  } catch (error: any) {
    console.error('Error creating supplier:', error)
    return {
      data: null,
      error: error.message || 'Failed to create supplier',
      isSuccess: false,
    }
  }
}

/**
 * Update a supplier
 */
export async function updateSupplier(kode_supplier: string, supplierData: Partial<MasterSupplier>): Promise<ApiResponse<MasterSupplier>> {
  try {
    // Sanitize data
    const payload = { ...supplierData }
    if (payload.kode_bank === '') {
        payload.kode_bank = null
    }

    const { data, error } = await supabase
      .from('master_supplier')
      .update(payload)
      .eq('kode_supplier', kode_supplier)
      .select()
      .single()

    if (error) throw error

    return {
      data,
      error: null,
      isSuccess: true,
    }
  } catch (error: any) {
    console.error('Error updating supplier:', error)
    return {
      data: null,
      error: error.message || 'Failed to update supplier',
      isSuccess: false,
    }
  }
}

/**
 * Delete a supplier
 */
export async function deleteSupplier(kode_supplier: string): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('master_supplier')
      .delete()
      .eq('kode_supplier', kode_supplier)

    if (error) throw error

    return {
      data: null,
      error: null,
      isSuccess: true,
    }
  } catch (error: any) {
    console.error('Error deleting supplier:', error)
    return {
      data: null,
      error: error.message || 'Failed to delete supplier',
      isSuccess: false,
    }
  }
}
