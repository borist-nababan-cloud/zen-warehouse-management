import { useState, useEffect, useMemo } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { getStoOrderItemsReport } from '@/services/stoReportService'
import { masterOutletService } from '@/services/masterOutletService'
import { MasterOutlet, StoOrderItem } from '@/types/database'
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
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Filter, ArrowRight, ArrowUpRight, ArrowDownLeft, Boxes, Printer, Download } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns'
import { printReportA4 } from '@/utils/reportPrintUtils'

function csvCell(val: string | number | null | undefined): string {
    const s = String(val ?? '')
    return `"${s.replace(/"/g, '""')}"`
}

function formatQty(val: number): string {
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
    }).format(val)
}

export function ReportStoSummaryItemsPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<StoOrderItem[]>([])
    const [isLoading, setIsLoading] = useState(false)

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
        const res = await getStoOrderItemsReport({
            startDate: effectiveStart ? new Date(effectiveStart) : undefined,
            endDate: effectiveEnd ? new Date(effectiveEnd) : undefined,
            direction,
            outlet: canSelectOutlet ? selectedOutlet : undefined,
            userOutlet: user?.kode_outlet || '',
        })

        if (res.isSuccess && res.data) {
            setData(res.data)
        } else {
            toast.error(res.error || 'Gagal memuat ringkasan items STO')
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

    useEffect(() => {
        if (user?.kode_outlet || canSelectOutlet) {
            fetchReport()
        }
    }, [user?.kode_outlet, canSelectOutlet]) // eslint-disable-line react-hooks/exhaustive-deps

    const activeOutletCode = canSelectOutlet
        ? (selectedOutlet !== 'ALL' ? selectedOutlet : null)
        : (user?.kode_outlet || null)

    const summaries = useMemo(() => {
        let incoming = 0
        let outgoing = 0
        let totalQty = 0
        let grandTotal = 0

        data.forEach(item => {
            const sub = Number(item.subtotal || 0)
            totalQty += Number(item.qty_requested || 0)
            grandTotal += sub

            if (activeOutletCode) {
                if (item.to_outlet === activeOutletCode) {
                    incoming += sub
                }
                if (item.from_outlet === activeOutletCode) {
                    outgoing += sub
                }
            } else {
                incoming += sub
                outgoing += sub
            }
        })

        return { incoming, outgoing, totalQty, grandTotal }
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
            'SKU',
            'Nama Barang',
            'Qty',
            'Harga Satuan',
            'Subtotal',
        ]
        const rows = data.map((item) => [
            csvCell(format(new Date(item.order_date), 'yyyy-MM-dd')),
            csvCell(item.document_number),
            csvCell(item.from_outlet_name || item.from_outlet),
            csvCell(item.to_outlet_name || item.to_outlet),
            csvCell(item.sender_status || '-'),
            csvCell(item.recipient_status || '-'),
            csvCell(item.sku),
            csvCell(item.item_name),
            Number(item.qty_requested || 0),
            Number(item.price_unit || 0),
            Number(item.subtotal || 0),
        ])

        const csvContent = '\uFEFF' + [headers.map(csvCell).join(','), ...rows.map((r) => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `Ringkasan_Items_STO_${startDate}_${endDate}.csv`
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
            title: 'Ringkasan Items STO',
            subtitle: 'Rincian item barang (kuantitas, harga satuan, dan subtotal) seluruh transfer stok masuk dan keluar.',
            canSelectOutlet,
            selectedOutlet: canSelectOutlet ? selectedOutlet : (user?.kode_outlet || ''),
            userOutletCode: user?.kode_outlet,
            availableOutlets: outletOptions,
            startDate,
            endDate,
            statusLabel: directionLabel,
            summaryItems: [
                { label: 'Total Baris Item', value: `${data.length} Baris (${formatQty(summaries.totalQty)} Qty)` },
                { label: activeOutletCode ? 'Total Barang Keluar' : 'Total Nilai Item', value: formatCurrency(summaries.outgoing) },
                ...(activeOutletCode ? [{ label: 'Total Barang Masuk', value: formatCurrency(summaries.incoming) }] : []),
            ],
            columns: [
                { header: 'Tanggal', width: '65px' },
                { header: 'No. Dokumen', width: '105px' },
                { header: 'Rute', width: '115px' },
                { header: 'Status', width: '80px' },
                { header: 'Barang' },
                { header: 'Qty', align: 'right', width: '48px' },
                { header: 'Harga', align: 'right', width: '78px' },
                { header: 'Subtotal', align: 'right', width: '88px' },
            ],
            rows: data.map((item) => [
                format(new Date(item.order_date), 'dd/MM/yyyy'),
                item.document_number,
                `${item.from_outlet_name || item.from_outlet} → ${item.to_outlet_name || item.to_outlet}`,
                `${item.sender_status || '-'} / ${item.recipient_status || '-'}`,
                `${item.item_name}${item.sku ? ` (${item.sku})` : ''}`,
                formatQty(Number(item.qty_requested || 0)),
                formatCurrency(Number(item.price_unit || 0)),
                formatCurrency(Number(item.subtotal || 0)),
            ]),
            totalRow: [
                'TOTAL',
                `${data.length} Item`,
                '',
                '',
                '',
                formatQty(summaries.totalQty),
                '',
                formatCurrency(summaries.grandTotal),
            ],
        })
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold font-serif tracking-tight text-zen-charcoal">Ringkasan Items STO</h1>
                        <p className="text-muted-foreground text-sm">Rincian detail item barang, kuantitas, harga satuan, dan subtotal pada seluruh transfer stok.</p>
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
                                {activeOutletCode ? 'Total Barang Keluar' : 'Total Nilai Item STO'}
                            </CardTitle>
                            <ArrowUpRight className="h-4 w-4 text-zen-moss" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-mono text-zen-charcoal">{formatCurrency(summaries.outgoing)}</div>
                            <p className="text-xs text-muted-foreground">
                                {activeOutletCode ? 'Subtotal item dikirim ke gerai cabang lain' : 'Akumulasi subtotal seluruh item STO'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-emerald-600 border-zen-border shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {activeOutletCode ? 'Total Barang Masuk' : 'Jumlah Baris Item'}
                            </CardTitle>
                            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-mono text-zen-charcoal">
                                {activeOutletCode ? formatCurrency(summaries.incoming) : `${data.length} Baris`}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {activeOutletCode ? 'Subtotal item diterima dari gerai lain' : 'Total baris rincian item pada periode terpilih'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-500 border-zen-border shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Kuantitas Item</CardTitle>
                            <Boxes className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-mono text-zen-charcoal">{formatQty(summaries.totalQty)}</div>
                            <p className="text-xs text-muted-foreground">Dari {data.length} baris item transfer</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Data Table (No Action Column) */}
                <Card className="shadow-xs border-zen-border overflow-hidden">
                    <CardContent className="p-0 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>No. Dokumen</TableHead>
                                    <TableHead className="text-center">Rute Pengiriman</TableHead>
                                    <TableHead>Status Pengirim</TableHead>
                                    <TableHead>Status Penerima</TableHead>
                                    <TableHead>Barang</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Harga</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center h-24 text-muted-foreground text-sm">Memuat data...</TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center h-24 text-muted-foreground text-sm">Tidak ada data item transfer pada periode ini.</TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item, idx) => (
                                        <TableRow key={`${item.id || item.document_number}-${idx}`}>
                                            <TableCell className="whitespace-nowrap font-mono text-xs">
                                                {format(new Date(item.order_date), 'dd/MM/yyyy')}
                                            </TableCell>
                                            <TableCell className="font-medium font-mono text-xs whitespace-nowrap">
                                                {item.document_number}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-1.5 text-xs whitespace-nowrap">
                                                    <span className={activeOutletCode && item.from_outlet === activeOutletCode ? 'font-bold text-zen-moss dark:text-zen-matcha' : 'text-muted-foreground'}>
                                                        {item.from_outlet_name || item.from_outlet}
                                                    </span>
                                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                    <span className={activeOutletCode && item.to_outlet === activeOutletCode ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
                                                        {item.to_outlet_name || item.to_outlet}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zen-sand/20 text-zen-charcoal">
                                                    {item.sender_status || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zen-matcha/20 text-zen-moss">
                                                    {item.recipient_status || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="min-w-[180px]">
                                                <div className="font-medium text-xs text-zen-charcoal">{item.item_name}</div>
                                                <div className="text-[11px] font-mono text-muted-foreground">{item.sku}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                                                {formatQty(Number(item.qty_requested || 0))}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs whitespace-nowrap">
                                                {formatCurrency(Number(item.price_unit || 0))}
                                            </TableCell>
                                            <TableCell className="text-right font-bold font-mono text-xs whitespace-nowrap">
                                                {formatCurrency(Number(item.subtotal || 0))}
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
