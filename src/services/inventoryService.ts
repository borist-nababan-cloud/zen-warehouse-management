import { supabase } from '@/lib/supabase'
import { ApiResponse, InventoryShrinkageLog, StockOpnameHeader, MasterShrinkageCategory, InventoryBalance, InventoryReportItem, ShrinkageReportItem, OpnameVarianceItem } from '@/types/database'

// ==========================================
// SHRINKAGE
// ==========================================

export async function getShrinkageCategories(_outletId: string): Promise<ApiResponse<MasterShrinkageCategory[]>> {
    const { data, error } = await supabase
        // ... (rest of the query appears to be correct but unused param needs _ prefix or remove)
        .from('master_shrinkage_categories')
        .select('*')
        .eq('is_active', true)
        // Filter by outlet or holding? Usually master data is shared or outlet specific.
        // Assuming shared or outlet_id param applies. The table has kode_outlet default '111'.
        // For now fetch all active.
    
    if (error) return { data: null, error: error.message, isSuccess: false }
    return { data: data as MasterShrinkageCategory[], error: null, isSuccess: true }
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

    // 1. Create Header
    const docNum = `SO-${Date.now()}`
    
    const { data: header, error: headerError } = await supabase
        .from('stock_opname_headers')
        .insert({
            document_number: docNum,
            kode_outlet: payload.kode_outlet,
            notes: payload.notes,
            created_by: user?.id,
            status: 'DRAFT'
        })
        .select()
        .single()

    if (headerError || !header) {
        return { data: null, error: headerError?.message || 'Failed to create header', isSuccess: false }
    }

    // 2. Insert Items
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
        // Rollback? Should delete header manually since no transaction block on client.
        // For MVP, just return error.
        return { data: null, error: itemsError.message, isSuccess: false }
    }

    // 3. Finalize Logic (Client-Side)
    // Replace RPC with direct updates to ensure reliability
    try {
        for (const item of itemsToInsert) {
            // Try to update existing balance
            const { data: existing, error: updateError } = await supabase
                .from('inventory_balance')
                .update({ 
                    qty_on_hand: item.actual_qty,
                    opening_balance: item.actual_qty, // Set OB to actual opname qty
                    last_movement_at: new Date().toISOString(),
                    date_ob: new Date().toLocaleDateString('en-CA') // YYYY-MM-DD (Local)
                })
                .eq('barang_id', item.barang_id)
                .eq('kode_outlet', header.kode_outlet)
                .select()

            if (updateError) throw new Error("Failed to update inventory: " + updateError.message)

            // If no row existed, we must insert
            if (!existing || existing.length === 0) {
                 const { error: insertError } = await supabase
                    .from('inventory_balance')
                    .insert({
                        barang_id: item.barang_id,
                        kode_outlet: header.kode_outlet,
                        qty_on_hand: item.actual_qty,
                        opening_balance: item.actual_qty, // Set OB to actual opname qty
                        last_movement_at: new Date().toISOString(),
                        date_ob: new Date().toLocaleDateString('en-CA') // YYYY-MM-DD (Local)
                    })
                
                if (insertError) throw new Error("Failed to insert inventory: " + insertError.message)
            }
        }

        // 4. Update Header Status to COMPLETED
        const { error: statusError } = await supabase
            .from('stock_opname_headers')
            .update({ status: 'COMPLETED' })
            .eq('id', header.id)

        if (statusError) throw new Error("Failed to update status: " + statusError.message)

    } catch (err: any) {
         // If finalization fails, we leave the header as DRAFT (or we could try to rollback items)
         // For now just report error
         return { data: header as StockOpnameHeader, error: "Saved as Draft but failed to finalize: " + err.message, isSuccess: false }
    }

    // Return header with updated status logic (conceptually completed)
    return { data: { ...header, status: 'COMPLETED' } as StockOpnameHeader, error: null, isSuccess: true }
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
  endDate?: string
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
