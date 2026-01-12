import { supabase } from '@/lib/supabase'
import { ApiResponse, FinanceTransactionCategory } from '@/types/database'

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
  supplier_id: string
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
    // Join finance_ap_ledger with purchase_invoices to get document number
    const { data, error } = await supabase
      .from('finance_ap_ledger')
      .select(`
        invoice_id,
        remaining_balance,
        due_date,
        purchase_invoices!inner (
          document_number,
          invoice_date,
          total_amount
        )
      `)
      .eq('kode_supplier', supplierId)
      .eq('kode_outlet', outletCode)
      .eq('is_paid', false)
      .gt('remaining_balance', 0)
      .order('due_date', { ascending: true })

    if (error) throw error

    const formatted: UnpaidInvoice[] = data.map((item: any) => ({
      invoice_id: item.invoice_id,
      document_number: item.purchase_invoices.document_number,
      invoice_date: item.purchase_invoices.invoice_date,
      due_date: item.due_date,
      total_amount: item.purchase_invoices.total_amount,
      remaining_balance: item.remaining_balance
    }))

    return { data: formatted, error: null, isSuccess: true }
  } catch (error: any) {
    console.error('Error fetching unpaid invoices:', error)
    return { data: null, error: error.message, isSuccess: false }
  }
}

export async function processPaydown(params: PaydownParams): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase.rpc('process_bulk_payment', {
       p_outlet_id: params.outlet_id,
       p_supplier_id: params.supplier_id,
       p_account_id: params.account_id,
       p_payment_date: params.payment_date,
       p_total_amount: params.total_amount,
       p_invoices: params.invoices,
       p_notes: params.notes || null,
       p_user_id: params.user_id
    })

    if (error) throw error

    return { data, error: null, isSuccess: true }
  } catch (error: any) {
    console.error('Error processing paydown:', error)
    return { data: null, error: error.message, isSuccess: false }
  }
}
