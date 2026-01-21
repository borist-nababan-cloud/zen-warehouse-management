
import { supabase } from '@/lib/supabase'
import { ApiResponse, GoodsReceipt, GoodsReceiptItem, ViewPoDetailsReceived } from '@/types/database'

export async function getGoodsReceipts(kodeOutlet: string): Promise<ApiResponse<GoodsReceipt[]>> {
    try {
        let query = supabase
            .from('goods_receipts')
            .select(`
                *,
                purchase_orders (
                    document_number
                ),
                master_outlet (name_outlet)
            `)
            .order('received_at', { ascending: false })

        if (kodeOutlet) {
            query = query.eq('kode_outlet', kodeOutlet)
        }

        const { data, error } = await query

        if (error) throw error

        const receipts = data as GoodsReceipt[]

        // Fetch email addresses for 'received_by'
        const userIds = Array.from(new Set(receipts.map(r => r.received_by).filter(Boolean)))
        
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users_profile')
            .select('uid, email')
            .in('uid', userIds)
          
          if (usersData) {
            const emailMap = new Map(usersData.map(u => [u.uid, u.email]))
            receipts.forEach(r => {
              if (r.received_by) {
                r.received_by_email = emailMap.get(r.received_by)
              }
            })
          }
        }

        return {
          data: receipts,
          isSuccess: true,
          error: null
        }
    } catch (error: any) {
        console.error('Error fetching GRs:', error)
        return {
            data: null,
            isSuccess: false,
            error: error.message
        }
    }
}

/**
 * Get Goods Receipt by ID
 */
export async function getGoodsReceiptById(id: string): Promise<ApiResponse<GoodsReceipt>> {
  try {
    const { data, error } = await supabase
      .from('goods_receipts')
      .select(`
        *,
        purchase_orders (
          document_number,
          master_supplier (name, address, phone)
        ),
        master_outlet (name_outlet, city, alamat, no_telp),
        goods_receipt_items (
          *,
          purchase_order_items (
            uom_purchase,
            master_barang (name, sku)
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    return {
      data: data as GoodsReceipt,
      isSuccess: true,
      error: null
    }
  } catch (error: any) {
    console.error('Error fetching GR:', error)
    return {
      data: null,
      isSuccess: false,
      error: error.message
    }
  }
}

/**
 * Create Goods Receipt (Transaction)
 */
export async function createGoodsReceipt(
  header: Omit<GoodsReceipt, 'id' | 'created_at'>,
  items: Omit<GoodsReceiptItem, 'id' | 'receipt_id'>[],
  newPoStatus: 'PARTIAL' | 'COMPLETED'
): Promise<ApiResponse<GoodsReceipt>> {
  try {
    // 0. Fetch Current PO Items & Status (Snapshot)
    // We need to verify status IS 'ISSUED' or 'PARTIAL' before we allow receiving.
    const { data: poCheck, error: poCheckError } = await supabase
        .from('purchase_orders')
        .select('status, purchase_order_items (id, qty_ordered, qty_received)')
        .eq('id', header.po_id)
        .single()
    
    if (poCheckError || !poCheck) throw new Error('Purchase Order not found')
    
    // Strict Status Check
    if (poCheck.status !== 'ISSUED' && poCheck.status !== 'PARTIAL') {
         throw new Error(`Cannot create Receipt. Purchase Order status is '${poCheck.status}' (Must be ISSUED or PARTIAL)`)
    }

    const currentPoItems = poCheck.purchase_order_items
    if (!currentPoItems || currentPoItems.length === 0) {
        throw new Error('Purchase Order Items not found for verification')
    }

    // 1. Insert Header
    const { data: grData, error: grError } = await supabase
      .from('goods_receipts')
      .insert(header)
      .select()
      .single()

    if (grError) throw grError

    // 2. Insert Items
    const itemsWithGrId = items.map(item => ({
      ...item,
      receipt_id: grData.id
    }))

    const { error: itemsError } = await supabase
      .from('goods_receipt_items')
      .insert(itemsWithGrId)

    if (itemsError) {
      await supabase.from('goods_receipts').delete().eq('id', grData.id)
      throw itemsError
    }

    // 2.5 Fetch Updated PO Items (Post-Insert Snapshot) -> To detect if a Trigger already updated the values
    const { data: postPoItems, error: postFetchError } = await supabase
      .from('purchase_order_items')
      .select('id, qty_ordered, qty_received')
      .eq('po_id', header.po_id)

    if (postFetchError) throw postFetchError

    // 3. Update PO Items (qty_received)
    // Idempotent Logic: Check if DB value is already correct.
    for (const item of items) {
      const preMatch = currentPoItems.find(p => p.id === item.po_item_id)
      const postMatch = postPoItems?.find(p => p.id === item.po_item_id)
      
      if (preMatch) {
        // Enforce number type for calculation
        const oldQty = Number(preMatch.qty_received || 0)
        const incomingQty = Number(item.qty_received)
        const targetQty = oldQty + incomingQty
        
        let currentDbQty = oldQty // Default to old if postMatch missing for some reason
        if (postMatch) {
            currentDbQty = Number(postMatch.qty_received || 0)
        }

        // Only update if the DB value is NOT what we expect
        if (currentDbQty !== targetQty) {

             await supabase
              .from('purchase_order_items')
              .update({ qty_received: targetQty })
              .eq('id', item.po_item_id)
        }
      }
    }

    // D. Update PO Status with Client Provided Status
    await supabase
      .from('purchase_orders')
      .update({ status: newPoStatus })
      .eq('id', header.po_id)

    return {
      data: grData,
      isSuccess: true,
      error: null
    }

  } catch (error: any) {
    console.error('Error creating GR:', error)
    return {
      data: null,
      error: error.message || 'Failed to create Goods Receipt',
      isSuccess: false,
    }
  }
}

/**
 * Get PO Details from Server-Side View
 * Used for Goods Receipt Creation to ensure accurate calculations
 */
export async function getPoDetailsFromView(poId: string): Promise<ApiResponse<ViewPoDetailsReceived[]>> {
  try {
    const { data, error } = await supabase
      .from('view_po_details_received')
      .select('*')
      .eq('po_id', poId)
    
    if (error) throw error

    return {
      data: data as ViewPoDetailsReceived[],
      isSuccess: true,
      error: null
    }


  } catch (error: any) {
    console.error('Error fetching PO Details View:', error)
    return {
      data: null,
      error: error.message,
      isSuccess: false
    }
  }
}

/**
 * Get Report GR Supplier Data
 * Supports filtering by Date Range and Outlet
 */
interface ReportGrFilter {
    startDate?: Date
    endDate?: Date
    outletCode?: string
}

export async function getReportGrSupplier(filter: ReportGrFilter): Promise<ApiResponse<ViewPoDetailsReceived[]>> {
    try {
        let query = supabase
            .from('view_po_details_received')
            .select('*')
            
        // Apply Filters
        if (filter.outletCode) {
            query = query.eq('kode_outlet', filter.outletCode)
        }

        if (filter.startDate) {
            // Start of day
            const startStr = filter.startDate.toISOString()
            query = query.gte('po_created_at', startStr)
        }

        if (filter.endDate) {
             // End of day (roughly 23:59:59 if just date passed, or just use next day lt)
             // Simply using the date string often defaults to 00:00, so let's ensure we cover the day.
             const nextDay = new Date(filter.endDate)
             nextDay.setDate(nextDay.getDate() + 1)
             const endStr = nextDay.toISOString()
             query = query.lt('po_created_at', endStr)
        }

        // Default Sort
        query = query.order('po_created_at', { ascending: false })

        const { data, error } = await query

        if (error) throw error

        return {
            data: data as ViewPoDetailsReceived[],
            isSuccess: true,
            error: null
        }

    } catch (error: any) {
        console.error('Error fetching Report GR:', error)
        return {
            data: null,
            isSuccess: false,
            error: error.message
        }
    }
}
