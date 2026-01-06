import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { FinancialMetric, DashboardState, DashboardFilter, DailyRevenue, PaymentMethodStats, BankStats } from '@/types/dashboard'
import { KPIGrid } from './KPIGrid'
import { RevenueChart } from './RevenueChart'
import { PaymentMethodChart } from './PaymentMethodChart'
import { BankReconciliationChart } from './BankReconciliationChart'
// import { DiscountChart } from './DiscountChart' // Removed
import { OutletRevenueTrendChart } from './OutletRevenueTrendChart'
import { DashboardFilters } from './DashboardFilters'
import { startOfMonth, format, startOfDay, endOfDay } from 'date-fns'
import { toast } from 'sonner'
import { History } from 'lucide-react'
import { RoleId } from '@/types/database'

interface HistoricalSectionProps {
    userRole?: number
    userOutlet?: string
    availableOutlets: { kode_outlet: string, name_outlet: string }[]
}

export function HistoricalSection({ userRole, userOutlet, availableOutlets }: HistoricalSectionProps) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<FinancialMetric[]>([])

    // Default to Current Month on mount
    const [filters, setFilters] = useState<DashboardFilter>({
        startDate: startOfMonth(new Date()),
        endDate: new Date(),
        outletId: 'ALL'
    })

    // Init Outlet Filter
    useEffect(() => {
        if (userRole && userRole !== 1 && userRole !== 5 && userRole !== 8) {
            setFilters(prev => ({ ...prev, outletId: userOutlet || 'ALL' }))
        }
    }, [userRole, userOutlet])

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            try {
                let query = supabase.from('view_financial_dashboard').select('*')

                if (filters.startDate) {
                    query = query.gte('tanggal', format(startOfDay(filters.startDate), 'yyyy-MM-dd'))
                }
                if (filters.endDate) {
                    query = query.lte('tanggal', format(endOfDay(filters.endDate), 'yyyy-MM-dd'))
                }
                if (filters.outletId !== 'ALL') {
                    query = query.eq('kode_outlet', filters.outletId)
                }
                // Safety RLS check
                if (userRole !== 1 && userRole !== 5 && userRole !== 8 && userOutlet) {
                    query = query.eq('kode_outlet', userOutlet)
                }

                const { data: result, error } = await query
                if (error) throw error
                setData(result as FinancialMetric[])
            } catch (err) {
                console.error('Error fetching historical data:', err)
                toast.error('Failed to load historical data')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [filters, userRole, userOutlet])

    // --- AGGREGATION LOGIC (Reused from Page) ---

    const dashboardState: DashboardState = useMemo(() => {
        const totalRevenue = data.reduce((sum, item) => sum + (item.net_revenue || 0), 0)
        const totalDiscounts = data.reduce((sum, item) => sum + (item.amount_discount || 0), 0)
        const totalCash = data.reduce((sum, item) => sum + (item.amount_cash || 0), 0)
        return { totalRevenue, totalDiscounts, totalCash }
    }, [data])

    const revenueTrend: DailyRevenue[] = useMemo(() => {
        const grouped = data.reduce((acc, item) => {
            const date = item.tanggal ? item.tanggal.split('T')[0] : ''
            if (!date) return acc
            acc[date] = (acc[date] || 0) + (item.net_revenue || 0)
            return acc
        }, {} as Record<string, number>)
        return Object.entries(grouped)
            .map(([date, revenue]) => ({ date, revenue }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }, [data])

    const paymentMix: PaymentMethodStats[] = useMemo(() => {
        const totals: Record<string, number> = { 'CASH': 0, 'GIFT': 0 }
        data.forEach(row => {
            totals['CASH'] += (row.amount_cash || 0)
            totals['GIFT'] += (row.amount_gift || 0)
            if (row.method_1) {
                const method = row.method_1.toUpperCase()
                totals[method] = (totals[method] || 0) + (row.amount_1 || 0)
            }
            if (row.method_2) {
                const method = row.method_2.toUpperCase()
                totals[method] = (totals[method] || 0) + (row.amount_2 || 0)
            }
        })
        return Object.entries(totals)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ name, value, color: '' }))
    }, [data])

    const bankStats: BankStats[] = useMemo(() => {
        const totals: Record<string, number> = {}
        data.forEach(row => {
            // Processing Slot 1
            if (row.amount_1) {
                // If bank_1 is present (e.g. BCA), use it. 
                // If not, fallback to method_1 (e.g. GO-PAY, CONTROL, PAYLATER).
                const key = (row.bank_1 || row.method_1 || 'UNKNOWN').toUpperCase()
                totals[key] = (totals[key] || 0) + row.amount_1
            }

            // Processing Slot 2
            if (row.amount_2) {
                const key = (row.bank_2 || row.method_2 || 'UNKNOWN').toUpperCase()
                totals[key] = (totals[key] || 0) + row.amount_2
            }
        })
        return Object.entries(totals)
            .map(([bankName, amount]) => ({ bankName, amount }))
            .sort((a, b) => b.amount - a.amount)
    }, [data])

    const outletRevenueTrend = useMemo(() => {
        if (filters.outletId !== 'ALL') return []

        const grouped: Record<string, any> = {}
        data.forEach(item => {
            const date = item.tanggal ? item.tanggal.split('T')[0] : ''
            if (!date) return

            if (!grouped[date]) {
                grouped[date] = { date }
            }

            const outletCode = item.kode_outlet
            grouped[date][outletCode] = (grouped[date][outletCode] || 0) + (item.net_revenue || 0)
        })

        return Object.values(grouped).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }, [data, filters.outletId])

    const outletNamesMap = useMemo(() => {
        return availableOutlets.reduce((acc, curr) => {
            acc[curr.kode_outlet] = curr.name_outlet
            return acc
        }, {} as Record<string, string>)
    }, [availableOutlets])

    return (
        <div className="space-y-6 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-4">
                <History className="h-5 w-5 text-slate-500" />
                <h2 className="text-xl font-bold tracking-tight text-slate-800">Historical Analysis</h2>
            </div>

            <DashboardFilters
                filters={filters}
                onFilterChange={setFilters}
                userRole={userRole as RoleId | undefined}
                userOutlet={userOutlet}
                availableOutlets={availableOutlets}
                showPresets={true}
            />

            <KPIGrid data={dashboardState} loading={loading} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
                {/* Condition: Show Trend Chart ONLY if All Outlets selected */}
                {filters.outletId === 'ALL' && (
                    <OutletRevenueTrendChart
                        data={outletRevenueTrend}
                        loading={loading}
                        outletNamesMap={outletNamesMap}
                    />
                )}

                <RevenueChart data={revenueTrend} loading={loading} />
                {/* DiscountChart Removed as per request */}
                <PaymentMethodChart data={paymentMix} loading={loading} />
                <BankReconciliationChart data={bankStats} loading={loading} />
            </div>
        </div>
    )
}
