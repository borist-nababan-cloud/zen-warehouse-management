import { supabase } from '@/lib/supabase'

export interface StoArReportItem {
  invoice_id: string
  document_number: string
  invoice_date: string
  due_date: string
  total_amount: number
  payment_status: 'UNPAID' | 'PAID'
  settlement_status: 'UNCLAIMED' | 'RECEIVED'
  creditor_outlet: string
  debtor_outlet_code: string
  debtor_outlet_name: string
  sto_doc_number: string
}

export interface ConfirmPaymentPayload {
  invoice_id: string
  account_id: string
  received_date: Date
}

export const stoArService = {
  // 1. Get AR Report (with filters)
  async getArReport( filters?: {
    outlet_code?: string // The Creditor (User's Outlet)
    startDate?: Date
    endDate?: Date
    status?: 'ALL' | 'UNPAID' | 'WAITING' | 'COMPLETED'
  }) {
    let query = supabase
      .from('view_report_sto_ar')
      .select('*')
    
    // Validasi Outlet (Security Wrapper usually handles this, but good to be explicit)
    if (filters?.outlet_code) {
      query = query.eq('creditor_outlet', filters.outlet_code)
    }

    // Date Range Filter (Based on Invoice Date)
    if (filters?.startDate) {
      const isoStart = filters.startDate.toISOString()
      query = query.gte('invoice_date', isoStart)
    }
    if (filters?.endDate) {
      // Adjust end date to cover the full day
      const dateEnd = new Date(filters.endDate);
      dateEnd.setHours(23, 59, 59, 999);
      const isoEnd = dateEnd.toISOString()

      query = query.lte('invoice_date', isoEnd)
    }

    // Status Filters
    if (filters?.status && filters.status !== 'ALL') {
      if (filters.status === 'UNPAID') {
        query = query.eq('payment_status', 'UNPAID')
      } else if (filters.status === 'WAITING') {
        // Paid by them, but not claimed by us
        query = query.eq('payment_status', 'PAID').eq('settlement_status', 'UNCLAIMED')
      } else if (filters.status === 'COMPLETED') {
        // Money in our bank
        query = query.eq('settlement_status', 'RECEIVED')
      }
    }

    const { data, error } = await query.order('invoice_date', { ascending: false })

    if (error) {
      throw error
    }

    return data as StoArReportItem[]
  },

  // 2. Confirm Payment (RPC)
  async confirmPayment(payload: ConfirmPaymentPayload) {
    const { data, error } = await supabase.rpc('confirm_sto_payment_receipt', {
      p_invoice_id: payload.invoice_id,
      p_account_id: payload.account_id,
      p_received_date: payload.received_date.toISOString().split('T')[0] // Format YYYY-MM-DD
    })

    if (error) throw error
    return data
  },
  
  // 3. Get Financial Accounts (for Dropdown)
  async getMyAccounts(outletCode: string) {
    const { data, error } = await supabase
      .from('master_financial_accounts')
      .select('id, account_name, bank_name, account_number')
      .eq('kode_outlet', outletCode)
      .eq('is_active', true)
    
    if (error) throw error
    return data
  }
}
