import { useState, useEffect, useMemo } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import {
    FileText,
    Download,
    Loader2,
    Search,
    Clock,
    CheckCircle2,
    XCircle,
    ArrowRight,
    List,
    Layers
} from 'lucide-react'
import { toast } from 'sonner'

import { DashboardLayout } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

import { useAuthUser } from '@/hooks/useAuth'
import { masterOutletService } from '@/services/masterOutletService'
import { getStoRequestsReport, getStoRequestItemsReport } from '@/services/stoReportService'
import {
    MasterOutlet,
    StoRequestReportItem,
    StoRequestItemReportItem,
    StoRequestStatus
} from '@/types/database'

export function ReportStoRequestPage() {
    const { user } = useAuthUser()

    const [viewMode, setViewMode] = useState<'HEADER' | 'ITEMS'>('HEADER')
    const [headerData, setHeaderData] = useState<StoRequestReportItem[]>([])
    const [itemsData, setItemsData] = useState<StoRequestItemReportItem[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Filters
    const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    const [selectedOutlet, setSelectedOutlet] = useState<string>('ALL')
    const [direction, setDirection] = useState<'ALL' | 'OUTGOING' | 'INCOMING'>('ALL')
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [searchQuery, setSearchQuery] = useState<string>('')

    // Admin Outlet Options
    const [outletOptions, setOutletOptions] = useState<MasterOutlet[]>([])
    const canFilterOutlet = user?.user_role === 5 || user?.user_role === 8

    useEffect(() => {
        if (canFilterOutlet) {
            masterOutletService
                .getAllWhOutlet()
                .then(setOutletOptions)
                .catch(err => console.error('Failed to load outlets', err))
        }
    }, [canFilterOutlet])

    const fetchReports = async () => {
        if (!user) return
        setIsLoading(true)

        const filters = {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            outlet: canFilterOutlet ? selectedOutlet : undefined,
            userOutlet: user.kode_outlet || '111',
            direction,
            status: statusFilter
        }

        const [hRes, iRes] = await Promise.all([
            getStoRequestsReport(filters),
            getStoRequestItemsReport(filters)
        ])

        if (hRes.isSuccess && hRes.data) {
            setHeaderData(hRes.data)
        } else if (hRes.error) {
            toast.error('Gagal memuat ringkasan laporan request: ' + hRes.error)
        }

        if (iRes.isSuccess && iRes.data) {
            setItemsData(iRes.data)
        } else if (iRes.error) {
            toast.error('Gagal memuat rincian item laporan request: ' + iRes.error)
        }

        setIsLoading(false)
    }

    useEffect(() => {
        if (user) {
            fetchReports()
        }
    }, [user?.kode_outlet]) // eslint-disable-line react-hooks/exhaustive-deps

    const filteredHeaders = useMemo(() => {
        const q = searchQuery.toLowerCase().trim()
        if (!q) return headerData
        return headerData.filter(item =>
            item.document_number?.toLowerCase().includes(q) ||
            item.requesting_outlet_name?.toLowerCase().includes(q) ||
            item.target_outlet_name?.toLowerCase().includes(q) ||
            item.items_summary?.toLowerCase().includes(q) ||
            item.linked_sto_number?.toLowerCase().includes(q)
        )
    }, [headerData, searchQuery])

    const filteredItems = useMemo(() => {
        const q = searchQuery.toLowerCase().trim()
        if (!q) return itemsData
        return itemsData.filter(item =>
            item.document_number?.toLowerCase().includes(q) ||
            item.sku?.toLowerCase().includes(q) ||
            item.item_name?.toLowerCase().includes(q) ||
            item.requesting_outlet_name?.toLowerCase().includes(q) ||
            item.target_outlet_name?.toLowerCase().includes(q) ||
            item.linked_sto_number?.toLowerCase().includes(q)
        )
    }, [itemsData, searchQuery])

    // KPI counts from filteredHeaders
    const totalRequests = filteredHeaders.length
    const submittedCount = filteredHeaders.filter(r => r.status === 'SUBMITTED').length
    const fulfilledCount = filteredHeaders.filter(r => r.status === 'FULFILLED').length
    const cancelledCount = filteredHeaders.filter(r => r.status === 'CANCELLED').length

    const getStatusBadge = (status: StoRequestStatus) => {
        switch (status) {
            case 'SUBMITTED':
                return (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                        Menunggu Diproses
                    </Badge>
                )
            case 'FULFILLED':
                return (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                        Sudah Diproses STO
                    </Badge>
                )
            case 'CANCELLED':
                return (
                    <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                        Dibatalkan
                    </Badge>
                )
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const handleExportCsv = () => {
        if (viewMode === 'HEADER') {
            if (filteredHeaders.length === 0) return toast.error('Tidak ada data untuk diekspor')
            const csvRows = [
                [
                    'Tanggal Request',
                    'No. Dokumen Request',
                    'Kode Outlet Pemohon',
                    'Nama Outlet Pemohon',
                    'Kode Outlet Tujuan',
                    'Nama Outlet Tujuan',
                    'Jml Jenis Barang',
                    'Total Qty Diminta',
                    'Ringkasan Barang',
                    'Status',
                    'No. STO Terhubung',
                    'Catatan'
                ],
                ...filteredHeaders.map(h => [
                    format(new Date(h.request_date), 'yyyy-MM-dd'),
                    `"${h.document_number}"`,
                    `"${h.requesting_outlet}"`,
                    `"${h.requesting_outlet_name || ''}"`,
                    `"${h.target_outlet}"`,
                    `"${h.target_outlet_name || ''}"`,
                    h.total_items.toString(),
                    h.total_qty_requested.toString(),
                    `"${(h.items_summary || '').replace(/"/g, '""')}"`,
                    h.status,
                    `"${h.linked_sto_number || '-'}"`,
                    `"${(h.notes || '').replace(/"/g, '""')}"`
                ])
            ]
            const blob = new Blob([csvRows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Laporan_Request_STO_Ringkasan_${startDate}_sd_${endDate}.csv`
            a.click()
        } else {
            if (filteredItems.length === 0) return toast.error('Tidak ada data rincian barang untuk diekspor')
            const csvRows = [
                [
                    'Tanggal Request',
                    'No. Dokumen Request',
                    'Outlet Pemohon',
                    'Outlet Tujuan',
                    'SKU',
                    'Nama Barang',
                    'Qty Diminta',
                    'Satuan',
                    'Status Request',
                    'No. STO Terhubung',
                    'Catatan'
                ],
                ...filteredItems.map(i => [
                    format(new Date(i.request_date), 'yyyy-MM-dd'),
                    `"${i.document_number}"`,
                    `"${i.requesting_outlet_name || i.requesting_outlet}"`,
                    `"${i.target_outlet_name || i.target_outlet}"`,
                    `"${i.sku || '-'}"`,
                    `"${(i.item_name || '').replace(/"/g, '""')}"`,
                    i.qty_requested.toString(),
                    `"${i.uom}"`,
                    i.status,
                    `"${i.linked_sto_number || '-'}"`,
                    `"${(i.item_notes || i.header_notes || '').replace(/"/g, '""')}"`
                ])
            ]
            const blob = new Blob([csvRows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Laporan_Request_STO_Rincian_Barang_${startDate}_sd_${endDate}.csv`
            a.click()
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#EBE6DF] flex items-center gap-2">
                            <FileText className="h-6 w-6 text-[#889D35]" />
                            Laporan Request Kirim Barang (STO)
                        </h1>
                        <p className="text-slate-500 dark:text-[#A6A095] text-sm mt-1">
                            Laporan komprehensif dokumen permintaan pengiriman barang antar outlet beserta status pemenuhan STO.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleExportCsv}
                        disabled={viewMode === 'HEADER' ? filteredHeaders.length === 0 : filteredItems.length === 0}
                        className="dark:bg-[#22221B] dark:border-[#38382E] dark:text-[#EBE6DF]"
                    >
                        <Download className="mr-2 h-4 w-4 text-[#889D35]" />
                        Unduh CSV ({viewMode === 'HEADER' ? 'Ringkasan' : 'Rincian Item'})
                    </Button>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
                        <CardContent className="pt-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-[#A6A095]">Total Dokumen Request</p>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-[#EBE6DF] mt-1">{totalRequests}</h3>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#191914] text-slate-600 dark:text-[#A6A095]">
                                    <FileText className="w-5 h-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
                        <CardContent className="pt-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-[#A6A095]">Menunggu Diproses</p>
                                    <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{submittedCount}</h3>
                                </div>
                                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                                    <Clock className="w-5 h-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
                        <CardContent className="pt-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-[#A6A095]">Sudah Diproses STO</p>
                                    <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{fulfilledCount}</h3>
                                </div>
                                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
                        <CardContent className="pt-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-[#A6A095]">Dibatalkan</p>
                                    <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{cancelledCount}</h3>
                                </div>
                                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                                    <XCircle className="w-5 h-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters Card */}
                <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                            <div className="space-y-1.5">
                                <Label className="text-xs dark:text-[#EBE6DF]">Dari Tanggal</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="h-9 text-xs dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs dark:text-[#EBE6DF]">Sampai Tanggal</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="h-9 text-xs dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
                                />
                            </div>

                            {canFilterOutlet && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs dark:text-[#EBE6DF]">Filter Outlet</Label>
                                    <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                        <SelectTrigger className="h-9 text-xs dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]">
                                            <SelectValue placeholder="Semua Outlet" />
                                        </SelectTrigger>
                                        <SelectContent className="dark:bg-[#22221B] dark:border-[#38382E]">
                                            <SelectItem value="ALL">Semua Outlet</SelectItem>
                                            {outletOptions.map(o => (
                                                <SelectItem key={o.kode_outlet} value={o.kode_outlet}>
                                                    [{o.kode_outlet}] {o.name_outlet}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label className="text-xs dark:text-[#EBE6DF]">Arah Permintaan</Label>
                                <Select value={direction} onValueChange={(v: any) => setDirection(v)}>
                                    <SelectTrigger className="h-9 text-xs dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="dark:bg-[#22221B] dark:border-[#38382E]">
                                        <SelectItem value="ALL">Semua Arah</SelectItem>
                                        <SelectItem value="OUTGOING">Permintaan Keluar (Meminta)</SelectItem>
                                        <SelectItem value="INCOMING">Permintaan Masuk (Dimintai)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs dark:text-[#EBE6DF]">Status Request</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-9 text-xs dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="dark:bg-[#22221B] dark:border-[#38382E]">
                                        <SelectItem value="ALL">Semua Status</SelectItem>
                                        <SelectItem value="SUBMITTED">Menunggu Diproses</SelectItem>
                                        <SelectItem value="FULFILLED">Sudah Diproses STO</SelectItem>
                                        <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Button
                                    onClick={fetchReports}
                                    disabled={isLoading}
                                    className="w-full h-9 bg-[#889D35] hover:bg-[#72842B] text-white text-xs font-medium"
                                >
                                    {isLoading ? (
                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Search className="mr-2 h-3.5 w-3.5" />
                                    )}
                                    Terapkan Filter
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Table Card */}
                <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
                    <CardHeader className="pb-4 border-b border-slate-100 dark:border-[#38382E]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-[#EBE6DF]">
                                    Data Laporan Request Kirim Barang
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500 dark:text-[#A6A095]">
                                    Pilih tampilan Ringkasan Dokumen atau Rincian Item Barang yang diminta.
                                </CardDescription>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                {/* View Mode Switcher */}
                                <div className="inline-flex rounded-lg border border-slate-200 dark:border-[#38382E] bg-slate-50 dark:bg-[#191914] p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('HEADER')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                                            viewMode === 'HEADER'
                                                ? 'bg-[#889D35] text-white'
                                                : 'text-slate-600 dark:text-[#A6A095] hover:text-slate-900'
                                        }`}
                                    >
                                        <Layers className="w-3.5 h-3.5" />
                                        Ringkasan Dokumen ({filteredHeaders.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('ITEMS')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                                            viewMode === 'ITEMS'
                                                ? 'bg-[#889D35] text-white'
                                                : 'text-slate-600 dark:text-[#A6A095] hover:text-slate-900'
                                        }`}
                                    >
                                        <List className="w-3.5 h-3.5" />
                                        Rincian Barang ({filteredItems.length})
                                    </button>
                                </div>

                                {/* Instant Search */}
                                <div className="relative w-full sm:w-60">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <Input
                                        placeholder="Cari No. Request / Barang / STO..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="pl-8 h-9 text-xs dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            {viewMode === 'HEADER' ? (
                                <Table>
                                    <TableHeader className="bg-slate-50/80 dark:bg-[#191914]/80">
                                        <TableRow className="border-b border-slate-200 dark:border-[#38382E]">
                                            <TableHead className="text-xs dark:text-[#EBE6DF]">Tanggal</TableHead>
                                            <TableHead className="text-xs dark:text-[#EBE6DF]">No. Request</TableHead>
                                            <TableHead className="text-xs dark:text-[#EBE6DF]">Outlet Pemohon $\to$ Tujuan</TableHead>
                                            <TableHead className="text-xs dark:text-[#EBE6DF]">Ringkasan Barang Diminta</TableHead>
                                            <TableHead className="text-xs text-center dark:text-[#EBE6DF]">Total Qty</TableHead>
                                            <TableHead className="text-xs text-center dark:text-[#EBE6DF]">Status</TableHead>
                                            <TableHead className="text-xs text-center dark:text-[#EBE6DF]">Dokumen STO Terhubung</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-32 text-center text-slate-500 dark:text-[#A6A095]">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <Loader2 className="w-5 h-5 animate-spin text-[#889D35]" />
                                                        <span className="text-xs">Memuat laporan...</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredHeaders.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-28 text-center text-slate-500 dark:text-[#A6A095] text-sm">
                                                    Tidak ada data dokumen Request Kirim Barang pada periode ini.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredHeaders.map(row => (
                                                <TableRow
                                                    key={row.id}
                                                    className="border-b border-slate-100 dark:border-[#38382E]/60 hover:bg-slate-50/60 dark:hover:bg-[#191914]/40"
                                                >
                                                    <TableCell className="text-xs text-slate-600 dark:text-[#A6A095] whitespace-nowrap">
                                                        {format(new Date(row.request_date), 'dd MMM yyyy')}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs font-semibold text-slate-900 dark:text-[#EBE6DF]">
                                                        {row.document_number}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-medium text-slate-800 dark:text-[#EBE6DF]">
                                                                [{row.requesting_outlet}] {row.requesting_outlet_name || '-'}
                                                            </span>
                                                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                            <span className="font-medium text-slate-800 dark:text-[#EBE6DF]">
                                                                [{row.target_outlet}] {row.target_outlet_name || '-'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600 dark:text-[#A6A095] max-w-md">
                                                        {row.items_summary}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono text-xs font-bold text-[#889D35]">
                                                        {row.total_qty_requested}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {getStatusBadge(row.status)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {row.linked_sto_number ? (
                                                            <Badge variant="outline" className="font-mono text-xs border-[#889D35]/50 text-[#889D35]">
                                                                {row.linked_sto_number}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">-</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-slate-50/80 dark:bg-[#191914]/80">
                                        <TableRow className="border-b border-slate-200 dark:border-[#38382E]">
                                            <TableHead className="text-xs dark:text-[#EBE6DF]">Tanggal</TableHead>
                                            <TableHead className="text-xs dark:text-[#EBE6DF]">No. Request</TableHead>
                                            <TableHead className="text-xs dark:text-[#EBE6DF]">Pemohon $\to$ Tujuan</TableHead>
                                            <TableHead className="text-xs dark:text-[#EBE6DF]">SKU</TableHead>
                                            <TableHead className="text-xs dark:text-[#EBE6DF]">Nama Barang</TableHead>
                                            <TableHead className="text-xs text-right dark:text-[#EBE6DF]">Qty Diminta</TableHead>
                                            <TableHead className="text-xs text-center dark:text-[#EBE6DF]">Satuan</TableHead>
                                            <TableHead className="text-xs text-center dark:text-[#EBE6DF]">Status</TableHead>
                                            <TableHead className="text-xs text-center dark:text-[#EBE6DF]">No. STO</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-32 text-center text-slate-500 dark:text-[#A6A095]">
                                                    <Loader2 className="w-5 h-5 animate-spin text-[#889D35] mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredItems.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-28 text-center text-slate-500 dark:text-[#A6A095] text-sm">
                                                    Tidak ada data rincian barang Request STO pada periode ini.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredItems.map(item => (
                                                <TableRow
                                                    key={item.id}
                                                    className="border-b border-slate-100 dark:border-[#38382E]/60 hover:bg-slate-50/60 dark:hover:bg-[#191914]/40"
                                                >
                                                    <TableCell className="text-xs text-slate-600 dark:text-[#A6A095] whitespace-nowrap">
                                                        {format(new Date(item.request_date), 'dd MMM yyyy')}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs font-semibold text-slate-900 dark:text-[#EBE6DF]">
                                                        {item.document_number}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="flex items-center gap-1">
                                                            <span>{item.requesting_outlet_name || item.requesting_outlet}</span>
                                                            <ArrowRight className="w-3 h-3 text-slate-400" />
                                                            <span>{item.target_outlet_name || item.target_outlet}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-slate-500 dark:text-[#A6A095]">
                                                        {item.sku || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-900 dark:text-[#EBE6DF]">
                                                        {item.item_name || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-right font-mono font-bold text-[#889D35]">
                                                        {item.qty_requested}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-center font-mono text-slate-500 dark:text-[#A6A095]">
                                                        {item.uom}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {getStatusBadge(item.status)}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono text-xs text-[#889D35]">
                                                        {item.linked_sto_number || '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
export default ReportStoRequestPage

