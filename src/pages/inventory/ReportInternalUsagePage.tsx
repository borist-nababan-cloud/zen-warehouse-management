import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { useAuthUser } from '@/hooks/useAuth'
import { reportService } from '@/services/reportService'
import { internalUsageService } from '@/services/internalUsageService'
import { masterOutletService } from '@/services/masterOutletService'
import { ViewReportInternalUsage, MasterIssueCategory } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Filter, Store, Download, Search, AlertCircle, PackageOpen } from 'lucide-react'
import { toast } from 'sonner'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export default function ReportInternalUsagePage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<ViewReportInternalUsage[]>([])
    const [originalData, setOriginalData] = useState<ViewReportInternalUsage[]>([])
    const [loading, setLoading] = useState(true)

    // Filter States
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [categories, setCategories] = useState<MasterIssueCategory[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState('')

    // Initialize Default Dates
    useEffect(() => {
        const today = new Date()
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'))
        setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'))
        loadCategories()
    }, [])

    const loadCategories = async () => {
        const res = await internalUsageService.getCategories()
        if (res.data) setCategories(res.data)
    }

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

    // Data Fetching Trigger
    useEffect(() => {
        if (selectedOutlet && startDate && endDate) {
            fetchData()
        }
    }, [selectedOutlet, startDate, endDate])

    // Local Filtering
    useEffect(() => {
        let filtered = [...originalData]

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(item => item.category_name === selectedCategory)
        }

        if (searchTerm) {
            const lowerInfo = searchTerm.toLowerCase()
            filtered = filtered.filter(item =>
                item.document_number.toLowerCase().includes(lowerInfo) ||
                (item.item_name && item.item_name.toLowerCase().includes(lowerInfo)) ||
                (item.requested_by && item.requested_by.toLowerCase().includes(lowerInfo))
            )
        }

        setData(filtered)
    }, [searchTerm, selectedCategory, originalData])

    const fetchData = async () => {
        if (!selectedOutlet) return

        setLoading(true)
        try {
            const res = await reportService.getInternalUsageReport(selectedOutlet, startDate, endDate)

            if (res.isSuccess && res.data) {
                setOriginalData(res.data)
                setData(res.data) // Will trigger local filtering effect if dependencies change, but might need initial set
            } else {
                toast.error(res.error || 'Failed to load report')
            }
        } catch (error) {
            console.error('Error:', error)
            toast.error('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleExportCsv = () => {
        if (data.length === 0) {
            toast.error('No data to export')
            return
        }

        const headers = ['Date', 'Doc No', 'Category', 'Item Name', 'Requested By', 'Qty Used', 'Total Value', 'Notes']
        const csvRows = [headers.join(',')]

        data.forEach(row => {
            const values = [
                formatDate(row.transaction_date),
                `"${row.document_number}"`,
                `"${row.category_name}"`,
                `"${row.item_name || ''}"`,
                `"${row.requested_by || ''}"`,
                row.qty_used,
                row.total_expense_value,
                `"${row.item_notes || ''}"`
            ]
            csvRows.push(values.join(','))
        })

        const csvContent = csvRows.join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Usage_Report_${startDate}_${endDate}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }

    // Summary Calculations
    const totalItems = data.reduce((acc, curr) => acc + (curr.qty_used || 0), 0)
    const totalValue = data.reduce((acc, curr) => acc + (curr.total_expense_value || 0), 0)

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Internal Consumption Report</h1>
                    <p className="text-slate-500">
                        Track inventory expenses and internal usage across departments.
                    </p>
                </div>

                {/* Filters */}
                <Card className="bg-white shadow-sm border-slate-200">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                            <Filter className="h-4 w-4 text-orange-500" />
                            Filters & Search
                        </CardTitle>
                        <Button variant="outline" size="sm" className="ml-auto" onClick={handleExportCsv}>
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="focus:border-orange-500" />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="focus:border-orange-500" />
                            </div>

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
                                <Label>Category</Label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={c.category_name}>{c.category_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search Document, Item Name, or Requester..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 focus:border-orange-500"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-orange-50 border-orange-100 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                                    <PackageOpen className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-orange-600">Total Items Used</p>
                                    <h3 className="text-2xl font-bold text-orange-900">{totalItems}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-red-50 border-red-100 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-100 rounded-full text-red-600">
                                    <AlertCircle className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-red-600">Total Expense Value</p>
                                    <h3 className="text-2xl font-bold text-red-900">{formatCurrency(totalValue)}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Table */}
                <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/80">
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Doc No</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Requested By</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                                <TableHead>Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">Loading...</TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                                        No usage records found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row) => (
                                    <TableRow key={row.item_id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium text-slate-600">
                                            {formatDate(row.transaction_date)}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-slate-500">
                                            {row.document_number}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                {row.category_name}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-800">
                                            {row.item_name}
                                            <span className="block text-xs text-slate-400">{row.sku}</span>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600">
                                            {row.requested_by}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {row.qty_used} {row.uom}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-red-600">
                                            {formatCurrency(row.total_expense_value)}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                                            {row.item_notes || row.header_notes || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </DashboardLayout>
    )
}
