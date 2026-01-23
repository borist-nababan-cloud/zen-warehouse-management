
import { supabase } from '@/lib/supabase'
import {
  ApiResponse,
  PurchaseInvoice,
  ViewReportPurchaseInvoices,
  FinancePaymentAllocation,
  PurchaseOrderItem,
  MasterBarang
} from '@/types/database'

export interface InvoicePrintDetails extends PurchaseInvoice {
  items: (PurchaseOrderItem & { master_barang: MasterBarang | null })[]
}

export async function getInvoicePrintDetails(invoiceId: string): Promise<ApiResponse<InvoicePrintDetails>> {
  try {
    // 1. Fetch Invoice Header Only
    // Use proper column names based on schema: purchase_order_id, etc.
    const { data: invoice, error: invoiceError } = await supabase
      .from('purchase_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError) throw invoiceError

    if (!invoice) {
        return { data: null, error: 'Invoice not found', isSuccess: false }
    }

    // 2. Fetch PO Manually using purchase_order_id
    let purchaseOrder = null
    let supplier = null
    let items: any[] = []

    if (invoice.purchase_order_id) {
        const { data: poData } = await supabase
            .from('purchase_orders')
            .select('*') // Select all to get kode_supplier and kode_outlet
            .eq('id', invoice.purchase_order_id)
            .single()
        
        purchaseOrder = poData

        if (purchaseOrder) {
             // 3. Fetch Supplier using PO's kode_supplier
             if (purchaseOrder.kode_supplier) {
                const { data: supplierData } = await supabase
                    .from('master_supplier')
                    .select('*')
                    .eq('kode_supplier', purchaseOrder.kode_supplier)
                    .single()
                
                if (supplierData) {
                    supplier = supplierData
                }
             }

             // 4. Fetch Items using purchase_order_id (which is po_id in items table)
             const { data: poItems, error: itemsError } = await supabase
                .from('purchase_order_items')
                .select('*')
                .eq('po_id', invoice.purchase_order_id)

             if (itemsError) throw itemsError
             items = poItems || []
        }
    }

    // 5. Fetch Barang for items manually
    const itemsWithBarang = await Promise.all(items.map(async (item: any) => {
        let barang = null
        if (item.barang_id) {
             const { data: barangData } = await supabase
                .from('master_barang')
                .select('*')
                .eq('id', item.barang_id)
                .single()
             barang = barangData
        }
        return {
            ...item,
            master_barang: barang
        }
    }))

    const result: InvoicePrintDetails = {
      ...invoice,
      // Map legacy/helper fields if needed by UI, or ensure UI uses these nested objects
      master_supplier: supplier,
      purchase_orders: purchaseOrder,
      items: itemsWithBarang || []
    }

    return { data: result, error: null, isSuccess: true }
  } catch (error: any) {
    console.error('Error fetching invoice details:', error)
    return { data: null, error: error.message, isSuccess: false }
  }
}

export async function getInvoicePaymentHistory(invoiceId: string): Promise<ApiResponse<FinancePaymentAllocation[]>> {
  try {
    // 1. Fetch Allocations first
    const { data: allocations, error: allocError } = await supabase
      .from('finance_payment_allocations')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('id', { ascending: true })

    if (allocError) throw allocError

    if (!allocations || allocations.length === 0) {
        return { data: [], error: null, isSuccess: true }
    }

    // 2. Fetch related FinancePaymentOut and Accounts manually
    const allocationsWithDetails = await Promise.all(allocations.map(async (alloc: any) => {
        let paymentOut = null
        if (alloc.payment_id) {
            const { data: payData } = await supabase
                .from('finance_payments_out')
                .select('*')
                .eq('id', alloc.payment_id)
                .single()
            
            if (payData) {
                // Fetch Account
                let account = null
                if (payData.account_id) {
                     const { data: accData } = await supabase
                        .from('master_financial_accounts')
                        .select('bank_name, account_name, account_type')
                        .eq('id', payData.account_id)
                        .single()
                     account = accData
                }
                paymentOut = {
                    ...payData,
                    master_financial_accounts: account
                }
            }
        }
        
        return {
            ...alloc,
            finance_payments_out: paymentOut
        }
    }))

    return { data: allocationsWithDetails as FinancePaymentAllocation[], error: null, isSuccess: true }
  } catch (error: any) {
    console.error('Error fetching payment history:', error)
    return { data: null, error: error.message, isSuccess: false }
  }
}

export async function getInvoicesReport(
  outletCode: string,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<ViewReportPurchaseInvoices[]>> {
  try {
    let query = supabase
      .from('view_report_purchase_invoices')
      .select('*')
      .order('invoice_date', { ascending: false })

    if (outletCode && outletCode !== 'ALL') {
      query = query.eq('kode_outlet', outletCode)
    }

    if (startDate) {
      query = query.gte('invoice_date', startDate)
    }

    if (endDate) {
      query = query.lte('invoice_date', endDate)
    }


    const { data, error } = await query

    if (error) throw error

    return { data: data as ViewReportPurchaseInvoices[], error: null, isSuccess: true }
  } catch (error: any) {
    console.error('Error fetching invoices report:', error)
    return { data: null, error: error.message, isSuccess: false }
  }
}

export async function getInvoiceReportById(invoiceId: string): Promise<ApiResponse<ViewReportPurchaseInvoices>> {
  try {
    const { data, error } = await supabase
      .from('view_report_purchase_invoices')
      .select('*')
      .eq('invoice_id', invoiceId)
      .single()

    if (error) throw error

    return { data: data as ViewReportPurchaseInvoices, error: null, isSuccess: true }
  } catch (error: any) {
    console.error('Error fetching invoice report details:', error)
    return { data: null, error: error.message, isSuccess: false }
  }
}
