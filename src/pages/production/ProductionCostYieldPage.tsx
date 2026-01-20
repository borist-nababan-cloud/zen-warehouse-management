import React, { useState, useMemo } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { getProductionYieldReport } from '@/services/productionService'
import { ProductionReportFilters } from '@/features/production/components/ProductionReportFilters'
import { ProductionSummaryCards } from '@/features/production/components/ProductionSummaryCards'
import { ProductionYieldTable } from '@/features/production/components/ProductionYieldTable'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Loader2, AlertCircle } from 'lucide-react'

export const ProductionCostYieldPage = () => {
    const { user } = useAuthUser()
    const today = new Date()

    // State for filters
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(today), 'yyyy-MM-dd'),
        end: format(endOfMonth(today), 'yyyy-MM-dd'),
    })
    const [searchQuery, setSearchQuery] = useState('')

    // Fetch Data
    const { data: apiResponse, isLoading, error } = useQuery({
        queryKey: ['production-yield-report', user?.kode_outlet, dateRange.start, dateRange.end],
        queryFn: () => {
            if (!user?.kode_outlet) throw new Error('No outlet assigned')
            return getProductionYieldReport(
                user.kode_outlet,
                dateRange.start,
                dateRange.end
            )
        },
        enabled: !!user?.kode_outlet,
    })

    // Filter and Compute Data
    const filteredData = useMemo(() => {
        if (!apiResponse?.data) return []

        let result = apiResponse.data

        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            result = result.filter(item =>
                item.finished_good_name.toLowerCase().includes(q) ||
                item.document_number.toLowerCase().includes(q)
            )
        }

        return result
    }, [apiResponse, searchQuery])

    const summary = useMemo(() => {
        return filteredData.reduce((acc, curr) => ({
            totalValue: acc.totalValue + (curr.total_production_cost || 0),
            totalYield: acc.totalYield + (curr.qty_produced || 0),
            count: acc.count + 1
        }), { totalValue: 0, totalYield: 0, count: 0 })
    }, [filteredData])

    const handleDateChange = (start: string, end: string) => {
        setDateRange({ start, end })
    }

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-[400px] items-center justify-center space-x-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-muted-foreground">Loading production usage data...</span>
                </div>
            </DashboardLayout>
        )
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="flex h-[400px] flex-col items-center justify-center space-y-4 text-destructive">
                    <AlertCircle className="h-10 w-10" />
                    <p className="font-medium">Failed to load report data</p>
                    <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Production Cost & Yield Report</h1>
                    <p className="text-muted-foreground">
                        Analyze production efficiency, output yield, and unit costs.
                    </p>
                </div>

                <ProductionReportFilters
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                    onDateChange={handleDateChange}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />

                <ProductionSummaryCards
                    totalValue={summary.totalValue}
                    totalYield={summary.totalYield}
                    runCount={summary.count}
                />

                <ProductionYieldTable
                    data={filteredData}
                />
            </div>
        </DashboardLayout>
    )
}
