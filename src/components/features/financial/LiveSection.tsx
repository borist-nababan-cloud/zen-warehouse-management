import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { FinancialMetric, DashboardState } from '@/types/dashboard'
import { KPIGrid } from './KPIGrid'
import { Button } from '@/components/ui/button'
import { RefreshCw, Clock, Store } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { toast } from 'sonner'

interface LiveSectionProps {
    userRole?: number
    userOutlet?: string
    availableOutlets: { kode_outlet: string, name_outlet: string }[]
}

export function LiveSection({ userRole, userOutlet, availableOutlets }: LiveSectionProps) {
    const [data, setData] = useState<FinancialMetric[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const [selectedOutletId, setSelectedOutletId] = useState<string>('ALL')

    // Initialize Outlet Filter based on role
    useEffect(() => {
        if (userRole && userRole !== 1 && userRole !== 5 && userRole !== 8) {
            setSelectedOutletId(userOutlet || 'ALL')
        }
    }, [userRole, userOutlet])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const today = new Date()
            let query = supabase
                .from('view_financial_dashboard')
                .select('*')
                .gte('tanggal', format(startOfDay(today), 'yyyy-MM-dd'))
                .lte('tanggal', format(endOfDay(today), 'yyyy-MM-dd'))

            // Apply Outlet Filter
            // If strictly restricted role (not 1, 5, 8), force userOutlet logic (already handled by init but safe to enforce)
            if (userRole !== 1 && userRole !== 5 && userRole !== 8 && userOutlet) {
                query = query.eq('kode_outlet', userOutlet)
            } else if (selectedOutletId !== 'ALL') {
                query = query.eq('kode_outlet', selectedOutletId)
            }

            const { data: result, error } = await query

            if (error) throw error

            setData(result as FinancialMetric[])
            setLastUpdated(new Date())
            toast.success('Live data updated')
        } catch (err) {
            console.error('Error fetching live data:', err)
            toast.error('Failed to update live data')
        } finally {
            setLoading(false)
        }
    }, [userRole, userOutlet, selectedOutletId])

    // Initial load & Auto-refresh interval (5 mins = 300,000ms)
    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 300000)
        return () => clearInterval(interval)
    }, [fetchData])

    // Aggregation Logic (Same as before but just for Today)
    const dashboardState: DashboardState = useMemo(() => {
        const totalRevenue = data.reduce((sum, item) => sum + (item.net_revenue || 0), 0)
        const totalDiscounts = data.reduce((sum, item) => sum + (item.amount_discount || 0), 0)
        const totalCash = data.reduce((sum, item) => sum + (item.amount_cash || 0), 0)

        return {
            totalRevenue,
            totalDiscounts,
            totalCash
        }
    }, [data])

    const canSelectOutlet = userRole === 1 || userRole === 5 || userRole === 8

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            Live Monitor
                        </h2>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Auto-refreshes every 5m
                        </span>
                    </div>

                    {/* Live Outlet Selector */}
                    {canSelectOutlet && (
                        <div className="w-[200px]">
                            <div className="relative">
                                <Store className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <select
                                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 pl-9 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                    value={selectedOutletId}
                                    onChange={(e) => setSelectedOutletId(e.target.value)}
                                >
                                    <option value="ALL">All Outlets</option>
                                    {availableOutlets.map((outlet) => (
                                        <option key={outlet.kode_outlet} value={outlet.kode_outlet}>
                                            {outlet.name_outlet}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">
                        Last updated: {format(lastUpdated, 'HH:mm:ss')}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchData}
                        disabled={loading}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            <KPIGrid data={dashboardState} loading={loading} />

            {/* Optional: Add a simple hourly trend or latest transactions here in the future */}
        </div>
    )
}
