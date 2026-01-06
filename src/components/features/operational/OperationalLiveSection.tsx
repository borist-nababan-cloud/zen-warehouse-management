import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { OperationalMetric } from '@/types/dashboard'
import { Button } from '@/components/ui/button'
import { RefreshCw, Clock, Users, Timer, Store, UserCheck, Tag } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OperationalLiveSectionProps {
    userRole?: number
    userOutlet?: string
    availableOutlets: { kode_outlet: string, name_outlet: string }[]
}

export function OperationalLiveSection({ userRole, userOutlet, availableOutlets }: OperationalLiveSectionProps) {
    const [data, setData] = useState<OperationalMetric[]>([])
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
                .from('view_operational_dashboard')
                .select('*')
                .gte('tanggal', format(startOfDay(today), 'yyyy-MM-dd'))
                .lte('tanggal', format(endOfDay(today), 'yyyy-MM-dd'))

            // Apply Outlet Filter
            if (userRole !== 1 && userRole !== 5 && userRole !== 8 && userOutlet) {
                query = query.eq('kode_outlet', userOutlet)
            } else if (selectedOutletId !== 'ALL') {
                query = query.eq('kode_outlet', selectedOutletId)
            }

            const { data: result, error } = await query

            if (error) throw error

            setData(result as OperationalMetric[])
            setLastUpdated(new Date())
            toast.success('Live operational data updated', { id: 'live-op-update' })
        } catch (err) {
            console.error('Error fetching live operational data:', err)
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

    // Aggregation for Live KPIs
    const liveStats = useMemo(() => {
        const totalDurationMinutes = data.reduce((sum, item) => sum + (item.duration_minutes || 0), 0)
        const totalHours = Math.round((totalDurationMinutes / 60) * 10) / 10 // 1 decimal place

        const uniqueGuests = new Set(data.map(item => item.trans_id)).size

        // Guest Count by Gender (Unique Guests)
        const genderMap = new Map<string, string>()
        data.forEach(item => {
            if (item.trans_id) genderMap.set(item.trans_id, item.gender || 'Unknown')
        })
        const genderCounts = { F: 0, M: 0, Unknown: 0 }
        genderMap.forEach((gender) => {
            if (gender === 'F') genderCounts.F++
            else if (gender === 'M') genderCounts.M++
            else genderCounts.Unknown++
        })

        // Guest Count by Service Category (Volume/Rows)
        // User asked "Guest Count by service_category". 
        // Counting occurrences of category usage (if a guest has 2 Massages, counts as 2? or 1?)
        // Usually "Count by Category" implies volume of services sold.
        const categoryCounts: Record<string, number> = {}
        data.forEach(item => {
            const cat = item.service_category || 'Other'
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
        })
        // Get top 3 categories
        const topCategories = Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)

        return {
            totalHours,
            totalGuests: uniqueGuests,
            genderCounts,
            topCategories
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
                            Live Operational Monitor
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Operating Hours</CardTitle>
                        <Timer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{liveStats.totalHours} hrs</div>
                        <p className="text-xs text-muted-foreground">Total duration delivered today</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{liveStats.totalGuests}</div>
                        <p className="text-xs text-muted-foreground">Unique transactions today</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Guests by Gender</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Female</span>
                                <span className="font-bold">{liveStats.genderCounts.F}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Male</span>
                                <span className="font-bold">{liveStats.genderCounts.M}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Services</CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-1">
                            {liveStats.topCategories.length > 0 ? liveStats.topCategories.map(([cat, count]) => (
                                <div key={cat} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground truncate max-w-[100px]">{cat}</span>
                                    <span className="font-bold whitespace-nowrap">{count} <span className="text-[10px] font-normal text-muted-foreground">guests</span></span>
                                </div>
                            )) : (
                                <span className="text-xs text-slate-400">No services yet</span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
