import { useState } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { useOpnameVarianceReport } from '@/hooks/useInventory'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, AlertTriangle, TrendingUp, TrendingDown, Scale, Search } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { OpnameVarianceItem } from '@/types/database'

export default function StockOpnameVariancePage() {
    const { user } = useAuthUser()

    // Filters State
    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })
    const [showOnlyDiscrepancies, setShowOnlyDiscrepancies] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Fetch Data
    const { data: reportData, isLoading } = useOpnameVarianceReport(
        user?.kode_outlet || undefined,
        dateRange.startDate,
        dateRange.endDate
    )

    const fullData = reportData?.data || []

    // Client-side Filtering
    const filteredData = fullData.filter((item: OpnameVarianceItem) => {
        const matchesDiscrepancy = !showOnlyDiscrepancies || item.difference !== 0
        const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.document_number.toLowerCase().includes(searchTerm.toLowerCase())

        return matchesDiscrepancy && matchesSearch
    })

    // Summaries
    const totalVarianceValueAbs = filteredData.reduce((sum: number, item: OpnameVarianceItem) => sum + Math.abs(item.variance_value), 0)
    const totalNetValue = filteredData.reduce((sum: number, item: OpnameVarianceItem) => sum + item.variance_value, 0)
    const itemsWithVariance = filteredData.filter((item: OpnameVarianceItem) => item.difference !== 0).length

    // Helper: Format Currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    // Export CSV
    const handleExport = () => {
        if (!filteredData.length) return

        const headers = ['Date', 'Doc No', 'SKU', 'Item Name', 'System Qty', 'Actual Qty', 'Difference', 'Unit Cost', 'Variance Value']
        const rows = filteredData.map((item: OpnameVarianceItem) => [
            format(new Date(item.opname_date), 'yyyy-MM-dd'),
            item.document_number,
            item.sku,
            item.item_name,
            item.system_qty,
            item.actual_qty,
            item.difference,
            item.unit_cost,
            item.variance_value
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map((row: (string | number)[]) => row.join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        const timestamp = format(new Date(), 'yyyyMMdd_HHmm')
        link.setAttribute('href', url)
        link.setAttribute('download', `opname_variance_${user?.kode_outlet}_${timestamp}.csv`)
        link.style.visibility = 'hidden'

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-20 p-6">

                {/* Header & Main Filters */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Stock Opname Variance</h1>
                            <p className="text-muted-foreground">Audit inventory accuracy and financial impact of discrepancies.</p>
                        </div>
                        <Button
                            onClick={handleExport}
                            variant="outline"
                            className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>

                    {/* Filter Bar */}
                    <Card className="bg-slate-50 border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex flex-col md:flex-row gap-6 items-end">
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <label className="text-xs font-semibold text-slate-500">Start Date</label>
                                <Input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="bg-white"
                                    aria-label="Start Date"
                                />
                            </div>
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <label className="text-xs font-semibold text-slate-500">End Date</label>
                                <Input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="bg-white"
                                    aria-label="End Date"
                                />
                            </div>

                            <div className="flex items-center space-x-2 pb-2">
                                <Checkbox
                                    id="showDiscrepancies"
                                    checked={showOnlyDiscrepancies}
                                    onChange={(e) => setShowOnlyDiscrepancies(e.target.checked)}
                                />
                                <label
                                    htmlFor="showDiscrepancies"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700"
                                >
                                    Show Discrepancies Only
                                </label>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-slate-400">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-900">Total Variance (Abs)</CardTitle>
                            <Scale className="h-4 w-4 text-slate-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-700">{formatCurrency(totalVarianceValueAbs)}</div>
                            <p className="text-xs text-slate-600/80">Absolute value of all differences</p>
                        </CardContent>
                    </Card>

                    <Card className={`bg-white border-l-4 shadow-sm ${totalNetValue < 0 ? 'border-l-red-400 border-red-100' : 'border-l-green-400 border-green-100'}`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className={`text-sm font-medium ${totalNetValue < 0 ? 'text-red-900' : 'text-green-900'}`}>Net Loss / Gain</CardTitle>
                            {totalNetValue < 0 ? <TrendingDown className="h-4 w-4 text-red-500" /> : <TrendingUp className="h-4 w-4 text-green-500" />}
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${totalNetValue < 0 ? 'text-red-700' : 'text-green-700'}`}>
                                {formatCurrency(totalNetValue)}
                            </div>
                            <p className={`text-xs ${totalNetValue < 0 ? 'text-red-600/80' : 'text-green-600/80'}`}>
                                {totalNetValue < 0 ? 'Net financial loss' : 'Net financial surplus'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-slate-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-900">Items with Variance</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-700">{itemsWithVariance}</div>
                            <p className="text-xs text-slate-600/80">SKUs with count mismatch</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Table */}
                <Card className="shadow-md border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search Doc No, Item Name or SKU..."
                                    className="pl-8 bg-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                    <TableHead className="w-[100px] font-semibold text-slate-700">Date</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Doc No</TableHead>
                                    <TableHead className="font-semibold text-slate-700">SKU</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Item Name</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">System</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Actual</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Diff</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700 bg-slate-100/50">Variance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            Loading opname variance data...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            No records found matching current filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((item: OpnameVarianceItem, index: number) => {
                                        const isLoss = item.difference < 0
                                        const isGain = item.difference > 0
                                        const colorClass = isLoss ? 'text-red-600 font-bold' : isGain ? 'text-green-600 font-bold' : 'text-slate-500'

                                        return (
                                            <TableRow key={`${item.document_number}-${item.sku}-${index}`} className="hover:bg-slate-50">
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(item.opname_date), 'dd/MM/yyyy')}
                                                </TableCell>
                                                <TableCell className="text-xs font-mono">{item.document_number}</TableCell>
                                                <TableCell className="font-mono text-xs text-slate-500">{item.sku}</TableCell>
                                                <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">{item.system_qty}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">{item.actual_qty}</TableCell>
                                                <TableCell className={`text-right font-mono text-sm ${colorClass}`}>
                                                    {item.difference > 0 ? `+${item.difference}` : item.difference}
                                                </TableCell>
                                                <TableCell className={`text-right font-mono text-sm bg-slate-50/50 ${colorClass}`}>
                                                    {formatCurrency(item.variance_value)}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
