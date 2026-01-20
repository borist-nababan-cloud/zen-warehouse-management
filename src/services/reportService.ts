import { supabase } from '@/lib/supabase'
import { ApiResponse, ViewReportPoOutstanding, ViewReportSupplierPerformance, ViewReportPurchaseOrders } from '@/types/database'

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
        .eq('kode_outlet', kodeOutlet)
        .order('po_created_at', { ascending: false })

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
      const { data, error } = await supabase
        .from('view_report_supplier_performance')
        .select('*')
        .eq('kode_outlet', kodeOutlet)
        // Default sort by fulfillment rate ascending (worst first) as per requirements
        .order('fulfillment_rate_percent', { ascending: true })

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
        .eq('kode_outlet', kodeOutlet)
        .order('po_date', { ascending: false })

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
  }
}
