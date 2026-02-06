import { supabase } from '@/lib/supabase'
import {
  ApiResponse,
  InternalReturnHeader,
  InternalReturnItem,
  MasterIssueCategory
} from '@/types/database'

export const internalReturnService = {
  // Get Categories (Reuse same table as Internal Usage)
  async getCategories(): Promise<ApiResponse<MasterIssueCategory[]>> {
    try {
      const { data, error } = await supabase
        .from('master_issue_category')
        .select('*')
        .order('category_name')

      if (error) throw error
      return { data, error: null, isSuccess: true }
    } catch (error: any) {
      return { data: null, error: error.message, isSuccess: false }
    }
  },

  // Get List
  async getReturnList(
    outletCode: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<InternalReturnHeader[]>> {
    try {
      let query = supabase
        .from('internal_return_headers')
        .select(`
          *,
          master_issue_category (category_name),
          master_outlet (name_outlet)
        `)
        .order('created_at', { ascending: false })

      if (outletCode !== 'ALL') {
        query = query.eq('kode_outlet', outletCode)
      }

      if (startDate) {
        query = query.gte('transaction_date', startDate)
      }
      if (endDate) {
        query = query.lte('transaction_date', endDate)
      }

      const { data, error } = await query
      if (error) throw error
      return { data, error: null, isSuccess: true }
    } catch (error: any) {
      console.error('Error fetching return list:', error)
      return { data: null, error: error.message, isSuccess: false }
    }
  },

  // Get By ID
  async getReturnById(id: string): Promise<ApiResponse<InternalReturnHeader>> {
    try {
      const { data, error } = await supabase
        .from('internal_return_headers')
        .select(`
          *,
          master_issue_category (category_name),
          master_outlet (*),
          internal_return_items (
            *,
            master_barang (sku, name)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return { data, error: null, isSuccess: true }
    } catch (error: any) {
      return { data: null, error: error.message, isSuccess: false }
    }
  },

  // Create New Return
  async createReturn(
    header: Omit<InternalReturnHeader, 'id' | 'document_number' | 'created_at' | 'created_by'>,
    items: Omit<InternalReturnItem, 'id' | 'header_id'>[],
    userId: string
  ): Promise<ApiResponse<InternalReturnHeader>> {
    try {
      // 1. Insert Header
      const { data: headerData, error: headerError } = await supabase
        .from('internal_return_headers')
        .insert([{
          ...header,
          created_by: userId
        }])
        .select()
        .single()

      if (headerError) throw headerError
      if (!headerData) throw new Error('Failed to create header')

      // 2. Insert Items
      const itemsWithHeader = items.map(item => ({
        ...item,
        header_id: headerData.id
      }))

      const { error: itemsError } = await supabase
        .from('internal_return_items')
        .insert(itemsWithHeader)

      if (itemsError) {
        throw itemsError
      }

      return { data: headerData, error: null, isSuccess: true }

    } catch (error: any) {
      console.error('Error creating internal return:', error)
      return { data: null, error: error.message, isSuccess: false }
    }
  }
}
