import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { stoArService, StoArReportItem } from '@/services/stoArService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Loader2, Download, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/layout/Sidebar'

// Helper to format date
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

export default function StoArReportPage() {
    const { user } = useAuthUser()

    const [items, setItems] = useState<StoArReportItem[]>([])
    const [loading, setLoading] = useState(true)

    // Filters - Default to Start of Previous Month to catch recent history
    const [startDate, setStartDate] = useState<string>(() => {
        const date = new Date()
        date.setMonth(date.getMonth() - 1) // Go back 1 month
        date.setDate(1) // Set to 1st
        return date.toISOString().split('T')[0]
    })

    const [endDate, setEndDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    )
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'WAITING' | 'COMPLETED'>('ALL')

    const fetchData = async () => {
        if (!user?.kode_outlet) {
            return
        }

        setLoading(true)
        try {
            const data = await stoArService.getArReport({
                outlet_code: user.kode_outlet,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                status: statusFilter
            })
            setItems(data || [])
        } catch (err: any) {
            toast.error(err.message || 'Error loading report')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user) {
            fetchData()
        }
    }, [user?.kode_outlet]) // Only re-fetch on mount/user change. Manual filter apply.

    // Calculate Metrics
    const totalReceivables = items
        .filter(i => i.settlement_status === 'UNCLAIMED') // Both Unpaid and Paid-but-Unclaimed
        .reduce((sum, item) => sum + item.total_amount, 0)

    const actionableCash = items
        .filter(i => i.payment_status === 'PAID' && i.settlement_status === 'UNCLAIMED')
        .reduce((sum, item) => sum + item.total_amount, 0)

    // Export to CSV
    const handleExport = () => {
        const headers = ['Date', 'Invoice Doc', 'STO Doc', 'Debtor Outlet', 'Debtor Name', 'Amount', 'Payment Status', 'Settlement Status']
        const csvContent = [
            headers.join(','),
            ...items.map(item => [
                item.invoice_date.split('T')[0],
                item.document_number,
                item.sto_doc_number,
                item.debtor_outlet_code,
                `"${item.debtor_outlet_name}"`, // Quote name just in case
                item.total_amount,
                item.payment_status,
                item.settlement_status
            ].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `STO_AR_Report_${startDate}_${endDate}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const getStatusBadge = (item: StoArReportItem) => {
        if (item.settlement_status === 'RECEIVED') {
            return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">COMPLETED</Badge>
        }
        if (item.payment_status === 'PAID' && item.settlement_status === 'UNCLAIMED') {
            return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">WAITING CLAIM</Badge>
        }
        return <Badge variant="outline" className="text-gray-500">UNPAID</Badge>
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">STO Accounts Receivable</h2>
                        <p className="text-muted-foreground">Monitor incoming payments from stock transfers.</p>
                    </div>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>

                {/* SUMMARY CARDS */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-indigo-50 border-indigo-100">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-indigo-900">Total Receivables</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-indigo-700">{formatCurrency(totalReceivables)}</div>
                            <p className="text-xs text-indigo-600">Pending & Unclaimed</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-orange-50 border-orange-100">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-orange-900">Actionable Cash</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-700">{formatCurrency(actionableCash)}</div>
                            <p className="text-xs text-orange-600">Paid by Outlet, Waiting Verification</p>
                        </CardContent>
                    </Card>
                </div>

                {/* FILTERS */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid gap-4 md:grid-cols-4 items-end">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Start Date</label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">End Date</label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Status</SelectItem>
                                        <SelectItem value="UNPAID">Unpaid</SelectItem>
                                        <SelectItem value="WAITING">Waiting Claim</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={fetchData} disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
                                Apply Filter
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* DATA TABLE */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Invoice Doc</TableHead>
                                    <TableHead>STO Doc</TableHead>
                                    <TableHead>Debtor Outlet</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                            No records found for the selected period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((item) => (
                                        <TableRow key={item.invoice_id}>
                                            <TableCell>{formatDate(item.invoice_date)}</TableCell>
                                            <TableCell className="font-medium">{item.document_number}</TableCell>
                                            <TableCell>{item.sto_doc_number}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{item.debtor_outlet_name}</span>
                                                    <span className="text-xs text-muted-foreground">{item.debtor_outlet_code}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.total_amount)}</TableCell>
                                            <TableCell className="text-center">
                                                {getStatusBadge(item)}
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
