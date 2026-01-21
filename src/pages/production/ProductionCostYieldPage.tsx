import React, { useState, useMemo } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { getProductionYieldReport } from '@/services/productionService'
import { ProductionReportFilters } from '@/features/production/components/ProductionReportFilters'
import { ProductionSummaryCards } from '@/features/production/components/ProductionSummaryCards'
import { ProductionYieldTable } from '@/features/production/components/ProductionYieldTable'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Loader2, AlertCircle, Store, Download } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { masterOutletService } from '@/services/masterOutletService'
import { toast } from 'sonner'

export const ProductionCostYieldPage = () => {
    const { user } = useAuthUser()
    const today = new Date()

    // State for filters
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(today), 'yyyy-MM-dd'),
        end: format(endOfMonth(today), 'yyyy-MM-dd'),
    })
    const [searchQuery, setSearchQuery] = useState('')

    // Outlet Logic
    const [selectedOutlet, setSelectedOutlet] = useState<string>('')
    const [availableOutlets, setAvailableOutlets] = useState<{ kode_outlet: string, name_outlet: string }[]>([])
    const canSelectOutlet = user?.user_role === 5 || user?.user_role === 8

    React.useEffect(() => {
        if (!canSelectOutlet && user?.kode_outlet) {
            setSelectedOutlet(user.kode_outlet)
        } else if (canSelectOutlet) {
            setSelectedOutlet('ALL')
        }
    }, [user, canSelectOutlet])

    React.useEffect(() => {
        if (canSelectOutlet) {
            masterOutletService.getAllWhOutlet()
                .then(setAvailableOutlets)
                .catch(err => console.error(err))
        }
    }, [canSelectOutlet])

    // Fetch Data
    const { data: apiResponse, isLoading, error } = useQuery({
        queryKey: ['production-yield-report', selectedOutlet, dateRange.start, dateRange.end],
        queryFn: () => {
            return getProductionYieldReport(
                selectedOutlet || user?.kode_outlet || '',
                dateRange.start,
                dateRange.end
            )
        },
        enabled: !!selectedOutlet,
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

    const handleExportCsv = () => {
        if (filteredData.length === 0) {
            toast.error('No data to export')
            return
        }

        const headers = ['Date', 'Outlet', 'Doc Number', 'Product Name', 'Yield (Qty)', 'Unit Cost', 'Total Cost', 'Ingredients Count', 'Creator']
        const csvRows = [headers.join(',')]

        filteredData.forEach(row => {
            const outletName = availableOutlets.find(o => o.kode_outlet === row.kode_outlet)?.name_outlet || row.kode_outlet || '-'

            const values = [
                format(new Date(row.transaction_date), 'yyyy-MM-dd'),
                `"${outletName}"`,
                `"${row.document_number}"`,
                `"${row.finished_good_name}"`,
                row.qty_produced,
                row.unit_cost_result,
                row.total_production_cost,
                row.ingredient_count,
                `"${row.created_by_name}"`
            ]
            csvRows.push(values.join(','))
        })

        const csvContent = csvRows.join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Production_Cost_Yield_${dateRange.start}_${dateRange.end}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
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

                {/* Outlet Selector & Controls */}
                <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex-1 w-full md:max-w-xs">
                        {canSelectOutlet && (
                            <div className="space-y-2">
                                <Label>Outlet</Label>
                                <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                    <SelectTrigger className="w-full bg-white">
                                        <div className="flex items-center gap-2">
                                            <Store className="h-4 w-4 text-muted-foreground" />
                                            <SelectValue placeholder="Select Outlet" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">ALL OUTLETS</SelectItem>
                                        {availableOutlets.map((outlet) => (
                                            <SelectItem key={outlet.kode_outlet} value={outlet.kode_outlet}>
                                                {outlet.name_outlet}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <Button variant="outline" onClick={handleExportCsv} className="gap-2">
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
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
                    showOutlet={canSelectOutlet && selectedOutlet === 'ALL'}
                    outlets={availableOutlets}
                />
            </div>
        </DashboardLayout >
    )
}
