import { supabase } from '@/lib/supabase'
import { ApiResponse, ViewReportPoOutstanding, ViewReportSupplierPerformance, ViewReportPurchaseOrders, ViewReportInternalUsage, ViewReportInternalReturn } from '@/types/database'

export const reportService = {
  /**
   * Fetch Outstanding PO (Backorder) Report
   */
  async getOutstandingPoReport(
    kodeOutlet: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<ViewReportPoOutstanding[]>> {
    try {
      let query = supabase
        .from('view_report_po_outstanding')
        .select('*')
        .order('po_created_at', { ascending: false })

      if (kodeOutlet && kodeOutlet !== 'ALL') {
        query = query.eq('kode_outlet', kodeOutlet)
      }

      if (startDate) {
        query = query.gte('po_created_at', startDate)
      }

      if (endDate) {
        query = query.lte('po_created_at', endDate)
      }

      const { data, error } = await query

      if (error) throw error

      return {
        data: data as ViewReportPoOutstanding[],
        error: null,
        isSuccess: true
      }
    } catch (error: any) {
      console.error('Error fetching outstanding PO report:', error)
      return {
        data: null,
        error: error.message,
        isSuccess: false
      }
    }
  },

  /**
   * Fetch Supplier Performance Report
   */
  async getSupplierPerformanceReport(
    kodeOutlet: string
  ): Promise<ApiResponse<ViewReportSupplierPerformance[]>> {
    try {
      let query = supabase
        .from('view_report_supplier_performance')
        .select('*')
        // Default sort by fulfillment rate ascending (worst first) as per requirements
        .order('fulfillment_rate_percent', { ascending: true })

      if (kodeOutlet && kodeOutlet !== 'ALL') {
        query = query.eq('kode_outlet', kodeOutlet)
      }

      const { data, error } = await query

      if (error) throw error

      return {
        data: data as ViewReportSupplierPerformance[],
        error: null,
        isSuccess: true
      }
    } catch (error: any) {
      console.error('Error fetching supplier performance report:', error)
      return {
        data: null,
        error: error.message,
        isSuccess: false
      }
    }
  },

  /**
   * Fetch Report PO
   */
  async getPoReport(
    kodeOutlet: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<ViewReportPurchaseOrders[]>> {
    try {
      let query = supabase
        .from('view_report_purchase_orders')
        .select('*')
        .order('po_date', { ascending: false })

      if (kodeOutlet && kodeOutlet !== 'ALL') {
        query = query.eq('kode_outlet', kodeOutlet)
      }

      if (startDate) {
        query = query.gte('po_date', startDate)
      }

      if (endDate) {
        query = query.lte('po_date', endDate)
      }

      const { data, error } = await query

      if (error) throw error

      return {
        data: data as ViewReportPurchaseOrders[],
        error: null,
        isSuccess: true
      }
    } catch (error: any) {
      console.error('Error fetching PO report:', error)
      return {
        data: null,
        error: error.message,
        isSuccess: false
      }
    }
  },

  /**
   * Fetch Internal Usage Report
   */
  async getInternalUsageReport(
    kodeOutlet: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<ViewReportInternalUsage[]>> {
    try {
      let query = supabase
        .from('view_report_internal_usage')
        .select('*')
        .order('transaction_date', { ascending: false })

      if (kodeOutlet && kodeOutlet !== 'ALL') {
        query = query.eq('kode_outlet', kodeOutlet)
      }

      if (startDate) {
        query = query.gte('transaction_date', startDate)
      }

      if (endDate) {
        query = query.lte('transaction_date', endDate)
      }

      const { data, error } = await query

      if (error) throw error

      return {
        data: data as ViewReportInternalUsage[],
        error: null,
        isSuccess: true
      }
    } catch (error: any) {
      console.error('Error fetching internal usage report:', error)
      return {
        data: null,
        error: error.message,
        isSuccess: false
      }
    }
  },

  /**
   * Fetch Internal Return Report
   */
  async getInternalReturnReport(
    kodeOutlet: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<ViewReportInternalReturn[]>> {
    try {
      let query = supabase
        .from('view_report_internal_return')
        .select('*')
        .order('transaction_date', { ascending: false })

      if (kodeOutlet && kodeOutlet !== 'ALL') {
        query = query.eq('kode_outlet', kodeOutlet)
      }

      if (startDate) {
        query = query.gte('transaction_date', startDate)
      }

      if (endDate) {
        query = query.lte('transaction_date', endDate)
      }

      const { data, error } = await query

      if (error) throw error

      return {
        data: data as ViewReportInternalReturn[],
        error: null,
        isSuccess: true
      }
    } catch (error: any) {
      console.error('Error fetching internal return report:', error)
      return {
        data: null,
        error: error.message,
        isSuccess: false
      }
    }
  }
}
