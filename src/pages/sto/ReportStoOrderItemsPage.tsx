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
import { List, Download, Loader2, Search, Printer } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'
import { printReportA4 } from '@/utils/reportPrintUtils'

interface ReportStoOrderItemsPageProps {
    direction?: 'ALL' | 'INCOMING' | 'OUTGOING'
}

export function ReportStoOrderItemsPage({ direction = 'ALL' }: ReportStoOrderItemsPageProps) {
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

    const pageTitle =
        direction === 'INCOMING'
            ? 'Laporan Item Order STO (Penerimaan)'
            : direction === 'OUTGOING'
                ? 'Laporan Item Order STO (Pengiriman)'
                : 'Laporan Item Order STO'

    const pageSubtitle =
        direction === 'INCOMING'
            ? 'Rincian item barang pada dokumen order STO yang ditujukan ke outlet penerima.'
            : direction === 'OUTGOING'
                ? 'Rincian item barang pada dokumen order STO yang dikirim dari outlet pengirim.'
                : 'Rincian detail item barang pada dokumen order STO.'

    useEffect(() => {
        if (canFilterOutlet) {
            masterOutletService.getAllWhOutlet()
                .then(setOutletOptions)
                .catch(err => console.error('Gagal memuat daftar outlet:', err))
        }
    }, [canFilterOutlet])

    const fetchReport = async () => {
        if (!user?.kode_outlet) return

        setIsLoading(true)
        const filters = {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            outlet: canFilterOutlet ? selectedOutlet : undefined,
            userOutlet: user.kode_outlet,
            direction,
        }

        const res = await getStoOrderItemsReport(filters)
        if (res.isSuccess && res.data) {
            setData(res.data)
        } else {
            toast.error(res.error || 'Gagal memuat laporan item order STO')
        }
        setIsLoading(false)
    }

    // Initial load & reload when outlet or direction changes
    useEffect(() => {
        fetchReport()
    }, [user?.kode_outlet, direction]) // eslint-disable-line react-hooks/exhaustive-deps

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)

    const handleExport = () => {
        if (data.length === 0) return toast.error('Tidak ada data untuk diekspor')

        const csvContent = [
            ['Tanggal Order', 'No. Dokumen STO', 'Outlet Pengirim', 'Outlet Penerima', 'SKU', 'Nama Barang', 'Qty Diminta', 'Harga Satuan', 'Subtotal'],
            ...data.map(item => [
                format(new Date(item.order_date), 'yyyy-MM-dd'),
                item.document_number,
                (item.from_outlet_name || item.from_outlet || '-').replace(/,/g, ' '),
                (item.to_outlet_name || item.to_outlet || '-').replace(/,/g, ' '),
                item.sku,
                item.item_name.replace(/,/g, ' '),
                item.qty_requested.toString(),
                item.price_unit.toString(),
                item.subtotal.toString()
            ])
        ]
            .map(e => e.join(","))
            .join("\n");

        const sideSuffix = direction === 'INCOMING' ? '_penerimaan' : direction === 'OUTGOING' ? '_pengiriman' : ''
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `laporan_item_order_sto${sideSuffix}_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const handlePrintReport = async () => {
        if (data.length === 0) {
            toast.error('Tidak ada data untuk dicetak')
            return
        }

        const totalQty = data.reduce((sum, item) => sum + Number(item.qty_requested || 0), 0)
        const totalNilai = data.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)

        await printReportA4({
            title: pageTitle,
            subtitle: pageSubtitle,
            canSelectOutlet: canFilterOutlet,
            selectedOutlet,
            userOutletCode: user?.kode_outlet,
            availableOutlets: outletOptions,
            startDate,
            endDate,
            statusLabel: direction === 'INCOMING' ? 'Sisi Penerimaan' : direction === 'OUTGOING' ? 'Sisi Pengiriman' : 'Semua Arah',
            summaryItems: [
                { label: 'Total Baris Item', value: `${data.length} Item` },
                { label: 'Total Qty Diminta', value: totalQty.toLocaleString('id-ID') },
                { label: 'Total Nilai Order', value: formatCurrency(totalNilai) },
            ],
            columns: [
                { header: 'Tanggal', width: '75px' },
                { header: 'No. Dokumen STO', width: '115px' },
                { header: 'Pengirim', width: '95px' },
                { header: 'Penerima', width: '95px' },
                { header: 'SKU', width: '70px' },
                { header: 'Nama Barang' },
                { header: 'Qty', align: 'right', width: '45px' },
                { header: 'Harga', align: 'right', width: '80px' },
                { header: 'Subtotal', align: 'right', width: '90px' },
            ],
            rows: data.map((item) => [
                format(new Date(item.order_date), 'dd/MM/yyyy'),
                item.document_number,
                item.from_outlet_name || item.from_outlet || '-',
                item.to_outlet_name || item.to_outlet || '-',
                item.sku || '-',
                item.item_name || '-',
                Number(item.qty_requested || 0).toLocaleString('id-ID'),
                formatCurrency(Number(item.price_unit || 0)),
                formatCurrency(Number(item.subtotal || 0)),
            ]),
            totalRow: [
                'TOTAL',
                '',
                '',
                '',
                '',
                `${data.length} Item`,
                totalQty.toLocaleString('id-ID'),
                '',
                formatCurrency(totalNilai),
            ],
        })
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zen-charcoal dark:text-zen-linen font-serif">{pageTitle}</h1>
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                            <List className="h-4 w-4 text-zen-matcha" />
                            {pageSubtitle}
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

                <Card className="border-zen-sand/40 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Filter Laporan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label>Tanggal Mulai</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tanggal Selesai</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>

                            {canFilterOutlet && (
                                <div className="space-y-2">
                                    <Label>
                                        {direction === 'INCOMING'
                                            ? 'Filter Outlet Penerima'
                                            : direction === 'OUTGOING'
                                                ? 'Filter Outlet Pengirim'
                                                : 'Filter Outlet'}
                                    </Label>
                                    <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Semua Outlet" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Semua Outlet</SelectItem>
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
                                <Button onClick={fetchReport} disabled={isLoading} className="flex-1 bg-zen-matcha hover:bg-zen-moss text-white">
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                                    Tampilkan
                                </Button>
                                <Button variant="outline" onClick={handleExport} disabled={data.length === 0} title="Ekspor CSV">
                                    <Download className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-zen-sand/40 shadow-sm">
                    <CardContent className="p-0 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead>Tanggal Order</TableHead>
                                    <TableHead>No. Dokumen STO</TableHead>
                                    <TableHead>Outlet Pengirim</TableHead>
                                    <TableHead>Outlet Penerima</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Nama Barang</TableHead>
                                    <TableHead className="text-right">Qty Diminta</TableHead>
                                    <TableHead className="text-right">Harga Satuan</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">Memuat data...</TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">Tidak ada data item order STO.</TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item, idx) => (
                                        <TableRow key={item.id || idx} className="hover:bg-muted/50 transition-colors">
                                            <TableCell>{format(new Date(item.order_date), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="font-medium font-mono text-xs">{item.document_number}</TableCell>
                                            <TableCell className="text-xs">{item.from_outlet_name || item.from_outlet || '-'}</TableCell>
                                            <TableCell className="text-xs">{item.to_outlet_name || item.to_outlet || '-'}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-mono">{item.sku}</TableCell>
                                            <TableCell>{item.item_name}</TableCell>
                                            <TableCell className="text-right font-mono">{item.qty_requested}</TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground text-xs">
                                                {formatCurrency(item.price_unit)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium">
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
