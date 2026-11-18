import { supabase } from '@/lib/supabase'
import { ApiResponse, MasterCustomer, MasterCustomerWithRelations } from '@/types/database'

export async function getCustomers(
  kode_outlet?: string
): Promise<ApiResponse<MasterCustomerWithRelations[]>> {
  try {
    let query = supabase
      .from('master_customer')
      .select(`
        *,
        master_bank:kode_bank (*),
        master_outlet:kode_outlet (*)
      `)
      .order('created_at', { ascending: false })

    if (kode_outlet && kode_outlet !== 'ALL') {
      query = query.eq('kode_outlet', kode_outlet)
    }

    const { data, error } = await query
    if (error) throw error

    return {
      data: (data || []) as MasterCustomerWithRelations[],
      error: null,
      isSuccess: true,
    }
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    return {
      data: null,
      error: error.message || 'Gagal memuat data customer',
      isSuccess: false,
    }
  }
}

export async function createCustomer(
  customerData: Omit<MasterCustomer, 'kode_customer' | 'created_at' | 'update_at'>
): Promise<ApiResponse<MasterCustomer>> {
  try {
    const payload = {
      ...customerData,
      kode_bank: customerData.kode_bank === '' ? null : customerData.kode_bank,
      created_at: new Date().toISOString(),
      update_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('master_customer')
      .insert(payload)
      .select()
      .single()

    if (error) throw error

    return {
      data: data as MasterCustomer,
      error: null,
      isSuccess: true,
    }
  } catch (error: any) {
    console.error('Error creating customer:', error)
    return {
      data: null,
      error: error.message || 'Gagal menambahkan customer',
      isSuccess: false,
    }
  }
}

export async function updateCustomer(
  kode_customer: string,
  customerData: Partial<MasterCustomer>
): Promise<ApiResponse<MasterCustomer>> {
  try {
    const payload: Partial<MasterCustomer> = {
      ...customerData,
      update_at: new Date().toISOString(),
    }
    if (payload.kode_bank === '') {
      payload.kode_bank = null
    }

    const { data, error } = await supabase
      .from('master_customer')
      .update(payload)
      .eq('kode_customer', kode_customer)
      .select()
      .single()

    if (error) throw error

    return {
      data: data as MasterCustomer,
      error: null,
      isSuccess: true,
    }
  } catch (error: any) {
    console.error('Error updating customer:', error)
    return {
      data: null,
      error: error.message || 'Gagal memperbarui customer',
      isSuccess: false,
    }
  }
}

export async function deleteCustomer(kode_customer: string): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('master_customer')
      .delete()
      .eq('kode_customer', kode_customer)

    if (error) throw error

    return {
      data: null,
      error: null,
      isSuccess: true,
    }
  } catch (error: any) {
    console.error('Error deleting customer:', error)
    return {
      data: null,
      error: error.message || 'Gagal menghapus customer (mungkin sudah memiliki transaksi)',
      isSuccess: false,
    }
  }
}
