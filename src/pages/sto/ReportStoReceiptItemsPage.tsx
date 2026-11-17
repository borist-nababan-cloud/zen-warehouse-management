import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { getStoReceiptItemsReport } from '@/services/stoReportService'
import { masterOutletService } from '@/services/masterOutletService'
import { StoReceiptItem, MasterOutlet } from '@/types/database'
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
import { PackageCheck, Download, Loader2, Search, Printer } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'
import { printReportA4 } from '@/utils/reportPrintUtils'

export function ReportStoReceiptItemsPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<StoReceiptItem[]>([])
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

        const res = await getStoReceiptItemsReport(filters)
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

    const handleExport = () => {
        if (data.length === 0) return toast.error('No data to export')

        const csvContent = [
            ['Received Date', 'Receipt Doc', 'Order Doc', 'SKU', 'Item Name', 'Qty Received'],
            ...data.map(item => [
                format(new Date(item.received_at), 'yyyy-MM-dd'),
                item.document_number,
                item.order_number,
                item.sku,
                item.item_name.replace(/,/g, ' '),
                item.qty_received.toString()
            ])
        ]
            .map(e => e.join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `sto_receipt_items_report_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const handlePrintReport = async () => {
        if (data.length === 0) {
            toast.error('Tidak ada data untuk dicetak')
            return
        }

        const totalQty = data.reduce((sum, item) => sum + Number(item.qty_received || 0), 0)

        await printReportA4({
            title: 'Daftar Item Penerimaan STO',
            subtitle: 'Rincian kuantitas item barang yang diterima dari transaksi STO.',
            canSelectOutlet: canFilterOutlet,
            selectedOutlet,
            userOutletCode: user?.kode_outlet,
            availableOutlets: outletOptions,
            startDate,
            endDate,
            statusLabel: 'Semua Penerimaan',
            summaryItems: [
                { label: 'Total Baris Item', value: `${data.length} Item` },
                { label: 'Total Qty Diterima', value: totalQty.toLocaleString('id-ID') },
            ],
            columns: [
                { header: 'Tgl Terima', width: '80px' },
                { header: 'No. Penerimaan', width: '130px' },
                { header: 'No. Order STO', width: '130px' },
                { header: 'SKU', width: '85px' },
                { header: 'Nama Barang' },
                { header: 'Qty Diterima', align: 'right', width: '80px' },
            ],
            rows: data.map((item) => [
                format(new Date(item.received_at), 'dd/MM/yyyy'),
                item.document_number,
                item.order_number,
                item.sku || '-',
                item.item_name || '-',
                Number(item.qty_received || 0).toLocaleString('id-ID'),
            ]),
            totalRow: ['TOTAL', '', '', '', `${data.length} Item`, totalQty.toLocaleString('id-ID')],
        })
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">STO Receipt Items Report</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <PackageCheck className="h-4 w-4" />
                            Detailed list of items received.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handlePrintReport}
                            disabled={isLoading || data.length === 0}
                            variant="outline"
                            className="gap-2 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        >
                            <Printer className="h-4 w-4" />
                            Cetak
                        </Button>
                        <Button
                            onClick={handleExport}
                            disabled={isLoading || data.length === 0}
                            variant="outline"
                            className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                            <Download className="h-4 w-4" />
                            Ekspor CSV
                        </Button>
                    </div>
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
                                    <TableHead>Received Date</TableHead>
                                    <TableHead>Receipt Doc</TableHead>
                                    <TableHead>Order Doc</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead className="text-right">Qty Received</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Loading...</TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No records found.</TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/50 transition-colors">
                                            <TableCell>{format(new Date(item.received_at), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="font-medium text-blue-600">{item.document_number}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{item.order_number}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-mono">{item.sku}</TableCell>
                                            <TableCell>{item.item_name}</TableCell>
                                            <TableCell className="text-right">{item.qty_received}</TableCell>
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
