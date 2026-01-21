import { useState, useMemo, useEffect } from 'react'
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
    FileText,
    Store
} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { masterOutletService } from '@/services/masterOutletService'
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

    // Outlet Logic
    const [selectedOutlet, setSelectedOutlet] = useState<string>('')
    const [availableOutlets, setAvailableOutlets] = useState<{ kode_outlet: string, name_outlet: string }[]>([])
    const canSelectOutlet = user?.user_role === 5 || user?.user_role === 8

    useEffect(() => {
        if (!canSelectOutlet && user?.kode_outlet) {
            setSelectedOutlet(user.kode_outlet)
        } else if (canSelectOutlet) {
            setSelectedOutlet('ALL')
        }
    }, [user, canSelectOutlet])

    useEffect(() => {
        if (canSelectOutlet) {
            masterOutletService.getAllWhOutlet()
                .then(setAvailableOutlets)
                .catch(err => console.error(err))
        }
    }, [canSelectOutlet])

    // Fetch Data
    const { data: apiResponse, isLoading, error } = useQuery({
        queryKey: ['report-outstanding-po', selectedOutlet, dateRange.start, dateRange.end],
        queryFn: () => {
            return reportService.getOutstandingPoReport(
                selectedOutlet || user?.kode_outlet || '',
                dateRange.start,
                dateRange.end
            )
        },
        enabled: !!selectedOutlet,
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
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
