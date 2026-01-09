import { supabase } from '../lib/supabase'
import { MasterBank, ApiResponse } from '../types/database'

/**
 * Get all banks
 * RLS: Public/Auth read access
 */
export async function getAllBanks(): Promise<ApiResponse<MasterBank[]>> {
  try {
    const { data, error } = await supabase
      .from('master_bank')
      .select('*')
      .order('bank_name', { ascending: true })

    if (error) throw error

    return {
      data,
      error: null,
      isSuccess: true,
    }
  } catch (error: any) {
    console.error('Error fetching banks:', error)
    return {
      data: null,
      error: error.message || 'Failed to fetch banks',
      isSuccess: false,
    }
  }
}
