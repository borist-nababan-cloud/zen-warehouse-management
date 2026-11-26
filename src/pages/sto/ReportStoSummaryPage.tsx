import { useState, useEffect, useMemo } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { getStoSummaryReport } from '@/services/stoReportService'
import { masterOutletService } from '@/services/masterOutletService'
import { MasterOutlet, StoSummaryReportItem } from '@/types/database'
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
import { Loader2, Filter, ArrowRight, ArrowUpRight, ArrowDownLeft, Truck, Image as ImageIcon, Printer, Download } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns'
import { normalizeViewReceiptImages } from '@/components/common/TransactionImageGalleryDialog'
import { StoDualPhotoDialog } from '@/components/sto/StoDualPhotoDialog'
import { printReportA4 } from '@/utils/reportPrintUtils'

function csvCell(val: string | number | null | undefined): string {
    const s = String(val ?? '')
    return `"${s.replace(/"/g, '""')}"`
}

export function ReportStoSummaryPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<StoSummaryReportItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [previewItem, setPreviewItem] = useState<StoSummaryReportItem | null>(null)

    // Multi-outlet selector strictly for Roles 5, 8, 13
    const canSelectOutlet = [5, 8, 13].includes(Number(user?.user_role || 0))
    const [outletOptions, setOutletOptions] = useState<MasterOutlet[]>([])
    const [selectedOutlet, setSelectedOutlet] = useState<string>('ALL')

    // Filters (default: 7 hari terakhir agar muat awal cepat)
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [activePreset, setActivePreset] = useState<'week' | 'month' | 'year' | 'custom'>('week')
    const [direction, setDirection] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL')

    useEffect(() => {
        if (canSelectOutlet) {
            masterOutletService.getAllWhOutlet()
                .then(setOutletOptions)
                .catch(err => console.error('Gagal memuat daftar outlet:', err))
        }
    }, [canSelectOutlet])

    const fetchReport = async (overrideStart?: string, overrideEnd?: string) => {
        if (!user?.kode_outlet && !canSelectOutlet) return

        const effectiveStart = overrideStart ?? startDate
        const effectiveEnd = overrideEnd ?? endDate

        setIsLoading(true)
        const res = await getStoSummaryReport({
            startDate: effectiveStart ? new Date(effectiveStart) : undefined,
            endDate: effectiveEnd ? new Date(effectiveEnd) : undefined,
            direction,
            outlet: canSelectOutlet ? selectedOutlet : undefined,
            userOutlet: user?.kode_outlet || ''
        })

        if (res.isSuccess && res.data) {
            setData(res.data)
        } else {
            toast.error(res.error || "Gagal memuat ringkasan laporan STO")
        }
        setIsLoading(false)
    }

    const applyDatePreset = (preset: 'week' | 'month' | 'year') => {
        const today = new Date()
        let nextStart: string
        let nextEnd: string

        if (preset === 'week') {
            nextStart = format(subDays(today, 7), 'yyyy-MM-dd')
            nextEnd = format(today, 'yyyy-MM-dd')
        } else if (preset === 'month') {
            nextStart = format(startOfMonth(today), 'yyyy-MM-dd')
            nextEnd = format(endOfMonth(today), 'yyyy-MM-dd')
        } else {
            nextStart = format(startOfYear(today), 'yyyy-MM-dd')
            nextEnd = format(endOfYear(today), 'yyyy-MM-dd')
        }

        setStartDate(nextStart)
        setEndDate(nextEnd)
        setActivePreset(preset)
        fetchReport(nextStart, nextEnd)
    }

    // Load on mount
    useEffect(() => {
        if (user?.kode_outlet || canSelectOutlet) {
            fetchReport()
        }
    }, [user?.kode_outlet, canSelectOutlet]) // eslint-disable-line react-hooks/exhaustive-deps

    // Active outlet context for summary & highlight
    const activeOutletCode = canSelectOutlet
        ? (selectedOutlet !== 'ALL' ? selectedOutlet : null)
        : (user?.kode_outlet || null)

    // Calculate Summaries
    const summaries = useMemo(() => {
        let incoming = 0
        let outgoing = 0
        let shipping = 0
        let grandTotal = 0

        data.forEach(item => {
            const val = Number(item.grand_total || 0)
            shipping += Number(item.shipping_cost || 0)
            grandTotal += val

            if (activeOutletCode) {
                if (item.to_outlet === activeOutletCode) {
                    incoming += val
                }
                if (item.from_outlet === activeOutletCode) {
                    outgoing += val
                }
            } else {
                // ALL outlets mode: total value across all transfers
                incoming += val
                outgoing += val
            }
        })

        return { incoming, outgoing, shipping, grandTotal }
    }, [data, activeOutletCode])

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)

    const directionLabel =
        direction === 'INCOMING'
            ? 'Barang Masuk'
            : direction === 'OUTGOING'
                ? 'Barang Keluar'
                : 'Semua Arah'

    const handleExportCsv = () => {
        if (data.length === 0) {
            toast.error('Tidak ada data untuk diekspor')
            return
        }

        const headers = [
            'Tanggal',
            'No. Dokumen',
            'Outlet Pengirim',
            'Outlet Penerima',
            'Status Pengirim',
            'Status Penerima',
            'Rincian Barang',
            'Ongkos Kirim',
            'Total Nilai',
        ]
        const rows = data.map((item) => [
            csvCell(format(new Date(item.order_date), 'yyyy-MM-dd')),
            csvCell(item.document_number),
            csvCell(item.from_outlet_name || item.from_outlet),
            csvCell(item.to_outlet_name || item.to_outlet),
            csvCell(item.sender_status),
            csvCell(item.recipient_status),
            csvCell(item.items_summary),
            Number(item.shipping_cost || 0),
            Number(item.grand_total || 0),
        ])

        const csvContent = '\uFEFF' + [headers.map(csvCell).join(','), ...rows.map((r) => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `Ringkasan_Laporan_STO_${startDate}_${endDate}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const handlePrintReport = async () => {
        if (data.length === 0) {
            toast.error('Tidak ada data untuk dicetak')
            return
        }

        await printReportA4({
            title: 'Ringkasan Laporan STO',
            subtitle: 'Ikhtisar seluruh pergerakan transfer stok barang masuk dan keluar antar-cabang.',
            canSelectOutlet,
            selectedOutlet: canSelectOutlet ? selectedOutlet : (user?.kode_outlet || ''),
            userOutletCode: user?.kode_outlet,
            availableOutlets: outletOptions,
            startDate,
            endDate,
            statusLabel: directionLabel,
            summaryItems: [
                { label: 'Total Dokumen STO', value: `${data.length} Dokumen` },
                { label: activeOutletCode ? 'Total Barang Keluar' : 'Total Nilai Transfer', value: formatCurrency(summaries.outgoing) },
                ...(activeOutletCode ? [{ label: 'Total Barang Masuk', value: formatCurrency(summaries.incoming) }] : []),
                { label: 'Total Ongkos Kirim', value: formatCurrency(summaries.shipping) },
            ],
            columns: [
                { header: 'Tanggal', width: '70px' },
                { header: 'No. Dokumen', width: '115px' },
                { header: 'Dari Outlet', width: '95px' },
                { header: 'Ke Outlet', width: '95px' },
                { header: 'Status', width: '85px' },
                { header: 'Rincian Barang' },
                { header: 'Total Nilai', align: 'right', width: '95px' },
            ],
            rows: data.map((item) => [
                format(new Date(item.order_date), 'dd/MM/yyyy'),
                item.document_number,
                item.from_outlet_name || item.from_outlet,
                item.to_outlet_name || item.to_outlet,
                `${item.sender_status} / ${item.recipient_status}`,
                item.items_summary || '-',
                formatCurrency(Number(item.grand_total || 0)),
            ]),
            totalRow: ['TOTAL', `${data.length} STO`, '', '', '', '', formatCurrency(summaries.grandTotal)],
        })
    }

    const previewSenderImages = previewItem
        ? normalizeViewReceiptImages(previewItem.shipment_images, null, previewItem.document_number)
        : []
    const previewReceiverImages = previewItem
        ? normalizeViewReceiptImages(previewItem.receipt_images, null, previewItem.document_number)
        : []

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold font-serif tracking-tight text-zen-charcoal">Ringkasan Laporan STO</h1>
                        <p className="text-muted-foreground text-sm">Ikhtisar seluruh pergerakan transfer stok barang masuk dan keluar.</p>
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
                            onClick={handleExportCsv}
                            disabled={isLoading || data.length === 0}
                            variant="outline"
                            className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                            <Download className="h-4 w-4" />
                            Ekspor CSV
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card className="bg-zen-sand/10 dark:bg-zen-stone/40 border-zen-border shadow-xs">
                    <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-sm font-semibold text-zen-charcoal flex items-center gap-2">
                            <Filter className="h-4 w-4 text-zen-moss" /> Parameter Filter
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                                type="button"
                                size="sm"
                                variant={activePreset === 'week' ? 'default' : 'outline'}
                                disabled={isLoading}
                                onClick={() => applyDatePreset('week')}
                                className={`h-7 text-xs ${activePreset === 'week' ? 'bg-zen-moss hover:bg-zen-moss/90 text-white' : ''}`}
                            >
                                Minggu Ini
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={activePreset === 'month' ? 'default' : 'outline'}
                                disabled={isLoading}
                                onClick={() => applyDatePreset('month')}
                                className={`h-7 text-xs ${activePreset === 'month' ? 'bg-zen-moss hover:bg-zen-moss/90 text-white' : ''}`}
                            >
                                Bulan Ini
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={activePreset === 'year' ? 'default' : 'outline'}
                                disabled={isLoading}
                                onClick={() => applyDatePreset('year')}
                                className={`h-7 text-xs ${activePreset === 'year' ? 'bg-zen-moss hover:bg-zen-moss/90 text-white' : ''}`}
                            >
                                Tahun Ini
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={`grid grid-cols-1 ${canSelectOutlet ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4 items-end`}>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-zen-charcoal">Dari Tanggal</Label>
                                <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setActivePreset('custom') }} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-zen-charcoal">Sampai Tanggal</Label>
                                <Input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setActivePreset('custom') }} />
                            </div>
                            {canSelectOutlet && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-zen-charcoal">Outlet</Label>
                                    <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Semua Outlet" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">SEMUA OUTLET</SelectItem>
                                            {outletOptions.map((opt) => (
                                                <SelectItem key={opt.kode_outlet} value={opt.kode_outlet}>
                                                    {opt.name_outlet}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-zen-charcoal">Arah Transfer</Label>
                                <Select value={direction} onValueChange={(v: any) => setDirection(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Arah" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Semua Arah</SelectItem>
                                        <SelectItem value="INCOMING">Barang Masuk (Ke Gerai Ini)</SelectItem>
                                        <SelectItem value="OUTGOING">Barang Keluar (Dari Gerai Ini)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={() => fetchReport()} disabled={isLoading} className="bg-zen-moss hover:bg-zen-moss/90 text-white font-medium">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Terapkan Filter
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-l-4 border-l-zen-moss border-zen-border shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {activeOutletCode ? 'Total Barang Keluar' : 'Total Nilai Transfer'}
                            </CardTitle>
                            <ArrowUpRight className="h-4 w-4 text-zen-moss" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-mono text-zen-charcoal">{formatCurrency(summaries.outgoing)}</div>
                            <p className="text-xs text-muted-foreground">
                                {activeOutletCode ? 'Kirim transfer ke gerai cabang lain' : 'Akumulasi nilai seluruh dokumen STO'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-emerald-600 border-zen-border shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {activeOutletCode ? 'Total Barang Masuk' : 'Jumlah Dokumen STO'}
                            </CardTitle>
                            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-mono text-zen-charcoal">
                                {activeOutletCode ? formatCurrency(summaries.incoming) : `${data.length} Dokumen`}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {activeOutletCode ? 'Penerimaan pasokan stok dari gerai lain' : 'Total dokumen transfer pada periode terpilih'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-500 border-zen-border shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Ongkos Kirim</CardTitle>
                            <Truck className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-mono text-zen-charcoal">{formatCurrency(summaries.shipping)}</div>
                            <p className="text-xs text-muted-foreground">Biaya logistik pengiriman antar gerai</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Data Table */}
                <Card className="shadow-xs border-zen-border overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>No. Dokumen</TableHead>
                                    <TableHead className="text-center">Rute Pengiriman</TableHead>
                                    <TableHead>Status Pengirim</TableHead>
                                    <TableHead>Status Penerima</TableHead>
                                    <TableHead>Rincian Barang</TableHead>
                                    <TableHead className="text-right">Total Nilai</TableHead>
                                    <TableHead className="text-center w-[100px]">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center h-24 text-muted-foreground text-sm">Memuat data...</TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center h-24 text-muted-foreground text-sm">Tidak ada data transfer pada periode ini.</TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item, idx) => {
                                        const senderImgs = normalizeViewReceiptImages(item.shipment_images, null, item.document_number)
                                        const receiverImgs = normalizeViewReceiptImages(item.receipt_images, null, item.document_number)
                                        const totalPhotoCount = senderImgs.length + receiverImgs.length
                                        const hasAnyPhoto = totalPhotoCount > 0

                                        return (
                                            <TableRow key={`${item.id}-${idx}`}>
                                                <TableCell className="whitespace-nowrap font-mono text-xs">{format(new Date(item.order_date), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="font-medium font-mono text-xs">{item.document_number}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-center gap-2 text-xs">
                                                        <span className={activeOutletCode && item.from_outlet === activeOutletCode ? "font-bold text-zen-moss dark:text-zen-matcha" : "text-muted-foreground"}>
                                                            {item.from_outlet_name || item.from_outlet}
                                                        </span>
                                                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className={activeOutletCode && item.to_outlet === activeOutletCode ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                                                            {item.to_outlet_name || item.to_outlet}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zen-sand/20 text-zen-charcoal">
                                                        {item.sender_status}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zen-matcha/20 text-zen-moss">
                                                        {item.recipient_status}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground" title={item.items_summary}>
                                                    {item.items_summary}
                                                </TableCell>
                                                <TableCell className="text-right font-bold font-mono">
                                                    {formatCurrency(item.grand_total)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={!hasAnyPhoto}
                                                        title={
                                                            hasAnyPhoto
                                                                ? `Lihat ${totalPhotoCount} Foto Bukti STO (Pengirim: ${senderImgs.length}, Penerima: ${receiverImgs.length})`
                                                                : 'Tidak ada foto bukti STO'
                                                        }
                                                        className={`flex flex-col h-auto py-1 px-2 gap-0.5 mx-auto ${
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

            <StoDualPhotoDialog
                open={!!previewItem}
                onOpenChange={(open) => !open && setPreviewItem(null)}
                title={`Bukti Foto STO: ${previewItem?.document_number || ''}`}
                fromOutletLabel={previewItem?.from_outlet_name || previewItem?.from_outlet || '-'}
                toOutletLabel={previewItem?.to_outlet_name || previewItem?.to_outlet || '-'}
                senderImages={previewSenderImages}
                receiverImages={previewReceiverImages}
            />
        </DashboardLayout>
    )
}
