import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { getStoOrdersReport } from '@/services/stoReportService'
import { masterOutletService } from '@/services/masterOutletService'
import { StoOrderList, MasterOutlet } from '@/types/database'
import { DashboardLayout } from '@/components/layout/Sidebar'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
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
} from '@/components/ui/select'
import { FileText, Download, Loader2, Search } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'

export function ReportStoOrderPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<StoOrderList[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Filters
    const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    const [selectedOutlet, setSelectedOutlet] = useState<string>('ALL')

    // Admin Options
    const [outletOptions, setOutletOptions] = useState<MasterOutlet[]>([])
    const canFilterOutlet = user?.user_role === 5 || user?.user_role === 8

    useEffect(() => {
        if (canFilterOutlet) {
            masterOutletService.getAllWhOutlet()
                .then(setOutletOptions)
                .catch(err => console.error('Failed to load outlets', err))
        }
    }, [canFilterOutlet])

    const fetchReport = async () => {
        if (!user?.kode_outlet) return

        setIsLoading(true)
        const filters = {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            outlet: canFilterOutlet ? selectedOutlet : undefined,
            userOutlet: user.kode_outlet
        }

        const res = await getStoOrdersReport(filters)
        if (res.isSuccess && res.data) {
            setData(res.data)
        } else {
            toast.error(res.error || 'Failed to load report')
        }
        setIsLoading(false)
    }

    // Initial load
    useEffect(() => {
        fetchReport()
    }, [user?.kode_outlet]) // eslint-disable-line react-hooks/exhaustive-deps

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)

    const handleExport = () => {
        if (data.length === 0) return toast.error('No data to export')

        const csvContent = [
            ['Order Date', 'Document No', 'From Outlet', 'To Outlet', 'Sender Status', 'Recipient Status', 'Grand Total'],
            ...data.map(item => [
                format(new Date(item.order_date), 'yyyy-MM-dd'),
                item.document_number,
                item.from_outlet,
                item.to_outlet,
                item.sender_status,
                item.recipient_status,
                item.grand_total.toString()
            ])
        ]
            .map(e => e.join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `sto_orders_report_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">STO Orders Report</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        List of Stock Transfer Orders
                    </p>
                </div>

                <Card className="border-pastel-blue/20 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>

                            {canFilterOutlet && (
                                <div className="space-y-2">
                                    <Label>Outlet Filter</Label>
                                    <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Outlets" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Outlets</SelectItem>
                                            {outletOptions.map(opt => (
                                                <SelectItem key={opt.kode_outlet} value={opt.kode_outlet}>
                                                    {opt.name_outlet}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button onClick={fetchReport} disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                                    Filter
                                </Button>
                                <Button variant="outline" onClick={handleExport} disabled={data.length === 0}>
                                    <Download className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-pastel-blue/20 shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead>Order Date</TableHead>
                                    <TableHead>Document No</TableHead>
                                    <TableHead>From Outlet</TableHead>
                                    <TableHead>To Outlet</TableHead>
                                    <TableHead>Sender Status</TableHead>
                                    <TableHead>Recipient Status</TableHead>
                                    <TableHead className="text-right">Grand Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Loading...</TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No records found.</TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/50 transition-colors">
                                            <TableCell>{format(new Date(item.order_date), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="font-medium">{item.document_number}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{item.from_outlet}</span>
                                                    <span className="text-xs text-muted-foreground">{item.from_outlet_name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{item.to_outlet}</span>
                                                    <span className="text-xs text-muted-foreground">{item.to_outlet_name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {item.sender_status}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    {item.recipient_status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
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
