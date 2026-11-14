import { supabase } from '@/lib/supabase'
import { ApiResponse, InventoryShrinkageLog, StockOpnameHeader, StockOpnameStatus, MasterShrinkageCategory, InventoryBalance, InventoryReportItem, ShrinkageReportItem, OpnameVarianceItem } from '@/types/database'

// ==========================================
// SHRINKAGE
// ==========================================

export async function getShrinkageCategories(_outletId?: string): Promise<ApiResponse<MasterShrinkageCategory[]>> {
    const { data, error } = await supabase
        .from('master_shrinkage_categories')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
    
    if (error) return { data: null, error: error.message, isSuccess: false }
    return { data: data as MasterShrinkageCategory[], error: null, isSuccess: true }
}

export async function getAllShrinkageCategories(): Promise<ApiResponse<MasterShrinkageCategory[]>> {
    const { data, error } = await supabase
        .from('master_shrinkage_categories')
        .select('*')
        .order('name', { ascending: true })

    if (error) return { data: null, error: error.message, isSuccess: false }
    return { data: data as MasterShrinkageCategory[], error: null, isSuccess: true }
}

export async function createShrinkageCategory(
    payload: { name: string; description?: string; is_active?: boolean; kode_outlet?: string },
    userId?: string
): Promise<ApiResponse<MasterShrinkageCategory>> {
    const { data, error } = await supabase
        .from('master_shrinkage_categories')
        .insert({
            name: payload.name.trim(),
            description: payload.description?.trim() || null,
            is_active: payload.is_active ?? true,
            kode_outlet: payload.kode_outlet || '111',
            created_by: userId || null,
            update_by: userId || null
        })
        .select()
        .single()

    if (error) return { data: null, error: error.message, isSuccess: false }
    return { data: data as MasterShrinkageCategory, error: null, isSuccess: true }
}

export async function updateShrinkageCategory(
    id: string,
    payload: { name: string; description?: string; is_active?: boolean },
    userId?: string
): Promise<ApiResponse<MasterShrinkageCategory>> {
    const { data, error } = await supabase
        .from('master_shrinkage_categories')
        .update({
            name: payload.name.trim(),
            description: payload.description?.trim() || null,
            is_active: payload.is_active ?? true,
            update_by: userId || null,
            update_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

    if (error) return { data: null, error: error.message, isSuccess: false }
    return { data: data as MasterShrinkageCategory, error: null, isSuccess: true }
}

export async function toggleShrinkageCategoryStatus(
    id: string,
    is_active: boolean,
    userId?: string
): Promise<ApiResponse<MasterShrinkageCategory>> {
    const { data, error } = await supabase
        .from('master_shrinkage_categories')
        .update({
            is_active,
            update_by: userId || null,
            update_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

    if (error) return { data: null, error: error.message, isSuccess: false }
    return { data: data as MasterShrinkageCategory, error: null, isSuccess: true }
}

export async function createShrinkageLog(
    payload: Omit<InventoryShrinkageLog, 'id' | 'created_at' | 'document_number' | 'created_by'>
): Promise<ApiResponse<InventoryShrinkageLog>> {
    
    // Auto-generate document number? Or handled by trigger?
    // Schema says document_number is NOT NULL text.
    // Usually we generate it on client or have a trigger.
    // Assuming client side generation for now: "SHR-YYYYMMDD-XXXX" or similar.
    // Simplified: "SHR-" + Date.now()
    
    const docNum = `SHR-${Date.now()}`

    const { data, error } = await supabase
        .from('inventory_shrinkage_logs')
        .insert({
            ...payload,
            document_number: docNum,
            created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single()

    if (error) return { data: null, error: error.message, isSuccess: false }
    return { data: data as InventoryShrinkageLog, error: null, isSuccess: true }
}


// ==========================================
// STOCK OPNAME
// ==========================================

export async function getInventoryBalanceForOpname(outletId: string): Promise<ApiResponse<InventoryBalance[]>> {
    // Join with master_barang to get names and SKUs
    const { data, error } = await supabase
        .from('inventory_balance')
        .select(`
            *,
            master_barang (
                id, name, sku, id_type, master_type(nama_type)
            )
        `)
        .eq('kode_outlet', outletId)
        .order('barang_id', { ascending: true })

    if (error) return { data: null, error: error.message, isSuccess: false }
    return { data: data as any[], error: null, isSuccess: true }
}

interface OpnamePayload {
    kode_outlet: string
    notes?: string
    items: {
        barang_id: number
        system_qty: number
        actual_qty: number
        notes?: string
    }[]
}

export async function createStockOpname(payload: OpnamePayload): Promise<ApiResponse<StockOpnameHeader>> {
    const user = (await supabase.auth.getUser()).data.user

    // 1. Create Header with PENDING_APPROVAL status
    const docNum = `SO-${Date.now()}`
    
    const { data: header, error: headerError } = await supabase
        .from('stock_opname_headers')
        .insert({
            document_number: docNum,
            kode_outlet: payload.kode_outlet,
            notes: payload.notes,
            created_by: user?.id,
            status: 'PENDING_APPROVAL'
        })
        .select()
        .single()

    if (headerError || !header) {
        return { data: null, error: headerError?.message || 'Failed to create header', isSuccess: false }
    }

    // 2. Insert Items (difference is calculated automatically by PostgreSQL GENERATED ALWAYS AS (actual_qty - system_qty))
    const itemsToInsert = payload.items.map(item => ({
        header_id: header.id,
        barang_id: item.barang_id,
        system_qty: item.system_qty,
        actual_qty: item.actual_qty,
        notes: item.notes
    }))

    const { error: itemsError } = await supabase
        .from('stock_opname_items')
        .insert(itemsToInsert)

    if (itemsError) {
        // Rollback header manually if items fail
        await supabase.from('stock_opname_headers').delete().eq('id', header.id)
        return { data: null, error: itemsError.message, isSuccess: false }
    }

    // Inventory balance is NOT updated here.
    // Stock will only be updated upon approval by Role 5, 8, or 14 via approve_stock_opname RPC.
    return { data: header as StockOpnameHeader, error: null, isSuccess: true }
}

// ==========================================
// STOCK OPNAME BATCH APPROVAL MANAGEMENT
// ==========================================

export interface StockOpnameBatchRow {
    id: string
    document_number: string
    kode_outlet: string
    opname_date: string
    status: StockOpnameStatus
    notes: string | null
    created_at: string
    created_by: string | null
    master_outlet?: {
        name_outlet: string
    }
    stock_opname_items?: {
        id: string
        barang_id: number
        system_qty: number
        actual_qty: number
        difference: number
        notes: string | null
    }[]
}

export async function getStockOpnameBatches(
    outletCode?: string,
    status?: string,
    startDate?: string,
    endDate?: string
): Promise<ApiResponse<StockOpnameBatchRow[]>> {
    try {
        let query = supabase
            .from('stock_opname_headers')
            .select(`
                *,
                master_outlet:master_outlet(name_outlet),
                stock_opname_items(id, barang_id, system_qty, actual_qty, difference, notes)
            `)
            .order('created_at', { ascending: false })

        if (outletCode && outletCode !== 'ALL') {
            query = query.eq('kode_outlet', outletCode)
        }

        if (status && status !== 'ALL') {
            query = query.eq('status', status)
        }

        if (startDate && endDate) {
            query = query.gte('opname_date', startDate).lte('opname_date', endDate)
        }

        const { data, error } = await query
        if (error) throw error

        return { data: data as StockOpnameBatchRow[], error: null, isSuccess: true }
    } catch (err: any) {
        console.error('Error fetching stock opname batches:', err)
        return { data: null, error: err.message, isSuccess: false }
    }
}

export async function getStockOpnameBatchDetail(headerId: string): Promise<ApiResponse<any>> {
    try {
        const { data, error } = await supabase
            .from('stock_opname_headers')
            .select(`
                *,
                master_outlet:master_outlet(name_outlet),
                stock_opname_items(
                    *,
                    master_barang(id, name, sku, image1_url)
                )
            `)
            .eq('id', headerId)
            .single()

        if (error) throw error
        return { data, error: null, isSuccess: true }
    } catch (err: any) {
        return { data: null, error: err.message, isSuccess: false }
    }
}

export async function approveStockOpnameBatch(headerId: string): Promise<ApiResponse<any>> {
    try {
        const user = (await supabase.auth.getUser()).data.user
        const { data, error } = await supabase.rpc('approve_stock_opname', {
            p_header_id: headerId,
            p_user_id: user?.id
        })
        if (error) throw error
        if (data && !data.success) throw new Error(data.error || 'Failed to approve stock opname')

        return { data, error: null, isSuccess: true }
    } catch (err: any) {
        console.error('Error approving stock opname batch:', err)
        return { data: null, error: err.message, isSuccess: false }
    }
}

export async function rejectStockOpnameBatch(headerId: string, reason: string): Promise<ApiResponse<any>> {
    try {
        const user = (await supabase.auth.getUser()).data.user
        const { data, error } = await supabase.rpc('reject_stock_opname', {
            p_header_id: headerId,
            p_user_id: user?.id,
            p_reason: reason
        })
        if (error) throw error
        if (data && !data.success) throw new Error(data.error || 'Failed to reject stock opname')

        return { data, error: null, isSuccess: true }
    } catch (err: any) {
        console.error('Error rejecting stock opname batch:', err)
        return { data: null, error: err.message, isSuccess: false }
    }
}

// ==========================================
// REPORTS
// ==========================================

export async function getInventoryReport(kode_outlet?: string): Promise<ApiResponse<InventoryReportItem[]>> {
    let query = supabase
        .from('view_inventory_report')
        .select('*')
        .order('item_name', { ascending: true })

    if (kode_outlet && kode_outlet !== 'ALL') {
        query = query.eq('kode_outlet', kode_outlet)
    }

    const { data, error } = await query

    if (error) return { data: null, error: error.message, isSuccess: false }
    return { data: data as InventoryReportItem[], error: null, isSuccess: true }
}

export async function getShrinkageReport(outletCode: string, startDate?: string, endDate?: string): Promise<ApiResponse<ShrinkageReportItem[]>> {
    let query = supabase
        .from('view_report_shrinkage_analysis')
        .select('*')
        .order('transaction_date', { ascending: false })

    if (outletCode && outletCode !== 'ALL') {
        query = query.eq('kode_outlet', outletCode)
    }

    if (startDate) {
        query = query.gte('transaction_date', startDate)
    }
    if (endDate) {
        query = query.lte('transaction_date', endDate)
    }

    const { data, error } = await query

    if (error) return { data: null, error: error.message, isSuccess: false }
    return { data: data as ShrinkageReportItem[], error: null, isSuccess: true }
}

// ==========================================
// OPNAME VARIANCE REPORT
// ==========================================

export async function getOpnameVarianceReport(
  outletCode?: string,
  startDate?: string,
  endDate?: string,
  documentNumber?: string
): Promise<ApiResponse<OpnameVarianceItem[]>> {
  try {
    let query = supabase
      .from('view_report_opname_variance')
      .select('*')
      .order('opname_date', { ascending: false })

    if (outletCode && outletCode !== 'ALL') {
      query = query.eq('kode_outlet', outletCode)
    }

    if (startDate && endDate) {
      query = query.gte('opname_date', startDate).lte('opname_date', endDate)
    }

    if (documentNumber && documentNumber !== 'ALL') {
      query = query.eq('document_number', documentNumber)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      data: data as OpnameVarianceItem[],
      error: null,
      isSuccess: true,
    }
  } catch (error: any) {
    console.error('Error fetching opname variance report:', error)
    return {
      data: null,
      error: error.message,
      isSuccess: false,
    }
  }
}

export async function getOpnameBatchNumbers(
  outletCode?: string,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<string[]>> {
  try {
    let query = supabase
      .from('stock_opname_headers')
      .select('document_number')
      .in('status', ['PENDING_APPROVAL', 'COMPLETED'])
      .order('created_at', { ascending: false })

    if (outletCode && outletCode !== 'ALL') {
      query = query.eq('kode_outlet', outletCode)
    }
    if (startDate && endDate) {
      query = query.gte('opname_date', startDate).lte('opname_date', endDate)
    }

    const { data, error } = await query
    if (error) throw error
    const uniqueDocs = Array.from(new Set((data || []).map((d: any) => d.document_number))).filter(Boolean) as string[]
    return { data: uniqueDocs, error: null, isSuccess: true }
  } catch (err: any) {
    return { data: [], error: err.message, isSuccess: false }
  }
}
