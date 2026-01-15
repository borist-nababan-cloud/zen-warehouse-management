
import { supabase } from '@/lib/supabase'
import { ApiResponse, FinanceTransactionCategory, ApAgingItem, CashFlowItem } from '@/types/database'

export interface FinancialAccount {
  id: string
  kode_outlet: string
  account_name: string
  account_type: 'CASH' | 'BANK'
  bank_name?: string
  account_number?: string
  balance: number
  is_active: boolean
}

export interface GeneralTransactionParams {
  document_number: string
  kode_outlet: string
  financial_account_id: string
  transaction_type: 'IN' | 'OUT'
  category_id: string
  amount: number
  transaction_date: string
  description?: string
  created_by: string
}

export interface UnpaidInvoice {
  invoice_id: string
  document_number: string // from purchase_invoices
  invoice_date: string
  due_date: string
  total_amount: number
  remaining_balance: number
}

export interface PaydownParams {
  outlet_id: string
  supplier_id?: string | null
  ref_outlet_id?: string | null // For STO payments
  account_id: string
  payment_date: string
  total_amount: number
  invoices: { invoice_id: string; amount: number; discount: number }[]
  notes?: string
  user_id: string
}

// --- Accounts ---

export async function getFinancialAccounts(outletCode: string): Promise<ApiResponse<FinancialAccount[]>> {
  try {
    const { data, error } = await supabase
      .from('master_financial_accounts')
      .select('*')
      .eq('kode_outlet', outletCode)
      .eq('is_active', true)
      .order('account_type', { ascending: true }) // CASH first, then BANK

    if (error) throw error

    return { data: data as FinancialAccount[], error: null, isSuccess: true }
  } catch (error: any) {
    console.error('Error fetching accounts:', error)
    return { data: null, error: error.message, isSuccess: false }
  }
}

export async function createFinancialAccount(account: Omit<FinancialAccount, 'id' | 'balance' | 'is_active'>): Promise<ApiResponse<FinancialAccount>> {
  try {
    const { data, error } = await supabase
      .from('master_financial_accounts')
      .insert({ ...account, balance: 0, is_active: true })
      .select()
      .single()

    if (error) throw error

    return { data: data as FinancialAccount, error: null, isSuccess: true }
  } catch (error: any) {
    console.error('Error creating account:', error)
    return { data: null, error: error.message, isSuccess: false }
  }
}

// --- General Transactions ---

export async function getTransactionCategories(type: 'IN' | 'OUT'): Promise<ApiResponse<FinanceTransactionCategory[]>> {
  try {
    const { data, error } = await supabase
      .from('finance_transaction_categories')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    return { data: data as FinanceTransactionCategory[], error: null, isSuccess: true }
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return { data: null, error: error.message, isSuccess: false }
  }
}

export async function createGeneralTransaction(params: GeneralTransactionParams): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('finance_general_transactions')
      .insert(params)

    if (error) throw error

    return { data: true, error: null, isSuccess: true }
  } catch (error: any) {
    console.error('Error creating transaction:', error)
    return { data: null, error: error.message, isSuccess: false }
  }
}

// --- Paydown / AP Ledger ---

export async function getUnpaidInvoices(supplierId: string, outletCode: string): Promise<ApiResponse<UnpaidInvoice[]>> {
  try {
    // 1. Fetch Ledger Entries
    // NOTE: We cannot use !inner join because the FK constraint was dropped to support STO Invoices.
    // We must fetch manually and join in code.
    const { data: ledgerData, error: ledgerError } = await supabase
      .from('finance_ap_ledger')
      .select('invoice_id, remaining_balance, due_date')
      .eq('kode_supplier', supplierId)
      .eq('kode_outlet', outletCode)
      .eq('is_paid', false)
      .gt('remaining_balance', 0)
      .order('due_date', { ascending: true })

    if (ledgerError) throw ledgerError

    if (!ledgerData || ledgerData.length === 0) {
        return { data: [], error: null, isSuccess: true }
    }

    // 2. Extract IDs
    const invoiceIds = ledgerData.map((d: any) => d.invoice_id)

    // 3. Fetch Purchase Invoice Details manually
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('purchase_invoices')
      .select('id, document_number, invoice_date, total_amount')
      .in('id', invoiceIds)

    if (invoiceError) throw invoiceError

    // 4. Combine Data
    const formatted: UnpaidInvoice[] = ledgerData.map((item: any) => {
        const inv = invoiceData.find((x: any) => x.id === item.invoice_id)
        
        // If invoice not found (e.g. it's an STO invoice or really missing), skip
        if (!inv) return null 
        
        return {
          invoice_id: item.invoice_id,
          document_number: inv.document_number,
          invoice_date: inv.invoice_date,
          due_date: item.due_date,
          total_amount: inv.total_amount,
          remaining_balance: item.remaining_balance
        }
    }).filter((x: any) => x !== null) as UnpaidInvoice[]

    return { data: formatted, error: null, isSuccess: true }
  } catch (error: any) {
    console.error('Error fetching unpaid invoices:', error)
    return { data: null, error: error.message, isSuccess: false }
  }
}

export async function getUnpaidStoInvoices(oweToOutletId: string, myOutletCode: string): Promise<ApiResponse<UnpaidInvoice[]>> {
  try {
    // 1. Fetch Ledger Entries First
    const { data: ledgerData, error: ledgerError } = await supabase
      .from('finance_ap_ledger')
      .select('invoice_id, remaining_balance, due_date')
      .eq('ref_outlet_id', oweToOutletId)
      .eq('kode_outlet', myOutletCode)
      .eq('is_paid', false)
      .gt('remaining_balance', 0)
      .order('due_date', { ascending: true })

    if (ledgerError) throw ledgerError

    if (!ledgerData || ledgerData.length === 0) {
        return { data: [], error: null, isSuccess: true }
    }

    // 2. Extract IDs
    const invoiceIds = ledgerData.map((d: any) => d.invoice_id)

    // 3. Fetch STO Invoice Details manually
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('sto_invoices')
      .select('id, document_number, created_at, total_amount')
      .in('id', invoiceIds)

    if (invoiceError) throw invoiceError

    // 4. Combine Data
    const formatted: UnpaidInvoice[] = ledgerData.map((item: any) => {
        const inv = invoiceData.find((x: any) => x.id === item.invoice_id)
        if (!inv) return null 
        
        return {
          invoice_id: item.invoice_id,
          document_number: inv.document_number,
          invoice_date: inv.created_at,
          due_date: item.due_date,
          total_amount: inv.total_amount,
          remaining_balance: item.remaining_balance
        }
    }).filter((x: any) => x !== null) as UnpaidInvoice[]

    return { data: formatted, error: null, isSuccess: true }
  } catch (error: any) {
    console.error('Error fetching unpaid STO invoices:', error)
    return { data: null, error: error.message, isSuccess: false }
  }
}

export async function getUnpaidOutletsWithDebt(myOutletCode: string): Promise<ApiResponse<{outlet_id: string, total_debt: number}[]>> {
  try {
    const { data, error } = await supabase
      .from('finance_ap_ledger')
      .select('ref_outlet_id, remaining_balance')
      .eq('kode_outlet', myOutletCode)
      .neq('ref_outlet_id', null) 
      .eq('is_paid', false)
      .gt('remaining_balance', 0)
    
    if (error) throw error

    // Group by ref_outlet_id manually since Supabase client grouping is tricky without RPC
    const grouped = data.reduce((acc: any, curr: any) => {
        if (!curr.ref_outlet_id) return acc
        acc[curr.ref_outlet_id] = (acc[curr.ref_outlet_id] || 0) + curr.remaining_balance
        return acc
    }, {})

    const result = Object.entries(grouped).map(([id, amount]) => ({
        outlet_id: id,
        total_debt: amount as number
    }))

    return { data: result, error: null, isSuccess: true }
  } catch (error: any) {
    return { data: null, error: error.message, isSuccess: false }
  }
}

export async function processPaydown(params: PaydownParams): Promise<ApiResponse<any>> {
  try {
    // Construct args dynamically to handle optional parameters and backward compatibility
    // If we pass p_ref_outlet_id: null to a function that doesn't have that argument (old schema), it might fail matching.
    // However, for STO we need it. For Supplier Paydown, we can omit it if null.

    const rpcArgs: any = {
       p_outlet_id: params.outlet_id,
       p_supplier_id: params.supplier_id || null, 
       p_account_id: params.account_id,
       p_payment_date: params.payment_date,
       p_total_amount: params.total_amount,
       p_invoices: params.invoices,
       p_notes: params.notes || null,
       p_user_id: params.user_id,
    }

    // Only add p_ref_outlet_id if it's provided (not null/undefined)
    // This allows the call to succeed on older DB versions for Supplier Paydown (where param doesn't exist)
    // AND triggers the new logic for STO Paydown.
    // NOTE: New DB function should have DEFAULT NULL for this param.
    if (params.ref_outlet_id) {
        rpcArgs.p_ref_outlet_id = params.ref_outlet_id
    }

    const { data, error } = await supabase.rpc('process_bulk_payment', rpcArgs)

    if (error) throw error

    return { data, error: null, isSuccess: true }
  } catch (error: any) {
    return { data: null, error: error.message, isSuccess: false }
  }
}

// ==========================================
// REPORTS (AP AGING)
// ==========================================

export async function getApAgingReport(outletCode: string): Promise<ApiResponse<ApAgingItem[]>> {
  try {
    const { data, error } = await supabase
      .from('view_report_ap_aging')
      .select('*')
      .eq('debtor_outlet', outletCode)
      .order('bucket_60_plus', { ascending: false })

    if (error) throw error

    return { data: data as ApAgingItem[], error: null, isSuccess: true }
  } catch (error: any) {
    console.error('Error fetching AP Aging Report:', error)
    return { data: null, error: error.message, isSuccess: false }
  }
}

// ==========================================
// REPORTS (CASH FLOW)
// ==========================================

export async function getCashFlowReport(
    outletCode: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<CashFlowItem[]>> {
    try {
      let query = supabase
        .from('view_report_cash_flow')
        .select('*')
        .eq('kode_outlet', outletCode)
        .order('created_at', { ascending: false })
  
      if (startDate && endDate) {
        query = query.gte('created_at', startDate).lte('created_at', endDate)
      }
  
      const { data, error } = await query
  
      if (error) throw error
  
      return {
        data: data as CashFlowItem[],
        error: null,
        isSuccess: true,
      }
    } catch (error: any) {
      console.error('Error fetching Cash Flow Report:', error)
      return {
        data: null,
        error: error.message,
        isSuccess: false,
      }
    }
  }
