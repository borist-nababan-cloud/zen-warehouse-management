import React, { useState, useMemo } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { reportService } from '@/services/reportService'
import { OutstandingPoTable } from '@/features/reports/components/OutstandingPoTable'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import {
    Loader2,
    AlertCircle,
    PackageX,
    DollarSign,
    FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'

export const OutstandingPoReportPage = () => {
    const { user } = useAuthUser()
    const today = new Date()

    // State for filters
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(today), 'yyyy-MM-dd'),
        end: format(endOfMonth(today), 'yyyy-MM-dd'),
    })

    // Fetch Data
    const { data: apiResponse, isLoading, error } = useQuery({
        queryKey: ['report-outstanding-po', user?.kode_outlet, dateRange.start, dateRange.end],
        queryFn: () => {
            if (!user?.kode_outlet) throw new Error('No outlet assigned')
            return reportService.getOutstandingPoReport(
                user.kode_outlet,
                dateRange.start,
                dateRange.end
            )
        },
        enabled: !!user?.kode_outlet,
    })

    const data = apiResponse?.data || []

    // Compute Summary
    const summary = useMemo(() => {
        return data.reduce((acc, curr) => ({
            totalItemsPending: acc.totalItemsPending + (curr.qty_remaining || 0),
            pendingValue: acc.pendingValue + (curr.estimated_pending_value || 0),
            uniquePos: new Set([...acc.uniquePos, curr.document_number])
        }), { totalItemsPending: 0, pendingValue: 0, uniquePos: new Set<string>() })
    }, [data])

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-[400px] items-center justify-center space-x-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-muted-foreground">Loading outstanding items...</span>
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
                    <h1 className="text-2xl font-bold tracking-tight">Outstanding PO Report</h1>
                    <p className="text-muted-foreground">
                        Monitor items ordered but not yet received (Backorders).
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 md:flex-row md:items-end p-4 bg-white rounded-lg border shadow-sm">
                    <div className="grid grid-cols-2 gap-4 flex-1">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-white border-l-4 border-l-orange-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Items Pending
                            </CardTitle>
                            <PackageX className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-700">
                                {summary.totalItemsPending}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-l-4 border-l-red-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Pending Value
                            </CardTitle>
                            <DollarSign className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-700">
                                {formatCurrency(summary.pendingValue)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total POs Affected
                            </CardTitle>
                            <FileText className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-700">
                                {summary.uniquePos.size}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Data Table */}
                <OutstandingPoTable data={data} />
            </div>
        </DashboardLayout>
    )
}
