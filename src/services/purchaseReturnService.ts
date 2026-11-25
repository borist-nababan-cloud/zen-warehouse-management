import { supabase } from '@/lib/supabase'

export type PoReturnModeType = 'SIMPLE_CANCEL' | 'RETURN_AFTER_GR' | 'BLOCKED'
export type PoReturnSubmitMode = 'SIMPLE_CANCEL' | 'FULL_RETURN' | 'PARTIAL_RETURN'

export interface PoReturnPreviewItem {
  po_item_id: string
  barang_id: number
  sku: string
  item_name: string
  uom_purchase: string
  base_uom: string
  conversion_rate: number
  price_per_unit: number
  qty_ordered: number
  qty_received: number
  qty_base_received: number
  current_stock_on_hand: number
}

export interface PoReturnHistoryLine {
  barang_id: number
  sku: string
  item_name: string
  uom_purchase: string
  qty_returned: number
  qty_base_unit: number
  price_per_unit: number
  subtotal: number
}

export interface PoReturnHistoryItem {
  id: string
  document_number: string
  return_type: 'FULL_RETURN' | 'PARTIAL_RETURN'
  reason: string
  items_return_amount: number
  shipping_deduction: number
  other_cost_deduction: number
  total_return_amount: number
  deduction_invoice_id: string | null
  deduction_invoice_doc: string | null
  created_by_name: string | null
  created_at: string
  items: PoReturnHistoryLine[]
}

export interface PoReturnPreview {
  po: {
    id: string
    document_number: string
    status: string
    kode_outlet: string
    name_outlet: string
    kode_supplier: string
    supplier_name: string
    created_at: string
    grand_total: number
    has_goods_receipt: boolean
    return_count: number
    total_returned_amount: number
  }
  invoice: {
    id: string
    document_number: string
    supplier_invoice_number: string | null
    status: string
    total_amount: number
    shipping_cost: number
    other_cost: number
    other_cost_notes: string | null
    ap_original_amount: number
    ap_paid_amount: number
    ap_remaining_balance: number
    payment_allocations_count: number
    shipping_already_returned: number
    remaining_shipping_refundable: number
    other_cost_already_returned: number
    remaining_other_cost_refundable: number
  } | null
  mode_type: PoReturnModeType
  can_process: boolean
  blocked_reason: string | null
  items: PoReturnPreviewItem[]
  history: PoReturnHistoryItem[]
}

export interface ProcessPoReturnParams {
  poId: string
  mode: PoReturnSubmitMode
  reason: string
  items?: Array<{
    po_item_id: string
    qty_returned: number
  }>
  shippingDeduction?: number
  otherCostDeduction?: number
  reopenToPartial?: boolean
}

export interface ProcessPoReturnResult {
  success: boolean
  action: 'CANCELLED_NO_GR' | 'FULL_RETURN' | 'PARTIAL_RETURN'
  po_id: string
  po_document_number: string
  new_po_status: string
  return_id: string | null
  return_document_number: string | null
  deduction_invoice_id: string | null
  deduction_invoice_number: string | null
  total_return_amount: number
  items_return_amount?: number
  shipping_deduction?: number
  other_cost_deduction?: number
  message: string
}

export const purchaseReturnService = {
  async getReturnPreview(poId: string): Promise<PoReturnPreview> {
    const { data, error } = await supabase.rpc('get_po_return_preview', {
      p_po_id: poId,
    })

    if (error) {
      throw new Error(error.message || 'Gagal memuat pratinjau pembatalan / retur PO.')
    }
    if (!data) {
      throw new Error('Data pratinjau PO tidak ditemukan.')
    }

    return data as PoReturnPreview
  },

  async processPurchaseOrderReturn(
    params: ProcessPoReturnParams
  ): Promise<ProcessPoReturnResult> {
    const { data, error } = await supabase.rpc('process_purchase_order_return', {
      p_po_id: params.poId,
      p_mode: params.mode,
      p_reason: params.reason.trim(),
      p_items: params.items || [],
      p_shipping_deduction: params.shippingDeduction ?? 0,
      p_reopen_to_partial: params.reopenToPartial ?? false,
      p_other_cost_deduction: params.otherCostDeduction ?? 0,
    })

    if (error) {
      throw new Error(error.message || 'Gagal memproses pembatalan / retur PO.')
    }
    if (!data) {
      throw new Error('Respon server tidak valid saat memproses retur PO.')
    }

    return data as ProcessPoReturnResult
  },
}
