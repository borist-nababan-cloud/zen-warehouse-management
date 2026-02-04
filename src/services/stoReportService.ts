import { supabase } from '@/lib/supabase'
import { ApiResponse, StoSummaryReportItem, StoTransitReportItem, StoOrderList, StoOrderItem, StoReceiptList, StoReceiptItem } from '@/types/database'
import { format } from 'date-fns'

interface StoReportFilters {
    startDate?: Date
    endDate?: Date
    outlet?: string // Optional specific outlet filter
    userOutlet: string // The logged-in user's outlet
}

// Helper to build the outlet filter query
// If 'outlet' is provided (Role 5/8 selected one), use it.
// Else, strictly lock to 'userOutlet'.
const applyOutletFilter = (query: any, userOutlet: string, selectedOutlet?: string, columnObj: { from?: string, to?: string } = { from: 'from_outlet', to: 'to_outlet' }) => {
    if (selectedOutlet && selectedOutlet !== 'ALL') {
        // User (likely admin) selected a specific outlet. 
        // We filter where EITHER from OR to matches this selected outlet.
        return query.or(`${columnObj.from}.eq.${selectedOutlet},${columnObj.to}.eq.${selectedOutlet}`)
    }
    
    // Default / Security Fallback:
    // If no specific outlet selected OR user doesn't have permission to select (frontend logic),
    // we MUST filter by their assigned outlet.
    // logic: show records where I am Sender OR Receiver
    return query.or(`${columnObj.from}.eq.${userOutlet},${columnObj.to}.eq.${userOutlet}`)
}

export async function getStoSummaryReport(filters: StoReportFilters & { direction?: 'ALL' | 'INCOMING' | 'OUTGOING' }): Promise<ApiResponse<StoSummaryReportItem[]>> {
    try {
        let query = supabase
            .from('view_report_sto_summary')
            .select('*')
            .order('order_date', { ascending: false })

        if (filters.startDate) query = query.gte('order_date', format(filters.startDate, 'yyyy-MM-dd'))
        if (filters.endDate) query = query.lte('order_date', format(filters.endDate, 'yyyy-MM-dd'))

        // Direction logic overrides standard outlet filter
        if (filters.direction === 'INCOMING') {
             query = query.eq('to_outlet', filters.userOutlet)
        } else if (filters.direction === 'OUTGOING') {
             query = query.eq('from_outlet', filters.userOutlet)
        } else {
             // ALL direction
             query = applyOutletFilter(query, filters.userOutlet, filters.outlet)
        }

        const { data, error } = await query
        if (error) throw error
        return { isSuccess: true, data: data as StoSummaryReportItem[], error: null }
    } catch (err: any) {
        console.error('[StoReport] Summary Error:', err)
        return { isSuccess: false, data: null, error: err.message }
    }
}

export async function getStoTransitReport(userOutlet: string): Promise<ApiResponse<StoTransitReportItem[]>> {
    try {
        let query = supabase
            .from('view_report_sto_transit')
            .select('*')
            .order('days_in_transit', { ascending: false })
            
            
        // View now supports both from_outlet and to_outlet (after user applied SQL fix).
        // We filter standardly: Show if I am Sender OR Receiver.
        query = applyOutletFilter(query, userOutlet)

        const { data, error } = await query
        if (error) throw error
        return { isSuccess: true, data: data as StoTransitReportItem[], error: null }
    } catch (err: any) {
        console.error('[StoReport] Transit Error:', err)
        return { isSuccess: false, data: null, error: err.message }
    }
}

// ============================================
// NEW REPORTS
// ============================================

// 1. STO Orders Report
export async function getStoOrdersReport(filters: StoReportFilters): Promise<ApiResponse<StoOrderList[]>> {
    try {
        let query = supabase.from('view_report_sto_order_list').select('*').order('order_date', { ascending: false })
        
        if (filters.startDate) query = query.gte('order_date', format(filters.startDate, 'yyyy-MM-dd'))
        if (filters.endDate) query = query.lte('order_date', format(filters.endDate, 'yyyy-MM-dd'))
        
        query = applyOutletFilter(query, filters.userOutlet, filters.outlet)

        const { data, error } = await query
        if (error) throw error
        return { isSuccess: true, data: data as StoOrderList[], error: null }
    } catch (err: any) {
        return { isSuccess: false, data: null, error: err.message }
    }
}

// 2. STO Order Items Report
export async function getStoOrderItemsReport(filters: StoReportFilters): Promise<ApiResponse<StoOrderItem[]>> {
    try {
        // Note: View might not have from/to columns directly if it's item level. 
        // Assuming view_report_sto_order_items HAS from_outlet/to_outlet for filtering.
        // If not, we'd need to join, but views usually denormalize this.
        let query = supabase.from('view_report_sto_order_items').select('*').order('order_date', { ascending: false })

        if (filters.startDate) query = query.gte('order_date', format(filters.startDate, 'yyyy-MM-dd'))
        if (filters.endDate) query = query.lte('order_date', format(filters.endDate, 'yyyy-MM-dd'))
        
        // Check if view has these columns. Assuming YES based on requirements.
        // If the view doesn't have 'from_outlet', this will fail. 
        // Docs say: "Filter data so users only see records related to their outlet".
        // Use default columns from typical view structure.
        query = applyOutletFilter(query, filters.userOutlet, filters.outlet)

        const { data, error } = await query
        if (error) throw error
        return { isSuccess: true, data: data as StoOrderItem[], error: null }
    } catch (err: any) {
        return { isSuccess: false, data: null, error: err.message }
    }
}

// 3. STO Receipts Report
export async function getStoReceiptsReport(filters: StoReportFilters): Promise<ApiResponse<StoReceiptList[]>> {
    try {
        let query = supabase.from('view_report_sto_receipt_list').select('*').order('received_at', { ascending: false })

        if (filters.startDate) query = query.gte('received_at', format(filters.startDate, 'yyyy-MM-dd'))
        if (filters.endDate) query = query.lte('received_at', format(filters.endDate, 'yyyy-MM-dd'))
        
        query = applyOutletFilter(query, filters.userOutlet, filters.outlet)

        const { data, error } = await query
        if (error) throw error
        return { isSuccess: true, data: data as StoReceiptList[], error: null }
    } catch (err: any) {
        return { isSuccess: false, data: null, error: err.message }
    }
}

// 4. STO Receipt Items Report
export async function getStoReceiptItemsReport(filters: StoReportFilters): Promise<ApiResponse<StoReceiptItem[]>> {
    try {
        let query = supabase.from('view_report_sto_receipt_items').select('*').order('received_at', { ascending: false })

        if (filters.startDate) query = query.gte('received_at', format(filters.startDate, 'yyyy-MM-dd'))
        if (filters.endDate) query = query.lte('received_at', format(filters.endDate, 'yyyy-MM-dd'))
        
        // This view ONLY has 'to_outlet' (the receiving outlet). It does not have 'from_outlet'.
        // So we strictly filter on 'to_outlet'.
        query = applyOutletFilter(query, filters.userOutlet, filters.outlet, { from: 'to_outlet', to: 'to_outlet' })

        const { data, error } = await query
        if (error) throw error
        return { isSuccess: true, data: data as StoReceiptItem[], error: null }
    } catch (err: any) {
        return { isSuccess: false, data: null, error: err.message }
    }
}
