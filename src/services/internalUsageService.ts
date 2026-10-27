import { supabase } from '@/lib/supabase'
import {
  ApiResponse,
  InternalUsageHeader,
  MasterIssueCategory,
  InternalUsageItem
} from '@/types/database'

export const internalUsageService = {
  // Get Categories (defaults to only active for operational forms)
  async getCategories(onlyActive = true): Promise<ApiResponse<MasterIssueCategory[]>> {
    try {
      let query = supabase
        .from('master_issue_category')
        .select('*')
        .order('category_name')

      if (onlyActive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw error
      return { data, error: null, isSuccess: true }
    } catch (error: any) {
      return { data: null, error: error.message, isSuccess: false }
    }
  },

  // Get All Categories for Master Data Management (includes active & inactive)
  async getAllCategories(): Promise<ApiResponse<MasterIssueCategory[]>> {
    try {
      const { data, error } = await supabase
        .from('master_issue_category')
        .select('*')
        .order('id', { ascending: true })

      if (error) throw error
      return { data, error: null, isSuccess: true }
    } catch (error: any) {
      return { data: null, error: error.message, isSuccess: false }
    }
  },

  // Create Category (No delete allowed in system)
  async createCategory(
    payload: { category_name: string; description?: string; is_active?: boolean },
    userId?: string
  ): Promise<ApiResponse<MasterIssueCategory>> {
    try {
      const { data, error } = await supabase
        .from('master_issue_category')
        .insert({
          category_name: payload.category_name.trim(),
          description: payload.description ? payload.description.trim() : null,
          is_active: payload.is_active ?? true,
          created_by: userId || null,
          update_by: userId || null
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null, isSuccess: true }
    } catch (error: any) {
      return { data: null, error: error.message, isSuccess: false }
    }
  },

  // Update Category
  async updateCategory(
    id: number,
    payload: { category_name?: string; description?: string; is_active?: boolean },
    userId?: string
  ): Promise<ApiResponse<MasterIssueCategory>> {
    try {
      const updateData: any = {
        update_by: userId || null,
        update_at: new Date().toISOString()
      }
      if (payload.category_name !== undefined) updateData.category_name = payload.category_name.trim()
      if (payload.description !== undefined) updateData.description = payload.description ? payload.description.trim() : null
      if (payload.is_active !== undefined) updateData.is_active = payload.is_active

      const { data, error } = await supabase
        .from('master_issue_category')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null, isSuccess: true }
    } catch (error: any) {
      return { data: null, error: error.message, isSuccess: false }
    }
  },

  // Toggle Category Active Status
  async toggleCategoryStatus(
    id: number,
    isActive: boolean,
    userId?: string
  ): Promise<ApiResponse<MasterIssueCategory>> {
    return this.updateCategory(id, { is_active: isActive }, userId)
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
