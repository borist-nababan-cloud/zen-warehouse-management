
import { supabase } from '@/lib/supabase'
import { 
  StoOrder, 
  StoItem, 
  StoShipment, 
  StoReceipt, 
  StoStatus, 
  StoRecipientStatus, 
  StoInvoice 
} from '@/types/database'

export interface CreateStoPayload {
  from_outlet: string
  to_outlet: string
  shipping_cost: number
  items: {
    barang_id: number
    qty_requested: number
    price_unit: number
  }[]
  created_by: string
}

export interface ShipStoPayload {
  sto_id: string
  items: {
    sto_item_id: string
    barang_id: number
    qty_shipped: number
  }[]
  shipped_by: string
}

export interface ReceiveStoPayload {
  sto_id: string
  items: {
    sto_item_id: string
    barang_id: number
    qty_received: number
  }[]
  received_by: string
}

export const stoService = {
  // 1. Create STO (Admin Sender)
  async createSto(payload: CreateStoPayload) {
    // A. Insert Header
    const total_items_price = payload.items.reduce((sum, item) => sum + (item.qty_requested * item.price_unit), 0)
    
    // Generate Doc Number (Simple client-side gen for now, ideally DB trigger)
    const year = new Date().getFullYear().toString().slice(-2)
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const doc_number = `STO-${year}${month}-${random}` 

    const { data: header, error: headerError } = await supabase
      .from('sto_orders')
      .insert({
        document_number: doc_number, // Trigger might override this
        from_outlet: payload.from_outlet,
        to_outlet: payload.to_outlet,
        shipping_cost: payload.shipping_cost,
        total_items_price: total_items_price,
        sender_status: 'DRAFT',
        recipient_status: 'PENDING',
        created_by: payload.created_by
      })
      .select()
      .single()

    if (headerError) throw headerError
    if (!header) throw new Error('Failed to create STO Header')

    // B. Insert Items
    const itemsData = payload.items.map(item => ({
      sto_id: header.id,
      barang_id: item.barang_id,
      qty_requested: item.qty_requested,
      price_unit: item.price_unit
    }))

    const { error: itemsError } = await supabase
      .from('sto_items')
      .insert(itemsData)

    if (itemsError) {
      // Rollback header (Manual cleanup since no TX in client)
      await supabase.from('sto_orders').delete().eq('id', header.id)
      throw itemsError
    }

    return header
  },

  // 2. Get STOs (Paginated)
  async getStoOrders(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      outlet_code?: string
      role?: 'SENDER' | 'RECIPIENT'
      status?: StoStatus
      recipient_status?: StoRecipientStatus
    }
  ) {
    let query = supabase
      .from('sto_orders')
      .select(`
        *,
        from_master_outlet:master_outlet!sto_orders_from_outlet_fkey(*),
        to_master_outlet:master_outlet!sto_orders_to_outlet_fkey(*),
        sto_invoices(*)
      `, { count: 'exact' })

    if (filters?.outlet_code) {
      if (filters.role === 'SENDER') {
        query = query.eq('from_outlet', filters.outlet_code)
      } else if (filters.role === 'RECIPIENT') {
        query = query.eq('to_outlet', filters.outlet_code)
      } else {
        // Show both
        query = query.or(`from_outlet.eq.${filters.outlet_code},to_outlet.eq.${filters.outlet_code}`)
      }
    }

    if (filters?.status) {
      query = query.eq('sender_status', filters.status)
    }

    if (filters?.recipient_status) {
      query = query.eq('recipient_status', filters.recipient_status)
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (error) throw error
    return { data: data as StoOrder[], count }
  },

  // 3. Get Single Detail
  async getStoDetail(id: string) {
    const { data, error } = await supabase
      .from('sto_orders')
      .select(`
        *,
        from_master_outlet:master_outlet!sto_orders_from_outlet_fkey(*),
        to_master_outlet:master_outlet!sto_orders_to_outlet_fkey(*),
        sto_items:sto_items(
          *,
          master_barang(*)
        ),
        sto_shipments:sto_shipments(
          *,
          sto_shipment_items(*)
        ),
        sto_receipts:sto_receipts(
          *,
          sto_receipt_items(*)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as StoOrder
  },

  // 4. Update Status (Generic)
  async updateSenderStatus(id: string, status: StoStatus) {
    const { error } = await supabase
      .from('sto_orders')
      .update({ sender_status: status })
      .eq('id', id)
    if (error) throw error
  },

  async updateRecipientStatus(id: string, status: StoRecipientStatus) {
    const { error } = await supabase
      .from('sto_orders')
      .update({ recipient_status: status })
      .eq('id', id)
    if (error) throw error
  },

  // 5. Create Shipment (Warehouse Sender)
  async createShipment(payload: ShipStoPayload) {
    // A. Create Shipment Header
    const doc_number = `SHP-${new Date().getTime().toString().slice(-6)}`
    
    const { data: shipment, error: headerError } = await supabase
      .from('sto_shipments')
      .insert({
        sto_id: payload.sto_id,
        document_number: doc_number,
        shipped_by: payload.shipped_by
      })
      .select()
      .single()

    if (headerError) throw headerError

    // B. Create Shipment Items
    const itemsData = payload.items.map(item => ({
      shipment_id: shipment.id,
      sto_item_id: item.sto_item_id,
      barang_id: item.barang_id,
      qty_shipped: item.qty_shipped
    }))

    const { error: itemsError } = await supabase
      .from('sto_shipment_items')
      .insert(itemsData)
    
    if (itemsError) throw itemsError

    // C. Update STO Status
    await this.updateSenderStatus(payload.sto_id, 'SHIPPED')

    return shipment
  },

  // 6. Create Receipt (Warehouse Recipient)
  async createReceipt(payload: ReceiveStoPayload) {
    // A. Create Receipt Header
    const doc_number = `REC-${new Date().getTime().toString().slice(-6)}`

    const { data: receipt, error: headerError } = await supabase
      .from('sto_receipts')
      .insert({
        sto_id: payload.sto_id,
        document_number: doc_number,
        received_by: payload.received_by
      })
      .select()
      .single()

    if (headerError) throw headerError

    // B. Create Receipt Items
    const itemsData = payload.items.map(item => ({
      receipt_id: receipt.id,
      sto_item_id: item.sto_item_id,
      barang_id: item.barang_id,
      qty_received: item.qty_received
    }))

    const { error: itemsError } = await supabase
      .from('sto_receipt_items')
      .insert(itemsData)

    if (itemsError) throw itemsError

    // C. Update STO Status
    // await this.updateSenderStatus(payload.sto_id, 'COMPLETED') // Sender status should remain SHIPPED as per DB constraint
    await this.updateRecipientStatus(payload.sto_id, 'COMPLETED')

    return receipt
  },

  // 7. Create Invoice (Admin Recipient)
  async createInvoice(stoId: string, createdBy: string) { // createdBy typically unused in sto_invoices based on schema, but good to have
    // Fetch STO to calculate totals
    const sto = await this.getStoDetail(stoId)
    if (!sto) throw new Error("STO not found")

    const totalAmount = (sto.total_items_price || 0) + (sto.shipping_cost || 0)
    const doc_number = `INV-${sto.document_number}`

    const { data: invoice, error } = await supabase
      .from('sto_invoices')
      .insert({
        sto_id: stoId,
        document_number: doc_number,
        owe_to_outlet_id: sto.from_outlet,
        total_amount: totalAmount,
        due_date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(), // +30 days default
        status: 'UNPAID'
      })
      .select()
      .single()

    if (error) throw error

    // [FIX] Manually insert into finance_ap_ledger since DB trigger seems missing
    // We infer the schema from financeService.ts queries
    const { error: ledgerError } = await supabase
      .from('finance_ap_ledger')
      .insert({
        invoice_id: invoice.id,               // UUID of the STO Invoice
        kode_outlet: sto.to_outlet,           // Debtor (Recipient)
        ref_outlet_id: sto.from_outlet,       // Creditor (Sender)
        due_date: invoice.due_date,
        original_amount: invoice.total_amount,
        paid_amount: 0,
        is_paid: false
      })

    if (ledgerError) {
        console.error("Failed to insert into finance_ap_ledger:", ledgerError)
        // We do not throw to avoid breaking the UI flow, but this needs attention if it appears in logs
    }

    // Update Status to INVOICED ? (Optional, currently schema uses COMPLETED)
    // await this.updateSenderStatus(stoId, 'INVOICED')

    return invoice
  }
}
