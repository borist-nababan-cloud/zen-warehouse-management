import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { TrafficData } from '@/types/dashboard'
import { DashboardFilters } from '@/components/features/financial/DashboardFilters'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { TrafficHeatmap } from './TrafficHeatmap'
import { HourlyTrendChart } from './HourlyTrendChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, TrendingUp } from 'lucide-react'

interface PeakHoursHistoricalSectionProps {
    userRole?: number
    userOutlet?: string
    availableOutlets?: { kode_outlet: string; name_outlet: string }[]
}

export function PeakHoursHistoricalSection({ userRole, userOutlet, availableOutlets }: PeakHoursHistoricalSectionProps) {
    // Default to This Week
    const [filters, setFilters] = useState({
        startDate: startOfWeek(new Date(), { weekStartsOn: 1 }),
        endDate: endOfWeek(new Date(), { weekStartsOn: 1 }),
        outletId: 'ALL'
    })

    const [heatmapData, setHeatmapData] = useState<Record<number, Record<number, number>>>({})
    const [maxHeatmapValue, setMaxHeatmapValue] = useState(0)
    const [hourlyTrend, setHourlyTrend] = useState<{ hour: number; value: number }[]>([])
    const [kpi, setKpi] = useState({
        busiestDay: { name: '-', value: 0 },
        peakHourGlobal: { hour: '-', value: 0 }, // Average or Total Peak
        totalTraffic: 0
    })

    // Sync initial outlet filter
    useEffect(() => {
        if (userRole && userRole !== 1 && userRole !== 5 && userRole !== 8) {
            setFilters(prev => ({ ...prev, outletId: userOutlet || 'ALL' }))
        }
    }, [userRole, userOutlet])

    const fetchData = useCallback(async () => {
        if (!filters.startDate || !filters.endDate) return

        try {
            let query = supabase
                .from('view_peak_hours')
                .select('*')
                .gte('tanggal', format(filters.startDate, 'yyyy-MM-dd'))
                .lte('tanggal', format(filters.endDate, 'yyyy-MM-dd'))

            if (filters.outletId !== 'ALL') {
                query = query.eq('kode_outlet', filters.outletId)
            }

            const { data, error } = await query
            if (error) throw error

            if (data) {
                const traffic = data as TrafficData[]

                // 1. Process Heatmap Data & Busiest Day
                const map: Record<number, Record<number, number>> = {}
                const dayTotals: Record<string, number> = {}
                let maxVal = 0

                traffic.forEach(item => {
                    const d = item.day_index
                    const h = item.hour_block
                    const val = item.transaction_value

                    if (!map[d]) map[d] = {}
                    map[d][h] = (map[d][h] || 0) + val

                    if (map[d][h] > maxVal) maxVal = map[d][h]

                    // Day Totals
                    dayTotals[item.day_name] = (dayTotals[item.day_name] || 0) + val
                })

                setHeatmapData(map)
                setMaxHeatmapValue(maxVal)

                // 2. Process Hourly Trend & Peak Hour
                const hourTotals: Record<number, number> = {}
                traffic.forEach(item => {
                    hourTotals[item.hour_block] = (hourTotals[item.hour_block] || 0) + item.transaction_value
                })

                const trendData = Object.entries(hourTotals).map(([h, val]) => ({
                    hour: parseInt(h),
                    value: val
                })).sort((a, b) => a.hour - b.hour)

                setHourlyTrend(trendData)

                // 3. KPI Calculations
                // Total Traffic
                const total = traffic.reduce((sum, t) => sum + t.transaction_value, 0)

                // Busiest Day
                let maxDayName = '-'
                let maxDayVal = 0
                Object.entries(dayTotals).forEach(([name, val]) => {
                    if (val > maxDayVal) {
                        maxDayVal = val
                        maxDayName = name
                    }
                })

                // Peak Hour Global (Most busy hour across all days)
                let maxHourVal = 0
                let maxGlobalHour = '-'
                trendData.forEach(d => {
                    if (d.value > maxHourVal) {
                        maxHourVal = d.value
                        maxGlobalHour = `${d.hour}:00`
                    }
                })

                setKpi({
                    busiestDay: { name: maxDayName, value: maxDayVal },
                    peakHourGlobal: { hour: maxGlobalHour, value: maxHourVal },
                    totalTraffic: total
                })
            }
        } catch (err) {
            console.error('Error fetching peak hours history:', err)
        }
    }, [filters])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Historical Analysis</h2>
                    <p className="text-sm text-muted-foreground">Traffic patterns and staffing optimization data.</p>
                </div>
            </div>

            <DashboardFilters
                filters={filters}
                onFilterChange={setFilters as any}
                userRole={userRole as any}
                userOutlet={userOutlet}
                availableOutlets={availableOutlets}
                showPresets={true}
            />

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Volume (Selected Period)</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpi.totalTraffic.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Total transactions during this range</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Busiest Day</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpi.busiestDay.name}</div>
                        <p className="text-xs text-muted-foreground">{kpi.busiestDay.value.toLocaleString()} transactions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Peak Hour (Global)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpi.peakHourGlobal.hour}</div>
                        <p className="text-xs text-muted-foreground">Highest aggregate volume: {kpi.peakHourGlobal.value.toLocaleString()}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Heatmap & Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Heatmap takes full width or larger portion */}
                <div className="lg:col-span-3">
                    <TrafficHeatmap data={heatmapData} maxValue={maxHeatmapValue} />
                </div>

                {/* Trend Chart */}
                <div className="lg:col-span-3">
                    <HourlyTrendChart data={hourlyTrend} />
                </div>
            </div>
        </div>
    )
}

function Users(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
