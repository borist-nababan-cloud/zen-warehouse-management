import { useState, useEffect, useMemo } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { getStoSummaryReport } from '@/services/stoReportService'
import { StoSummaryReportItem } from '@/types/database'
import { DashboardLayout } from '@/components/layout/Sidebar'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { Loader2, Filter, ArrowRight, ArrowUpRight, ArrowDownLeft, Truck } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export function ReportStoSummaryPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<StoSummaryReportItem[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Filters
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    const [direction, setDirection] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL')

    const fetchReport = async () => {
        if (!user?.kode_outlet) return

        setIsLoading(true)
        const res = await getStoSummaryReport({
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            direction,
            userOutlet: user.kode_outlet
        })

        if (res.isSuccess && res.data) {
            setData(res.data)
        } else {
            toast.error(res.error || "Failed to load report")
        }
        setIsLoading(false)
    }

    // Load on mount/filter change
    useEffect(() => {
        if (user?.kode_outlet) {
            fetchReport()
        }
    }, [user?.kode_outlet]) // Only on mount, user triggers search manually usually? Or we can auto-search

    // Calculate Summaries
    const summaries = useMemo(() => {
        if (!user?.kode_outlet) return { incoming: 0, outgoing: 0, shipping: 0 }

        let incoming = 0
        let outgoing = 0
        let shipping = 0

        data.forEach(item => {
            shipping += (item.shipping_cost || 0)

            if (item.to_outlet === user.kode_outlet) {
                incoming += (item.grand_total || 0)
            }
            if (item.from_outlet === user.kode_outlet) {
                outgoing += (item.grand_total || 0)
            }
        })

        return { incoming, outgoing, shipping }
    }, [data, user?.kode_outlet])

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">STO Summary Report</h1>
                    <p className="text-muted-foreground">Overview of incoming and outgoing stock transfers.</p>
                </div>

                {/* Filters */}
                <Card className="bg-indigo-50/30 border-indigo-100">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Filter className="h-4 w-4" /> Filter Options
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Direction</Label>
                                <Select value={direction} onValueChange={(v: any) => setDirection(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Direction" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Directions</SelectItem>
                                        <SelectItem value="INCOMING">Incoming (To Me)</SelectItem>
                                        <SelectItem value="OUTGOING">Outgoing (From Me)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={fetchReport} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Apply Filter
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-l-4 border-l-blue-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outgoing</CardTitle>
                            <ArrowUpRight className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(summaries.outgoing)}</div>
                            <p className="text-xs text-muted-foreground">Sales/Transfers out</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Incoming</CardTitle>
                            <ArrowDownLeft className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(summaries.incoming)}</div>
                            <p className="text-xs text-muted-foreground">Stock replenishment</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-500 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Shipping Cost</CardTitle>
                            <Truck className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(summaries.shipping)}</div>
                            <p className="text-xs text-muted-foreground">Logistics expenses</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Data Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead>Date</TableHead>
                                    <TableHead>Doc No</TableHead>
                                    <TableHead className="text-center">Route</TableHead>
                                    <TableHead>Sender Status</TableHead>
                                    <TableHead>Recipient Status</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead className="text-right">Total Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No data found.</TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item, idx) => (
                                        <TableRow key={`${item.id}-${idx}`}>
                                            <TableCell className="whitespace-nowrap">{format(new Date(item.order_date), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="font-medium">{item.document_number}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-2 text-sm">
                                                    <span className={item.from_outlet === user?.kode_outlet ? "font-bold text-blue-600" : "text-muted-foreground"}>
                                                        {item.from_outlet}
                                                    </span>
                                                    <ArrowRight className="h-4 w-4 text-gray-400" />
                                                    <span className={item.to_outlet === user?.kode_outlet ? "font-bold text-green-600" : "text-muted-foreground"}>
                                                        {item.to_outlet}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {item.sender_status}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {item.recipient_status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={item.items_summary}>
                                                {item.items_summary}
                                            </TableCell>
                                            <TableCell className="text-right font-bold font-mono">
                                                {formatCurrency(item.grand_total)}
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
