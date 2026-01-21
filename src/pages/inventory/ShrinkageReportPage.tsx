import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { useShrinkageReport } from '@/hooks/useInventory'
import { masterOutletService } from '@/services/masterOutletService'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Download, AlertOctagon, TrendingDown, Search, Store } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export default function ShrinkageReportPage() {
    const { user } = useAuthUser()

    // Filters State
    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })
    const [selectedCategory, setSelectedCategory] = useState('ALL')
    const [searchTerm, setSearchTerm] = useState('')

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
    const { data: reportData, isLoading } = useShrinkageReport(
        selectedOutlet || undefined,
        dateRange.startDate,
        dateRange.endDate
    )

    const fullData = reportData?.data || []

    // Client-side Filtering (Category & Search)
    const filteredData = fullData.filter(item => {
        const matchesCategory = selectedCategory === 'ALL' || item.category_name === selectedCategory
        const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesCategory && matchesSearch
    })

    // Summaries
    const totalLossValue = filteredData.reduce((sum, item) => sum + item.total_loss_value, 0)
    const totalItemsLost = filteredData.reduce((sum, item) => sum + item.qty_lost, 0)

    // Top Category Logic
    const categoryTotals = filteredData.reduce((acc, item) => {
        acc[item.category_name] = (acc[item.category_name] || 0) + item.total_loss_value
        return acc
    }, {} as Record<string, number>)

    const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
    const topCategoryName = topCategoryEntry ? topCategoryEntry[0] : '-'
    const topCategoryValue = topCategoryEntry ? topCategoryEntry[1] : 0


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

        const headers = ['Date', 'Category', 'SKU', 'Item Name', 'Qty Lost', 'Loss Value', 'Reported By', 'Notes']
        const rows = filteredData.map(item => [
            format(new Date(item.transaction_date), 'yyyy-MM-dd'),
            item.category_name,
            item.sku,
            item.item_name,
            item.qty_lost,
            item.total_loss_value,
            item.reported_by,
            item.notes
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        const timestamp = format(new Date(), 'yyyyMMdd_HHmm')
        link.setAttribute('href', url)
        link.setAttribute('download', `shrinkage_report_${user?.kode_outlet}_${timestamp}.csv`)
        link.style.visibility = 'hidden'

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Get Unique Categories for Filter
    const categories = Array.from(new Set(fullData.map(d => d.category_name)))

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-20 p-6">

                {/* Header & Main Filters */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Shrinkage & Loss Analysis</h1>
                            <p className="text-muted-foreground">Track and analyze stock losses from theft, spoilage, and damage.</p>
                        </div>
                        <Button
                            onClick={handleExport}
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>

                    {/* Filter Bar */}
                    <Card className="bg-slate-50 border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <label className="text-xs font-semibold text-slate-500">Start Date</label>
                                <Input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="bg-white"
                                />
                            </div>

                            {/* Outlet Filter for Role 5 & 8 */}
                            {canSelectOutlet && (
                                <div className="flex flex-col gap-2 w-full md:w-auto">
                                    <label className="text-xs font-semibold text-slate-500">Outlet</label>
                                    <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                        <SelectTrigger className="w-[200px] bg-white">
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
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <label className="text-xs font-semibold text-slate-500">End Date</label>
                                <Input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="bg-white"
                                />
                            </div>
                            <div className="flex flex-col gap-2 w-full md:w-1/4">
                                <label className="text-xs font-semibold text-slate-500">Category</label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                >
                                    <option value="ALL">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-white border-red-200 shadow-sm border-l-4 border-l-red-400">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-red-900">Total Loss Value</CardTitle>
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-700">{formatCurrency(totalLossValue)}</div>
                            <p className="text-xs text-red-600/80">Financial impact this period</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-orange-900">Total Items Lost</CardTitle>
                            <AlertOctagon className="h-4 w-4 text-orange-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-700">{totalItemsLost}</div>
                            <p className="text-xs text-orange-600/80">Units removed from stock</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-rose-50 to-pink-50 border-rose-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-rose-900">Top Loss Category</CardTitle>
                            <AlertOctagon className="h-4 w-4 text-rose-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold text-rose-700 truncate" title={topCategoryName}>{topCategoryName}</div>
                            <p className="text-xs text-rose-600/80">{formatCurrency(topCategoryValue)}</p>
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
                                    placeholder="Search Item Name or SKU..."
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
                                    <TableHead className="w-[120px] font-semibold text-slate-700">Date</TableHead>
                                    {canSelectOutlet && selectedOutlet === 'ALL' && (
                                        <TableHead className="font-semibold text-slate-700">Outlet</TableHead>
                                    )}
                                    <TableHead className="font-semibold text-slate-700">Category</TableHead>
                                    <TableHead className="font-semibold text-slate-700">SKU</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Item Name</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Qty Lost</TableHead>
                                    <TableHead className="text-right font-bold text-red-600 bg-red-50/30">Loss Value</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Reported By</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            Loading shrinkage data...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            No shrinkage records found for this period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((item, index) => (
                                        <TableRow key={index} className="hover:bg-slate-50">
                                            <TableCell className="text-xs text-muted-foreground">
                                                {format(new Date(item.transaction_date), 'dd/MM/yyyy')}
                                            </TableCell>
                                            {canSelectOutlet && selectedOutlet === 'ALL' && (
                                                <TableCell className="text-xs text-muted-foreground">{item.kode_outlet}</TableCell>
                                            )}
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                                    ${item.category_name.toLowerCase().includes('theft') ? 'bg-red-100 text-red-700' :
                                                        item.category_name.toLowerCase().includes('spoilage') ? 'bg-orange-100 text-orange-700' :
                                                            'bg-slate-100 text-slate-700'}
                                                `}>
                                                    {item.category_name}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                            <TableCell className="font-medium">{item.item_name}</TableCell>
                                            <TableCell className="text-right font-medium text-slate-700">{item.qty_lost}</TableCell>
                                            <TableCell className="text-right font-bold text-red-600 bg-red-50/10">
                                                {formatCurrency(item.total_loss_value)}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600">{item.reported_by}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]" title={item.notes}>
                                                {item.notes}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
