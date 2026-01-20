
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { useAuthUser } from '@/hooks/useAuth'
import { reportService } from '@/services/reportService'
import { ViewReportPurchaseOrders } from '@/types/database'
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
import { Printer, FileText, Search, TrendingUp, Filter, Wallet } from 'lucide-react'
import { toast } from 'sonner'

export default function PoReportPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<ViewReportPurchaseOrders[]>([])
    const [originalData, setOriginalData] = useState<ViewReportPurchaseOrders[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    useEffect(() => {
        if (user?.kode_outlet) {
            fetchData()
        }
    }, [user?.kode_outlet, startDate, endDate])

    useEffect(() => {
        let filtered = [...originalData]

        if (statusFilter !== 'all') {
            filtered = filtered.filter(item => item.status === statusFilter)
        }

        if (searchTerm) {
            const lowerInfo = searchTerm.toLowerCase()
            filtered = filtered.filter(item =>
                item.po_doc_number.toLowerCase().includes(lowerInfo) ||
                item.supplier_name.toLowerCase().includes(lowerInfo)
            )
        }

        setData(filtered)
    }, [searchTerm, statusFilter, originalData])

    const fetchData = async () => {
        if (!user?.kode_outlet) return

        setLoading(true)
        try {
            const res = await reportService.getPoReport(user.kode_outlet, startDate || undefined, endDate || undefined)

            if (res.isSuccess && res.data) {
                setOriginalData(res.data)
                setData(res.data)
            } else {
                toast.error(res.error || 'Failed to load PO report')
            }
        } catch (error) {
            console.error('Error:', error)
            toast.error('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
            case 'PAID': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
            case 'ISSUED': return 'bg-amber-100 text-amber-800 border-amber-200'
            case 'PARTIAL': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'CANCELLED': return 'bg-slate-100 text-slate-600 border-slate-200'
            case 'DRAFT': return 'bg-gray-100 text-gray-600 border-gray-200'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const totalValue = data.reduce((acc, curr) => acc + (curr.grand_total || 0), 0)

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Purchase Orders Report</h1>
                    <p className="text-slate-500">
                        Historical record of all Purchase Orders and their status.
                    </p>
                </div>

                {/* Filters */}
                <Card className="bg-white shadow-sm border-slate-200">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                            <Filter className="h-4 w-4 text-emerald-500" />
                            Filters & Search
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start-date">Start Date</Label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="border-slate-300 focus:border-emerald-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-date">End Date</Label>
                                <Input
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="border-slate-300 focus:border-emerald-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="search">Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="search"
                                        placeholder="Search PO # or Supplier..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 border-slate-300 focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status-filter">Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger id="status-filter" className="border-slate-300">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="ISSUED">Issued</SelectItem>
                                        <SelectItem value="PARTIAL">Partial</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                        <SelectItem value="PAID">Paid</SelectItem>
                                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                                    <TrendingUp className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-emerald-600">Total Orders</p>
                                    <h3 className="text-2xl font-bold text-emerald-900">{data.length}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-blue-100 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                                    <Wallet className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-blue-600">Total Value</p>
                                    <h3 className="text-2xl font-bold text-blue-900">{formatCurrency(totalValue)}</h3>
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
                                <TableHead>PO Doc</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Expected Date</TableHead>
                                <TableHead className="text-right">Grand Total</TableHead>
                                <TableHead className="text-center w-[150px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                        No purchase orders found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row) => (
                                    <TableRow key={row.po_id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium text-slate-600">
                                            {formatDate(row.po_date)}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-slate-500">
                                            {row.po_doc_number}
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-700">
                                            {row.supplier_name}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(row.status)}`}>
                                                {row.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-sm">
                                            {formatDate(row.expected_delivery_date)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-slate-700">
                                            {formatCurrency(row.grand_total)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {/* Print PO */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Print PO"
                                                    className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                                    onClick={() => {
                                                        const url = `/procurement/purchase-orders/${row.po_id}/print`
                                                        window.open(url, '_blank')
                                                    }}
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>

                                                {/* Print Invoice (if linked) */}
                                                {row.linked_invoice_id ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="View Linked Invoice"
                                                        className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                                                        onClick={() => {
                                                            const url = `/finance/invoices/print/${row.linked_invoice_id}`
                                                            window.open(url, '_blank')
                                                        }}
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <div className="h-8 w-8 flex items-center justify-center text-slate-300 select-none">-</div>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="text-center text-xs text-slate-400 mt-4">
                    Showing {data.length} records
                </div>
            </div>
        </DashboardLayout>
    )
}
