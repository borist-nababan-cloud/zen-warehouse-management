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
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Wallet, Download, Loader2, Search, Printer, Image as ImageIcon, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'
import { printReportA4 } from '@/utils/reportPrintUtils'
import { normalizeViewReceiptImages, type GalleryImageItem } from '@/components/common/TransactionImageGalleryDialog'

interface DualPhotoPanelProps {
    title: string
    outletLabel: string
    images: GalleryImageItem[]
    emptyText: string
}

function DualPhotoPanel({ title, outletLabel, images, emptyText }: DualPhotoPanelProps) {
    const [activeIdx, setActiveIdx] = useState(0)

    useEffect(() => {
        setActiveIdx(0)
    }, [images])

    const current = images[activeIdx]

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {title}
                        </p>
                        {images.length > 0 && (
                            <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                                {activeIdx + 1} / {images.length}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {outletLabel}
                    </p>
                </div>
                {current && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 h-7 text-xs"
                        onClick={() => window.open(current.url, '_blank')}
                    >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Tab Baru
                    </Button>
                )}
            </div>

            {current ? (
                <div className="space-y-2">
                    <div className="relative flex items-center justify-center bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-700 p-2 h-64 overflow-hidden">
                        <img
                            src={current.url}
                            alt={current.label || title}
                            className="max-h-full max-w-full object-contain rounded"
                        />
                        {images.length > 1 && (
                            <>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    aria-label="Foto Sebelumnya"
                                    onClick={() => setActiveIdx((prev) => (prev - 1 + images.length) % images.length)}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow bg-white/90 hover:bg-white text-slate-800"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    aria-label="Foto Berikutnya"
                                    onClick={() => setActiveIdx((prev) => (prev + 1) % images.length)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow bg-white/90 hover:bg-white text-slate-800"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>

                    {images.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                            {images.map((img, idx) => {
                                const isActive = idx === activeIdx
                                return (
                                    <button
                                        key={`${img.url}-${idx}`}
                                        type="button"
                                        onClick={() => setActiveIdx(idx)}
                                        className={`relative shrink-0 h-12 w-12 rounded overflow-hidden border-2 transition-all ${
                                            isActive
                                                ? 'border-blue-600 ring-1 ring-blue-300'
                                                : 'border-slate-200 opacity-70 hover:opacity-100'
                                        }`}
                                        title={img.label || `Foto ${idx + 1}`}
                                    >
                                        <img
                                            src={img.url}
                                            alt={`Thumb ${idx + 1}`}
                                            className="h-full w-full object-cover"
                                        />
                                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center truncate px-0.5">
                                            {img.label || `#${idx + 1}`}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center bg-slate-100/70 dark:bg-slate-800/40 rounded border border-dashed border-slate-300 dark:border-slate-700 h-64 text-slate-400 text-xs">
                    <ImageIcon className="h-8 w-8 mb-1 opacity-40" />
                    <span>{emptyText}</span>
                </div>
            )}
        </div>
    )
}

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
            toast.error(res.error || 'Gagal memuat laporan penerimaan STO')
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
        if (data.length === 0) return toast.error('Tidak ada data untuk diekspor')

        const csvContent = [
            ['Tanggal Terima', 'No. Penerimaan', 'No. Order STO', 'Dari Outlet', 'Ke Outlet', 'Total Nilai'],
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
        link.setAttribute("download", `laporan_penerimaan_sto_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const handlePrintReport = async () => {
        if (data.length === 0) {
            toast.error('Tidak ada data untuk dicetak')
            return
        }

        const totalNilai = data.reduce((sum, item) => sum + Number(item.grand_total || 0), 0)

        await printReportA4({
            title: 'Laporan Penerimaan STO',
            subtitle: 'Rekapitulasi dokumen tanda terima barang STO yang telah selesai.',
            canSelectOutlet: canFilterOutlet,
            selectedOutlet,
            userOutletCode: user?.kode_outlet,
            availableOutlets: outletOptions,
            startDate,
            endDate,
            statusLabel: 'Diterima (COMPLETED)',
            summaryItems: [
                { label: 'Total Dokumen Terima', value: `${data.length} Dokumen` },
                { label: 'Total Nilai Penerimaan', value: formatCurrency(totalNilai) },
            ],
            columns: [
                { header: 'Tgl Terima', width: '80px' },
                { header: 'No. Penerimaan', width: '130px' },
                { header: 'No. Order STO', width: '130px' },
                { header: 'Dari Outlet' },
                { header: 'Ke Outlet' },
                { header: 'Nilai Order', align: 'right', width: '110px' },
            ],
            rows: data.map((item) => [
                format(new Date(item.received_at), 'dd/MM/yyyy'),
                item.document_number,
                item.order_number,
                `${item.from_outlet} ${item.from_outlet_name ? `- ${item.from_outlet_name}` : ''}`.trim(),
                `${item.to_outlet} ${item.to_outlet_name ? `- ${item.to_outlet_name}` : ''}`.trim(),
                formatCurrency(Number(item.grand_total || 0)),
            ]),
            totalRow: ['TOTAL', '', '', '', `${data.length} Dokumen`, formatCurrency(totalNilai)],
        })
    }

    const previewSenderImages = previewItem
        ? normalizeViewReceiptImages(previewItem.shipment_images, previewItem.shipment_image_url, previewItem.order_number)
        : []
    const previewReceiverImages = previewItem
        ? normalizeViewReceiptImages(previewItem.receipt_images, previewItem.receipt_image_url, previewItem.document_number)
        : []

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Laporan Penerimaan STO</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Rekapitulasi dokumen penerimaan transfer stok antar-outlet yang telah selesai.
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
                                <Label>Tanggal Akhir</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>

                            {canFilterOutlet && (
                                <div className="space-y-2">
                                    <Label>Filter Outlet</Label>
                                    <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Semua Outlet" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">SEMUA OUTLET</SelectItem>
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
                                    Tampilkan
                                </Button>
                                <Button variant="outline" onClick={handleExport} disabled={data.length === 0} title="Ekspor CSV">
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
                                    <TableHead>Tgl Terima</TableHead>
                                    <TableHead>No. Penerimaan</TableHead>
                                    <TableHead>No. Order STO</TableHead>
                                    <TableHead>Dari Outlet</TableHead>
                                    <TableHead>Ke Outlet</TableHead>
                                    <TableHead className="text-right">Nilai Order</TableHead>
                                    <TableHead className="text-center w-[160px]">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Memuat data...</TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Tidak ada data penerimaan STO ditemukan.</TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item, idx) => {
                                        const senderImgs = normalizeViewReceiptImages(
                                            item.shipment_images,
                                            item.shipment_image_url,
                                            item.order_number
                                        )
                                        const receiverImgs = normalizeViewReceiptImages(
                                            item.receipt_images,
                                            item.receipt_image_url,
                                            item.document_number
                                        )
                                        const totalPhotoCount = senderImgs.length + receiverImgs.length
                                        const hasAnyPhoto = totalPhotoCount > 0

                                        return (
                                            <TableRow key={item.id || idx} className="hover:bg-muted/50 transition-colors">
                                                <TableCell>{format(new Date(item.received_at), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="font-medium text-blue-600">{item.document_number}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{item.order_number}</TableCell>
                                                <TableCell>{item.from_outlet_name || item.from_outlet}</TableCell>
                                                <TableCell>{item.to_outlet_name || item.to_outlet}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {formatCurrency(item.grand_total)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {/* Print STO */}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={!item.sto_id}
                                                            title={item.sto_id ? 'Cetak Dokumen STO' : 'Dokumen STO tidak tersedia'}
                                                            className={`flex flex-col h-auto py-1 px-2 gap-0.5 ${
                                                                item.sto_id
                                                                    ? 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50'
                                                                    : 'text-slate-300 dark:text-slate-600'
                                                            }`}
                                                            onClick={() => {
                                                                if (!item.sto_id) return
                                                                window.open(`/sto/${item.sto_id}/print`, '_blank')
                                                            }}
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                            <span className="text-[10px] leading-tight font-medium">Cetak</span>
                                                        </Button>

                                                        {/* View Uploaded STO Photos (Sender & Receiver, up to 3 each) */}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={!hasAnyPhoto}
                                                            title={
                                                                hasAnyPhoto
                                                                    ? `Lihat ${totalPhotoCount} Foto Bukti STO (Pengirim: ${senderImgs.length}, Penerima: ${receiverImgs.length})`
                                                                    : 'Tidak ada foto bukti STO'
                                                            }
                                                            className={`flex flex-col h-auto py-1 px-2 gap-0.5 ${
                                                                hasAnyPhoto
                                                                    ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50'
                                                                    : 'text-slate-300 dark:text-slate-600'
                                                            }`}
                                                            onClick={() => {
                                                                if (!hasAnyPhoto) return
                                                                setPreviewItem(item)
                                                            }}
                                                        >
                                                            <ImageIcon className="h-4 w-4" />
                                                            <span className="text-[10px] leading-tight font-medium">
                                                                {hasAnyPhoto ? `Foto (${totalPhotoCount})` : 'Foto'}
                                                            </span>
                                                        </Button>
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

            {/* Dual STO Multi-Photo Comparison Dialog (Sender vs Receiver, up to 3 photos each) */}
            <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Bukti Foto STO: {previewItem?.order_number} (Terima: {previewItem?.document_number})
                        </DialogTitle>
                        <DialogDescription>
                            Perbandingan bukti foto pengiriman dari outlet pengirim dan bukti foto penerimaan dari outlet penerima (masing-masing hingga 3 foto).
                        </DialogDescription>
                    </DialogHeader>
                    {previewItem && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                            <DualPhotoPanel
                                title="1. Foto Pengiriman (Pengirim)"
                                outletLabel={`Outlet Pengirim: ${previewItem.from_outlet_name || previewItem.from_outlet}`}
                                images={previewSenderImages}
                                emptyText="Tidak ada foto dari pengirim"
                            />
                            <DualPhotoPanel
                                title="2. Foto Penerimaan (Penerima)"
                                outletLabel={`Outlet Penerima: ${previewItem.to_outlet_name || previewItem.to_outlet}`}
                                images={previewReceiverImages}
                                emptyText="Tidak ada foto dari penerima"
                            />
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
