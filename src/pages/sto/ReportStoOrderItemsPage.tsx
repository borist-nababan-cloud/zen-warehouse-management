import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { getStoOrderItemsReport } from '@/services/stoReportService'
import { masterOutletService } from '@/services/masterOutletService'
import { StoOrderItem, MasterOutlet } from '@/types/database'
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
import { List, Download, Loader2, Search } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'

export function ReportStoOrderItemsPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<StoOrderItem[]>([])
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

        const res = await getStoOrderItemsReport(filters)
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
            ['Order Date', 'Order Doc', 'SKU', 'Item Name', 'Qty Requested', 'Unit Price', 'Subtotal'],
            ...data.map(item => [
                format(new Date(item.order_date), 'yyyy-MM-dd'),
                item.document_number,
                item.sku,
                item.item_name.replace(/,/g, ' '), // Escape commas
                item.qty_requested.toString(),
                item.price_unit.toString(),
                item.subtotal.toString()
            ])
        ]
            .map(e => e.join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `sto_order_items_report_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">STO Order Items Report</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <List className="h-4 w-4" />
                        Detailed list of items requested in STOs.
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
                                    <TableHead>Order Doc</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead className="text-right">Qty Req</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
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
                                            <TableCell className="text-xs text-muted-foreground font-mono">{item.sku}</TableCell>
                                            <TableCell>{item.item_name}</TableCell>
                                            <TableCell className="text-right">{item.qty_requested}</TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground text-xs">
                                                {formatCurrency(item.price_unit)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {formatCurrency(item.subtotal)}
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
