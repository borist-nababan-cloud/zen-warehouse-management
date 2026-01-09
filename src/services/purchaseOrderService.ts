
import { supabase } from '@/lib/supabase'
import { ApiResponse, PurchaseOrder, PurchaseOrderItem } from '@/types/database'

/**
 * Get all Purchase Orders for an outlet
 */
export async function getPurchaseOrders(kodeOutlet: string): Promise<ApiResponse<PurchaseOrder[]>> {
  try {
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        master_supplier (name)
      `)
      .order('created_at', { ascending: false })

    if (kodeOutlet && kodeOutlet !== '111') {
      // If NOT holding, filter by outlet
      // If holding (111), they generally see everything or they can filter. 
      // For simplicity, let's filter strict for non-holding.
      query = query.eq('kode_outlet', kodeOutlet)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      data,
      error: null,
      isSuccess: true,
    }
  } catch (error: any) {
    console.error('Error fetching POs:', error)
    return {
      data: null,
      error: error.message || 'Failed to fetch Purchase Orders',
      isSuccess: false,
    }
  }
}

/**
 * Get Single PO by ID with Items
 */
export async function getPurchaseOrderById(id: string): Promise<ApiResponse<PurchaseOrder>> {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        master_supplier (*),
        master_outlet (*),
        purchase_order_items (
          *,
          master_barang (name, sku)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    return {
      data,
      error: null,
      isSuccess: true,
    }
  } catch (error: any) {
    console.error('Error fetching PO:', error)
    return {
      data: null,
      error: error.message || 'Failed to fetch Purchase Order',
      isSuccess: false,
    }
  }
}

/**
 * Create Purchase Order (Transaction)
 */
export async function createPurchaseOrder(
  header: Omit<PurchaseOrder, 'id' | 'created_at' | 'status'>,
  items: Omit<PurchaseOrderItem, 'id' | 'po_id' | 'qty_received'>[]
): Promise<ApiResponse<PurchaseOrder>> {
  try {
    // 1. Insert Header
    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        ...header,
        status: 'ISSUED', // As per requirement, simplified flow. Or user chooses. 
        // Logic: The UI will probably allow "Draft" or "Issued". 
        // For this function, let's assume the passed status is in 'header' if we want flexibility, 
        // but the type omitted it. Let's add it back or default to ISSUED for now if not provided.
        // Actually, let's check input. The input `header` omits status. 
        // Let's assume we want to support Draft/Issued from UI.
        // Let's change the params slightly in usage.
      })
      .select()
      .single()

    if (poError) throw poError

    // 2. Insert Items
    const itemsWithPoId = items.map(item => ({
      ...item,
      po_id: poData.id,
      qty_received: 0
    }))

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(itemsWithPoId)

    if (itemsError) {
      // Rollback would be ideal here properly using RPC, but for client-side call:
      // We manually delete the PO we just made to "cancel" it.
      await supabase.from('purchase_orders').delete().eq('id', poData.id)
      throw itemsError
    }

    return {
      data: poData,
      isSuccess: true,
      error: null
    }

  } catch (error: any) {
    console.error('Error creating PO:', error)
    return {
      data: null,
      error: error.message || 'Failed to create Purchase Order',
      isSuccess: false,
    }
  }
}

/**
 * Update PO Status
 */
export async function updatePurchaseOrderStatus(
  id: string, 
  status: PurchaseOrder['status']
): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status })
      .eq('id', id)

    if (error) throw error

    return { data: null, isSuccess: true, error: null }
  } catch (error: any) {
    return { data: null, isSuccess: false, error: error.message }
  }
}

/**
 * Updates an existing PO (Header and Items).
 * RESTRICTION: Only allowed if status is 'DRAFT' or 'ISSUED'.
 * Strategy:
 * 1. Validate Status.
 * 2. Delete removed items.
 * 3. Upsert (Insert/Update) items.
 * 4. Update Header (Total Amount & Status).
 */
export const updatePurchaseOrderItems = async (
    poId: string,
    header: Partial<PurchaseOrder>,
    items: Partial<PurchaseOrderItem>[]
): Promise<{ isSuccess: boolean; error?: string }> => {
    try {
        // 1. Check Current Status
        const checkRes = await supabase
            .from('purchase_orders')
            .select('status')
            .eq('id', poId)
            .single()

        if (checkRes.error) throw checkRes.error
        const currentStatus = checkRes.data.status

        if (currentStatus !== 'DRAFT' && currentStatus !== 'ISSUED') {
            return { isSuccess: false, error: `Cannot edit PO with status '${currentStatus}'. Only DRAFT or ISSUED.` }
        }

        // 2. Fetch Existing Items to find Deletions
        const existingRes = await supabase
            .from('purchase_order_items')
            .select('id')
            .eq('po_id', poId)

        if (existingRes.error) throw existingRes.error
        
        const existingIds = existingRes.data.map(i => i.id)
        const incomingIds = items.filter(i => i.id).map(i => i.id)
        const idsToDelete = existingIds.filter(id => !incomingIds.includes(id))

        // 3. Delete Removed Items
        if (idsToDelete.length > 0) {
            const deleteRes = await supabase
                .from('purchase_order_items')
                .delete()
                .in('id', idsToDelete)
            
            if (deleteRes.error) throw deleteRes.error
        }

        // 4. Upsert Items (Loop safe for MVP, bulk upsert preferred if no partial logic)
        // We'll iterate to ensure 'po_id' is set and handle insert vs update clean
        for (const item of items) {
            const payload = {
                po_id: poId,
                barang_id: item.barang_id,
                qty_ordered: item.qty_ordered,
                uom_purchase: item.uom_purchase,
                conversion_rate: item.conversion_rate,
                price_per_unit: item.price_per_unit,
                // qty_received preserved if update, 0 if new (db default?)
                // Actually if converting from DRAFT -> ISSUED, qty_received is 0
            }

            if (item.id) {
                // Update
                const { error } = await supabase
                    .from('purchase_order_items')
                    .update(payload)
                    .eq('id', item.id)
                if (error) throw error
            } else {
                // Insert
                const { error } = await supabase
                    .from('purchase_order_items')
                    .insert({ ...payload, qty_received: 0 })
            }
        }

        // 5. Update Header (and Status if provided)
        const headerPayload: any = {
            total_amount: header.total_amount
        }
        if (header.status) {
            headerPayload.status = header.status
        }

        const headerUpdate = await supabase
            .from('purchase_orders')
            .update(headerPayload)
            .eq('id', poId)

        if (headerUpdate.error) throw headerUpdate.error

        return { isSuccess: true }

    } catch (error: any) {
        console.error('Update PO Error:', JSON.stringify(error, null, 2))
        return { isSuccess: false, error: error.message || 'Failed to update Purchase Order' }
    }
}
