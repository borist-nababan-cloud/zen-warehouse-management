import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { getStoReceiptsReport } from '@/services/stoReportService'
import { masterOutletService } from '@/services/masterOutletService'
import { StoReceiptList, MasterOutlet } from '@/types/database'
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Wallet, Download, Loader2, Search, Printer, Image as ImageIcon, ExternalLink } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'

export function ReportStoReceiptPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<StoReceiptList[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [previewItem, setPreviewItem] = useState<StoReceiptList | null>(null)

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

        const res = await getStoReceiptsReport(filters)
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
            ['Received Date', 'Receipt Doc', 'Order Doc', 'From Outlet', 'To Outlet', 'Grand Total'],
            ...data.map(item => [
                format(new Date(item.received_at), 'yyyy-MM-dd'),
                item.document_number,
                item.order_number,
                item.from_outlet,
                item.to_outlet,
                item.grand_total.toString()
            ])
        ]
            .map(e => e.join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `sto_receipts_report_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">STO Receipts Report</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        List of completed STO receipts.
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
                                    <TableHead>Received Date</TableHead>
                                    <TableHead>Receipt Doc</TableHead>
                                    <TableHead>Order Doc</TableHead>
                                    <TableHead>From Outlet</TableHead>
                                    <TableHead>To Outlet</TableHead>
                                    <TableHead className="text-right">Order Value</TableHead>
                                    <TableHead className="text-center w-[120px]">Actions</TableHead>
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
                                    data.map((item, idx) => {
                                        const hasAnyPhoto = Boolean(item.shipment_image_url || item.receipt_image_url)
                                        return (
                                            <TableRow key={item.id || idx} className="hover:bg-muted/50 transition-colors">
                                                <TableCell>{format(new Date(item.received_at), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="font-medium text-blue-600">{item.document_number}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{item.order_number}</TableCell>
                                                <TableCell>{item.from_outlet}</TableCell>
                                                <TableCell>{item.to_outlet}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {formatCurrency(item.grand_total)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {/* Print STO */}
                                                        {item.sto_id ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Print STO"
                                                                className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                                                onClick={() => {
                                                                    window.open(`/sto/${item.sto_id}/print`, '_blank')
                                                                }}
                                                            >
                                                                <Printer className="h-4 w-4" />
                                                            </Button>
                                                        ) : (
                                                            <div className="h-8 w-8 flex items-center justify-center text-slate-300 select-none">-</div>
                                                        )}

                                                        {/* View Uploaded STO Photos (Sender & Receiver) beside Print icon */}
                                                        {hasAnyPhoto ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Lihat Foto Bukti STO (Pengirim & Penerima)"
                                                                className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                                onClick={() => setPreviewItem(item)}
                                                            >
                                                                <ImageIcon className="h-4 w-4" />
                                                            </Button>
                                                        ) : (
                                                            <div
                                                                className="h-8 w-8 flex items-center justify-center text-slate-300 select-none"
                                                                title="Tidak ada foto bukti STO"
                                                            >
                                                                -
                                                            </div>
                                                        )}
                                                    </div>
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

            {/* Dual STO Photo Preview Dialog (Sender vs Receiver) */}
            <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>
                            Bukti Foto STO: {previewItem?.order_number} (Receipt: {previewItem?.document_number})
                        </DialogTitle>
                    </DialogHeader>
                    {previewItem && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                            {/* 1. Sender Photo */}
                            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 flex flex-col justify-between space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            1. Foto Pengiriman (Sender)
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Outlet Pengirim: {previewItem.from_outlet_name || previewItem.from_outlet}
                                        </p>
                                    </div>
                                    {previewItem.shipment_image_url && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(previewItem.shipment_image_url!, '_blank')}
                                        >
                                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                            Tab Baru
                                        </Button>
                                    )}
                                </div>
                                {previewItem.shipment_image_url ? (
                                    <div className="flex items-center justify-center bg-white rounded border border-slate-200 p-2 h-64 overflow-hidden">
                                        <img
                                            src={previewItem.shipment_image_url}
                                            alt="Foto Pengiriman STO"
                                            className="max-h-full max-w-full object-contain rounded"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center bg-slate-100/70 rounded border border-dashed border-slate-300 h-64 text-slate-400 text-xs">
                                        <ImageIcon className="h-8 w-8 mb-1 opacity-40" />
                                        <span>Tidak ada foto dari pengirim</span>
                                    </div>
                                )}
                            </div>

                            {/* 2. Receiver Photo */}
                            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 flex flex-col justify-between space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            2. Foto Penerimaan (Receiver)
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Outlet Penerima: {previewItem.to_outlet_name || previewItem.to_outlet}
                                        </p>
                                    </div>
                                    {previewItem.receipt_image_url && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(previewItem.receipt_image_url!, '_blank')}
                                        >
                                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                            Tab Baru
                                        </Button>
                                    )}
                                </div>
                                {previewItem.receipt_image_url ? (
                                    <div className="flex items-center justify-center bg-white rounded border border-slate-200 p-2 h-64 overflow-hidden">
                                        <img
                                            src={previewItem.receipt_image_url}
                                            alt="Foto Penerimaan STO"
                                            className="max-h-full max-w-full object-contain rounded"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center bg-slate-100/70 rounded border border-dashed border-slate-300 h-64 text-slate-400 text-xs">
                                        <ImageIcon className="h-8 w-8 mb-1 opacity-40" />
                                        <span>Tidak ada foto dari penerima</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="secondary" size="sm" onClick={() => setPreviewItem(null)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    )
}
