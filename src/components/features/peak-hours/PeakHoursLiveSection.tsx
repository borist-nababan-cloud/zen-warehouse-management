import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { Users, Clock } from 'lucide-react'
import { TrafficData } from '@/types/dashboard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'

interface PeakHoursLiveSectionProps {
    userRole?: number
    userOutlet?: string
    availableOutlets?: { kode_outlet: string; name_outlet: string }[]
}

export function PeakHoursLiveSection({ userRole, userOutlet, availableOutlets }: PeakHoursLiveSectionProps) {
    const [data, setData] = useState<TrafficData[]>([])
    const [selectedOutletId, setSelectedOutletId] = useState<string>('ALL')
    const [metrics, setMetrics] = useState({
        totalVisitors: 0,
        currentHourTraffic: 0,
        busiestHourToday: { hour: 0, value: 0 }
    })

    // Init Outlet selection based on role
    useEffect(() => {
        if (userRole && userRole !== 1 && userRole !== 5 && userRole !== 8) {
            setSelectedOutletId(userOutlet || 'ALL')
        }
    }, [userRole, userOutlet])

    const fetchData = useCallback(async () => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd')
            const currentHour = new Date().getHours()

            let query = supabase
                .from('view_peak_hours')
                .select('*')
                .eq('tanggal', today)

            if (selectedOutletId !== 'ALL') {
                query = query.eq('kode_outlet', selectedOutletId)
            }

            const { data: result, error } = await query

            if (error) throw error

            if (result) {
                const typedData = result as TrafficData[]
                setData(typedData)

                // Calculate Metrics
                const totalVisitors = typedData.reduce((sum, item) => sum + item.transaction_value, 0)

                // Aggregate by hour for today
                const hourlyMap: Record<number, number> = {}
                let currentTraffic = 0

                typedData.forEach(item => {
                    hourlyMap[item.hour_block] = (hourlyMap[item.hour_block] || 0) + item.transaction_value
                    if (item.hour_block === currentHour) {
                        currentTraffic += item.transaction_value
                    }
                })

                // Find busiest hour today
                let maxVal = 0
                let maxHour = 0
                Object.entries(hourlyMap).forEach(([h, val]) => {
                    if (val > maxVal) {
                        maxVal = val
                        maxHour = parseInt(h)
                    }
                })

                setMetrics({
                    totalVisitors,
                    currentHourTraffic: currentTraffic,
                    busiestHourToday: { hour: maxHour, value: maxVal }
                })
            }
        } catch (error) {
            console.error('Error fetching live peak hours data:', error)
        }
    }, [selectedOutletId])

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 300000) // 5 mins
        return () => clearInterval(interval)
    }, [fetchData])

    // Prepare Chart Data (09:00 - 22:00)
    const chartData = Array.from({ length: 14 }, (_, i) => {
        const hour = i + 9
        const found = data.filter(d => d.hour_block === hour).reduce((sum, item) => sum + item.transaction_value, 0)
        return { hour: `${hour}:00`, value: found }
    })

    const canSelectOutlet = userRole === 1 || userRole === 5 || userRole === 8

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Live Traffic Monitor</h2>
                    <p className="text-sm text-muted-foreground">Real-time visitor tracking for today {format(new Date(), 'dd MMM yyyy')}</p>
                </div>

                {/* Outlet Selector for Live Section */}
                {canSelectOutlet && availableOutlets && (
                    <div className="flex items-center gap-2">
                        <select
                            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm md:w-[200px]"
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
                        <Button variant="outline" size="sm" onClick={fetchData}>
                            Refresh
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-indigo-50 border-indigo-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-700">Total Visitors Today</CardTitle>
                        <Users className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-900">{metrics.totalVisitors.toLocaleString()}</div>
                        <p className="text-xs text-indigo-600">Walk-ins + Appointments</p>
                    </CardContent>
                </Card>
                <Card className="bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Current Hour Traffic</CardTitle>
                        <Clock className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{metrics.currentHourTraffic.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Customers in this hour block</p>
                    </CardContent>
                </Card>
                <Card className="bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Peak Hour Today</CardTitle>
                        <Users className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{metrics.busiestHourToday.hour}:00</div>
                        <p className="text-xs text-muted-foreground">{metrics.busiestHourToday.value.toLocaleString()} visitors</p>
                    </CardContent>
                </Card>
            </div>

            {/* Live Chart */}
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Hourly Traffic (Today)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
