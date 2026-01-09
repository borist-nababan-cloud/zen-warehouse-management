
import { supabase } from '@/lib/supabase'
import { ApiResponse, GoodsReceipt, GoodsReceiptItem } from '@/types/database'

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

        if (kodeOutlet && kodeOutlet !== '111') {
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
          master_supplier (name)
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
  items: Omit<GoodsReceiptItem, 'id' | 'receipt_id'>[]
): Promise<ApiResponse<GoodsReceipt>> {
  try {
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

    // 3. Update PO Items (qty_received) & PO Status
    // We need to loop or do bulk update. For now, loop is safer for logic.
    // Also we need to check if ALL items are fully received to set COMPLETED.

    // A. Fetch current PO items to compare totals
    const { data: currentPoItems, error: fetchError } = await supabase
      .from('purchase_order_items')
      .select('id, qty_ordered, qty_received')
      .eq('po_id', header.po_id)
    
    if (fetchError) throw fetchError

    let allCompleted = true

    // B. Update each item's qty_received
    for (const item of items) {
      const match = currentPoItems?.find(p => p.id === item.po_item_id)
      if (match) {
        const newTotalReceived = (match.qty_received || 0) + Number(item.qty_received)
        
        // Update PO Item
        await supabase
          .from('purchase_order_items')
          .update({ qty_received: newTotalReceived })
          .eq('id', item.po_item_id)
      }
    }

    // C. Re-evaluate PO Status
    // We need fresh data or calculate loosely. Let's calculate loosely based on 'currentPoItems' + 'items' updates
    // Better: We just updated DB. Let's rely on logic:
    // For each PO Item in DB (fetched earlier), add the NEWLY received qty (if any) and check if >= ordered.
    
    // Create a map of incoming updates
    const incomingQtyMap = new Map<string, number>()
    items.forEach(i => incomingQtyMap.set(i.po_item_id, Number(i.qty_received)))

    if (currentPoItems) {
      for (const poItem of currentPoItems) {
        const incoming = incomingQtyMap.get(poItem.id) || 0
        const oldReceived = poItem.qty_received || 0
        const total = oldReceived + incoming
        const ordered = poItem.qty_ordered

        if (total < ordered) allCompleted = false
      }
    }

    const newStatus = allCompleted ? 'COMPLETED' : 'PARTIAL'
    
    // D. Update PO Status
    await supabase
      .from('purchase_orders')
      .update({ status: newStatus })
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
