import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { OperationalMetric, OperationalDashboardState, DashboardFilter, TherapistPerformance } from '@/types/dashboard'
import { DashboardFilters } from '@/components/features/financial/DashboardFilters'
import { startOfMonth, format, startOfDay, endOfDay } from 'date-fns'
import { toast } from 'sonner'
import { History } from 'lucide-react'
import { GenderChart } from './GenderChart'
// import { RoomEfficiencyChart } from './RoomEfficiencyChart' // Removed
import { ServiceCategoryChart } from './ServiceCategoryChart'
import { TherapistLeaderboard } from './TherapistLeaderboard'
import { TherapistMarketShare } from './TherapistMarketShare'
import { RoomMarketShare } from './RoomMarketShare'
import { RoleId } from '@/types/database'

interface OperationalHistoricalSectionProps {
    userRole?: number
    userOutlet?: string
    availableOutlets: { kode_outlet: string, name_outlet: string }[]
}

export function OperationalHistoricalSection({ userRole, userOutlet, availableOutlets }: OperationalHistoricalSectionProps) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<OperationalMetric[]>([])

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

    // Fetch Data
    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            try {
                let query = supabase.from('view_operational_dashboard').select('*')

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
                setData(result as OperationalMetric[])
            } catch (err) {
                console.error('Error fetching operational history:', err)
                toast.error('Failed to load operational data')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [filters, userRole, userOutlet])

    // --- AGGREGATION LOGIC ---

    const dashboardState: OperationalDashboardState = useMemo(() => {
        const totalDurationMinutes = data.reduce((sum, item) => sum + (item.duration_minutes || 0), 0)
        const totalHours = Math.round((totalDurationMinutes / 60) * 10) / 10
        const totalGuests = new Set(data.map(item => item.trans_id)).size

        // 1. Gender Distribution
        const genderCounts = data.reduce((acc, item) => {
            const gender = item.gender || 'Unknown'
            acc[gender] = (acc[gender] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const genderDistribution = Object.entries(genderCounts).map(([name, value]) => ({
            name: name === 'F' ? 'Female' : name === 'M' ? 'Male' : name,
            value,
            color: '' // Handled in component
        }))

        // 2. Service Category Count
        const categoryCounts = data.reduce((acc, item) => {
            const cat = item.service_category || 'Other'
            acc[cat] = (acc[cat] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        const serviceCategoryData = Object.entries(categoryCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value) // Sort DSC by volume

        // 3. Therapist Performance (Market Share & Leaderboard)
        const therapistMap = data.reduce((acc, item) => {
            if (!item.therapist_id) return acc

            if (!acc[item.therapist_id]) {
                acc[item.therapist_id] = {
                    therapistId: item.therapist_id,
                    therapistName: item.therapist_name || item.therapist_id,
                    totalDuration: 0,
                    requestCount: 0,
                    transactionCount: 0,
                    serviceDistribution: {}
                }
            }

            const t = acc[item.therapist_id]
            t.totalDuration += (item.duration_minutes || 0)
            t.transactionCount += 1
            if (item.is_by_request === 'Y') t.requestCount += 1

            const cat = item.service_category || 'Other'
            t.serviceDistribution[cat] = (t.serviceDistribution[cat] || 0) + 1

            return acc
        }, {} as Record<string, TherapistPerformance>)

        // Calculate Market Share Percentages
        const categoryTotals: Record<string, number> = {}
        data.forEach(item => {
            const cat = item.service_category || 'Other'
            categoryTotals[cat] = (categoryTotals[cat] || 0) + 1
        })

        // -- Therapist Stats Finalization --
        const therapistStats = Object.values(therapistMap).map(t => {
            const shareDistribution: Record<string, number> = {}
            Object.entries(t.serviceDistribution).forEach(([cat, count]) => {
                const totalInCat = categoryTotals[cat] || 1
                shareDistribution[cat] = (count / totalInCat) * 100
            })
            return {
                ...t,
                serviceDistribution: shareDistribution
            }
        })
            // Sort by Therapist ID Ascending
            .sort((a, b) => a.therapistId.localeCompare(b.therapistId, undefined, { numeric: true }))

        // 4. Room Market Share Aggregation
        const roomMap = data.reduce((acc, item) => {
            if (!item.room_id) return acc

            if (!acc[item.room_id]) {
                acc[item.room_id] = {
                    roomId: item.room_id,
                    transactionCount: 0,
                    serviceDistribution: {}
                }
            }

            const r = acc[item.room_id]
            r.transactionCount += 1

            const cat = item.service_category || 'Other'
            r.serviceDistribution[cat] = (r.serviceDistribution[cat] || 0) + 1
            return acc
        }, {} as Record<string, { roomId: string, transactionCount: number, serviceDistribution: Record<string, number> }>)

        const roomStats = Object.values(roomMap).map(r => {
            const shareDistribution: Record<string, number> = {}
            Object.entries(r.serviceDistribution).forEach(([cat, count]) => {
                const totalInCat = categoryTotals[cat] || 1
                shareDistribution[cat] = (count / totalInCat) * 100
            })
            return {
                ...r,
                serviceDistribution: shareDistribution
            }
        }).sort((a, b) => a.roomId.localeCompare(b.roomId, undefined, { numeric: true }))

        return {
            totalHours,
            totalGuests,
            genderDistribution,
            serviceCategoryData, // New field, will need to update types if strictly typed, but let's pass it to component
            therapistStats,
            roomStats
        }
    }, [data])


    return (
        <div className="space-y-6 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-4">
                <History className="h-5 w-5 text-slate-500" />
                <h2 className="text-xl font-bold tracking-tight text-slate-800">Historical Operational Analysis</h2>
            </div>

            <DashboardFilters
                filters={filters}
                onFilterChange={setFilters}
                userRole={userRole as RoleId | undefined}
                userOutlet={userOutlet}
                availableOutlets={availableOutlets}
                showPresets={true}
            />

            {/* Operational Charts Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
                <GenderChart data={dashboardState.genderDistribution} loading={loading} />
                <ServiceCategoryChart data={(dashboardState as any).serviceCategoryData || []} loading={loading} />
                <TherapistLeaderboard data={dashboardState.therapistStats} loading={loading} />
                <TherapistMarketShare data={dashboardState.therapistStats} loading={loading} />
                <RoomMarketShare data={dashboardState.roomStats} loading={loading} />
            </div>
        </div>
    )
}
