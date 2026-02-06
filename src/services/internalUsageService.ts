import { supabase } from '@/lib/supabase'
import {
  ApiResponse,
  InternalUsageHeader,
  MasterIssueCategory,
  InternalUsageItem
} from '@/types/database'

export const internalUsageService = {
  // Get Categories
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
  async getUsageList(
    outletCode: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<InternalUsageHeader[]>> {
    try {
      let query = supabase
        .from('internal_usage_headers')
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
      console.error('Error fetching usage list:', error)
      return { data: null, error: error.message, isSuccess: false }
    }
  },

  // Get By ID (for Print/View)
  async getUsageById(id: string): Promise<ApiResponse<InternalUsageHeader>> {
    try {
      const { data, error } = await supabase
        .from('internal_usage_headers')
        .select(`
          *,
          master_issue_category (category_name),
          master_outlet (*),
          internal_usage_items (
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

  // Create New Usage
  async createUsage(
    header: Omit<InternalUsageHeader, 'id' | 'document_number' | 'created_at' | 'created_by'>,
    items: Omit<InternalUsageItem, 'id' | 'header_id'>[],
    userId: string
  ): Promise<ApiResponse<InternalUsageHeader>> {
    try {
      // 1. Insert Header
      const { data: headerData, error: headerError } = await supabase
        .from('internal_usage_headers')
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
        .from('internal_usage_items')
        .insert(itemsWithHeader)

      if (itemsError) {
        // Rollback strategy: In Supabase/Postgres, we can't easily rollback a transaction from client
        // unless we use RPC. For now, we assume trigger handles validation or we handle cleanup.
        // Ideally, this should be an RPC.
        throw itemsError
      }

      return { data: headerData, error: null, isSuccess: true }

    } catch (error: any) {
      console.error('Error creating internal usage:', error)
      return { data: null, error: error.message, isSuccess: false }
    }
  }
}
