import { supabase } from '@/lib/supabase'
import { PurchaseOrder, ApiResponse } from '@/types/database'

export async function getCompletedPurchaseOrders(outletCode: string): Promise<ApiResponse<PurchaseOrder[]>> {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        master_supplier ( name ),
        master_outlet ( name_outlet )
      `)
      .eq('kode_outlet', outletCode)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      data: data as PurchaseOrder[],
      error: null,
      isSuccess: true,
    }
  } catch (error: any) {
    console.error('Error fetching completed POs:', error)
    return {
      data: null,
      error: error.message,
      isSuccess: false,
    }
  }
}

  export interface CreateInvoiceParams {
    target_po_id: string
    supplier_inv_ref: string
    payment_due_date: string // YYYY-MM-DD
    user_id: string
    shipping_cost_input?: number
  }
  
  export async function createPurchaseInvoice(params: CreateInvoiceParams): Promise<ApiResponse<number>> {
    try {
      // RPC signature: generate_purchase_invoice(target_po_id, supplier_inv_number, payment_due_date, user_id, shipping_cost_input)
      
      const { data, error } = await supabase.rpc('generate_purchase_invoice', {
        target_po_id: params.target_po_id,
        supplier_inv_ref: params.supplier_inv_ref,
        payment_due_date: params.payment_due_date,
        shipping_cost_input: params.shipping_cost_input || 0
  })

    if (error) throw error

    return {
      data: data, // This should be the Total Amount
      error: null,
      isSuccess: true
    }
  } catch (error: any) {
    console.error('Error creating purchase invoice:', error)
    return {
      data: null,
      error: error.message,
      isSuccess: false
    }
  }
}
