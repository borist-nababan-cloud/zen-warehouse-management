import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { useAuthUser } from '@/hooks/useAuth'
import { reportService } from '@/services/reportService'
import { ViewReportPurchaseOrders } from '@/types/database'
import { masterOutletService } from '@/services/masterOutletService'
import { formatCurrencyAuto, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Printer, FileText, Search, TrendingUp, Filter, Wallet, Store, Download, Image as ImageIcon, RotateCcw, History, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { printReportA4 } from '@/utils/reportPrintUtils'
import { PurchaseReturnModal } from '@/components/procurement/PurchaseReturnModal'
import { purchaseReturnService, type PoReturnHistoryItem } from '@/services/purchaseReturnService'
import {
    TransactionImageGalleryDialog,
    normalizeViewReceiptImages,
    type GalleryImageItem,
} from '@/components/common/TransactionImageGalleryDialog'

export default function PoReportPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<ViewReportPurchaseOrders[]>([])
    const [originalData, setOriginalData] = useState<ViewReportPurchaseOrders[]>([])
    const [loading, setLoading] = useState(true)
    const [galleryModal, setGalleryModal] = useState<{ title: string; images: GalleryImageItem[] } | null>(null)
    const [returnTargetPoId, setReturnTargetPoId] = useState<string | null>(null)
    const [historyTargetPo, setHistoryTargetPo] = useState<{ poId: string; poDocNo: string } | null>(null)
    const [historyLoading, setHistoryLoading] = useState(false)
    const [historyRows, setHistoryRows] = useState<PoReturnHistoryItem[]>([])

    const canCancelOrReturnPo = [5, 6, 8, 10, 14].includes(Number(user?.user_role || 0))

    // Filter States
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')

    // Initialize Default Dates
    useEffect(() => {
        const today = new Date()
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'))
        setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'))
    }, [])
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    // Outlet Logic
    const [selectedOutlet, setSelectedOutlet] = useState<string>('')
    const [availableOutlets, setAvailableOutlets] = useState<{ kode_outlet: string, name_outlet: string }[]>([])
    const canSelectOutlet = user?.user_role === 5 || user?.user_role === 8

    useEffect(() => {
        if (!canSelectOutlet && user?.kode_outlet) {
            setSelectedOutlet(user.kode_outlet)
        } else if (canSelectOutlet) {
            setSelectedOutlet('ALL')
        }
    }, [user, canSelectOutlet])

    useEffect(() => {
        if (canSelectOutlet) {
            masterOutletService.getAllWhOutlet()
                .then(setAvailableOutlets)
                .catch(err => console.error(err))
        }
    }, [canSelectOutlet])

    // Data Fetching Trigger
    useEffect(() => {
        if (selectedOutlet) {
            fetchData()
        }
    }, [selectedOutlet, startDate, endDate])

    useEffect(() => {
        let filtered = [...originalData]

        if (statusFilter !== 'all') {
            filtered = filtered.filter(item => item.status === statusFilter)
        }

        if (searchTerm) {
            const lowerInfo = searchTerm.toLowerCase()
            filtered = filtered.filter(item =>
                (item.po_doc_number || item.document_number || '').toLowerCase().includes(lowerInfo) ||
                (item.supplier_name || '').toLowerCase().includes(lowerInfo)
            )
        }

        setData(filtered)
    }, [searchTerm, statusFilter, originalData])

    const fetchData = async () => {
        if (!selectedOutlet) return

        setLoading(true)
        try {
            const res = await reportService.getPoReport(selectedOutlet, startDate || undefined, endDate || undefined)

            if (res.isSuccess && res.data) {
                setOriginalData(res.data)
                setData(res.data)
            } else {
                toast.error(res.error || 'Gagal memuat laporan pesanan pembelian')
            }
        } catch (error) {
            console.error('Error:', error)
            toast.error('Terjadi kesalahan saat memuat data laporan')
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
            case 'PAID': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
            case 'INVOICED': return 'bg-indigo-100 text-indigo-800 border-indigo-200'
            case 'ISSUED': return 'bg-amber-100 text-amber-800 border-amber-200'
            case 'PARTIAL': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'RETURNED': return 'bg-rose-100 text-rose-800 border-rose-200'
            case 'CANCELLED': return 'bg-slate-100 text-slate-600 border-slate-200'
            case 'DRAFT': return 'bg-gray-100 text-gray-600 border-gray-200'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const handleOpenHistory = async (poId: string, poDocNo: string) => {
        setHistoryTargetPo({ poId, poDocNo })
        setHistoryLoading(true)
        setHistoryRows([])
        try {
            const preview = await purchaseReturnService.getReturnPreview(poId)
            setHistoryRows(preview.history || [])
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Gagal memuat riwayat retur PO.'
            toast.error(msg)
        } finally {
            setHistoryLoading(false)
        }
    }

    const handleExportCsv = () => {
        if (data.length === 0) {
            toast.error('Tidak ada data untuk diekspor')
            return
        }

        const headers = ['Tanggal', 'Outlet', 'No. PO', 'Pemasok (Supplier)', 'Status', 'Estimasi Kirim', 'Total Keseluruhan']
        const csvRows = [headers.join(',')]

        data.forEach(row => {
            const docNo = row.po_doc_number || row.document_number || ''
            const values = [
                formatDate(row.po_date),
                `"${row.kode_outlet}"`,
                `"${docNo}"`,
                `"${row.supplier_name}"`,
                row.status,
                formatDate(row.expected_delivery_date),
                row.grand_total
            ]
            csvRows.push(values.join(','))
        })

        const csvContent = csvRows.join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Laporan_PO_${startDate}_${endDate}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }

    const totalValue = data.reduce((acc, curr) => acc + (curr.grand_total || 0), 0)
    const totalReturnedValue = data.reduce((acc, curr) => acc + Number(curr.total_returned_amount || 0), 0)

    const handlePrintReport = async () => {
        if (data.length === 0) {
            toast.error('Tidak ada data untuk dicetak')
            return
        }

        await printReportA4({
            title: 'Laporan Pesanan Pembelian (PO)',
            subtitle: 'Catatan historis seluruh Pesanan Pembelian (PO) beserta statusnya.',
            canSelectOutlet,
            selectedOutlet,
            userOutletCode: user?.kode_outlet,
            availableOutlets,
            startDate,
            endDate,
            statusLabel: statusFilter === 'all' ? 'Semua Status' : statusFilter,
            extraFilters: searchTerm ? [{ label: 'Pencarian', value: searchTerm }] : [],
            summaryItems: [
                { label: 'Total Dokumen PO', value: `${data.length} Dokumen` },
                { label: 'Total Nilai PO', value: formatCurrencyAuto(totalValue) },
            ],
            columns: [
                { header: 'Tanggal', width: '75px' },
                { header: 'Outlet', width: '55px' },
                { header: 'No. PO', width: '125px' },
                { header: 'Pemasok (Supplier)' },
                { header: 'Status', width: '85px' },
                { header: 'Est. Kirim', width: '80px' },
                { header: 'Total', align: 'right', width: '105px' },
            ],
            rows: data.map((row) => [
                formatDate(row.po_date),
                row.kode_outlet,
                row.po_doc_number || row.document_number || '-',
                row.supplier_name || '-',
                row.status,
                formatDate(row.expected_delivery_date),
                formatCurrencyAuto(Number(row.grand_total || 0)),
            ]),
            totalRow: ['TOTAL', '', '', '', '', `${data.length} PO`, formatCurrencyAuto(totalValue)],
        })
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Laporan Pesanan Pembelian (PO)</h1>
                        <p className="text-slate-500">
                            Catatan historis seluruh Pesanan Pembelian (PO) beserta statusnya.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handlePrintReport}
                            disabled={loading || data.length === 0}
                            variant="outline"
                            className="gap-2 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        >
                            <Printer className="h-4 w-4" />
                            Cetak
                        </Button>
                        <Button
                            onClick={handleExportCsv}
                            disabled={loading || data.length === 0}
                            variant="outline"
                            className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                            <Download className="h-4 w-4" />
                            Ekspor CSV
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card className="bg-white shadow-sm border-slate-200">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                            <Filter className="h-4 w-4 text-emerald-500" />
                            Filter & Pencarian
                        </CardTitle>
                        <Button variant="outline" size="sm" className="ml-auto" onClick={handleExportCsv}>
                            <Download className="mr-2 h-4 w-4" />
                            Ekspor CSV
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start-date">Tanggal Mulai</Label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="border-slate-300 focus:border-emerald-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-date">Tanggal Akhir</Label>
                                <Input
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="border-slate-300 focus:border-emerald-500"
                                />
                            </div>

                            {/* Outlet Filter for Role 5 & 8 */}
                            {canSelectOutlet && (
                                <div className="space-y-2">
                                    <Label>Outlet</Label>
                                    <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                        <SelectTrigger className="w-full bg-white border-slate-300">
                                            <div className="flex items-center gap-2">
                                                <Store className="h-4 w-4 text-muted-foreground" />
                                                <SelectValue placeholder="Pilih Outlet" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">SEMUA OUTLET</SelectItem>
                                            {availableOutlets.map((outlet) => (
                                                <SelectItem key={outlet.kode_outlet} value={outlet.kode_outlet}>
                                                    {outlet.name_outlet}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="search">Pencarian</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="search"
                                        placeholder="Cari No. PO atau Nama Pemasok..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 border-slate-300 focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status-filter">Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger id="status-filter" className="border-slate-300">
                                        <SelectValue placeholder="Semua Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Status</SelectItem>
                                        <SelectItem value="ISSUED">Diterbitkan (ISSUED)</SelectItem>
                                        <SelectItem value="PARTIAL">Diterima Sebagian (PARTIAL)</SelectItem>
                                        <SelectItem value="COMPLETED">Selesai (COMPLETED)</SelectItem>
                                        <SelectItem value="INVOICED">Sudah Difaktur (INVOICED)</SelectItem>
                                        <SelectItem value="PAID">Lunas (PAID)</SelectItem>
                                        <SelectItem value="RETURNED">Diretur (RETURNED)</SelectItem>
                                        <SelectItem value="CANCELLED">Dibatalkan (CANCELLED)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                                    <TrendingUp className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-emerald-600">Total Pesanan</p>
                                    <h3 className="text-2xl font-bold text-emerald-900">{data.length}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-blue-100 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                                    <Wallet className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-blue-600">Total Nilai Pesanan</p>
                                    <h3 className="text-2xl font-bold text-blue-900">{formatCurrencyAuto(totalValue)}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-rose-50 border-rose-100 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-rose-100 rounded-full text-rose-600">
                                    <RotateCcw className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-rose-600">Total Nilai Retur</p>
                                    <h3 className="text-2xl font-bold text-rose-900">{formatCurrencyAuto(totalReturnedValue)}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Table */}
                <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/80">
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                {canSelectOutlet && selectedOutlet === 'ALL' && (
                                    <TableHead>Outlet</TableHead>
                                )}
                                <TableHead>No. PO</TableHead>
                                <TableHead>Pemasok (Supplier)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Estimasi Kirim</TableHead>
                                <TableHead className="text-right">Total Keseluruhan</TableHead>
                                <TableHead className="text-center w-[260px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">Memuat data laporan...</TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                                        Tidak ada data pesanan pembelian yang ditemukan.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row) => {
                                    const poDocNo = row.po_doc_number || row.document_number || '-'
                                    const hasPaidInvoice =
                                        row.status === 'PAID' ||
                                        row.invoice_status === 'PAID' ||
                                        row.invoice_status === 'PARTIAL' ||
                                        Number(row.invoice_paid_amount || 0) > 0
                                    const canReturnStatus =
                                        row.status === 'ISSUED' ||
                                        row.status === 'PARTIAL' ||
                                        row.status === 'COMPLETED' ||
                                        (row.status === 'INVOICED' && !hasPaidInvoice)
                                    const cancelDisabledTitle = hasPaidInvoice
                                        ? 'PO/faktur yang sudah dibayar (PAID/PARTIAL) tidak dapat dibatalkan atau diretur'
                                        : row.status === 'CANCELLED' || row.status === 'RETURNED'
                                          ? `PO sudah berstatus ${row.status}`
                                          : row.status === 'DRAFT'
                                            ? 'PO berstatus DRAFT belum dikirim ke supplier'
                                            : 'Batal / Retur PO'

                                    const imgs = normalizeViewReceiptImages(
                                        row.receipt_images,
                                        row.receipt_image_url,
                                        poDocNo
                                    )
                                    return (
                                        <TableRow key={row.po_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                            <TableCell className="font-medium text-slate-600 dark:text-slate-300">
                                                {formatDate(row.po_date)}
                                            </TableCell>
                                            {canSelectOutlet && selectedOutlet === 'ALL' && (
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {availableOutlets.find(o => o.kode_outlet === row.kode_outlet)?.name_outlet || row.kode_outlet}
                                                </TableCell>
                                            )}
                                            <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                                {poDocNo}
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                                                {row.supplier_name}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(row.status)}`}>
                                                        {row.status}
                                                    </span>
                                                    {(row.return_count || 0) > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenHistory(row.po_id, poDocNo)}
                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800 text-[10px] font-medium transition-colors"
                                                            title="Lihat riwayat retur & nota debet"
                                                        >
                                                            <History className="h-2.5 w-2.5" />
                                                            Retur {row.return_count}x
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                                                {formatDate(row.expected_delivery_date)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-slate-700 dark:text-slate-200">
                                                {formatCurrencyAuto(row.grand_total)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* Print PO */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        title="Cetak PO"
                                                        className="flex flex-col h-auto py-1 px-2 gap-0.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                                                        onClick={() => {
                                                            const url = `/procurement/purchase-orders/${row.po_id}/print`
                                                            window.open(url, '_blank')
                                                        }}
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                        <span className="text-[10px] leading-tight font-medium">Cetak</span>
                                                    </Button>

                                                    {/* View Goods Receipt Photos (All GRs for this PO) */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={imgs.length === 0}
                                                        title={
                                                            imgs.length > 0
                                                                ? `Lihat ${imgs.length} Foto Penerimaan Barang`
                                                                : 'Tidak ada foto bukti penerimaan'
                                                        }
                                                        className={`flex flex-col h-auto py-1 px-2 gap-0.5 ${
                                                            imgs.length > 0
                                                                ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50'
                                                                : 'text-slate-300 dark:text-slate-600'
                                                        }`}
                                                        onClick={() => {
                                                            if (imgs.length === 0) return
                                                            setGalleryModal({
                                                                title: `Bukti Penerimaan PO: ${poDocNo}`,
                                                                images: imgs,
                                                            })
                                                        }}
                                                    >
                                                        <ImageIcon className="h-4 w-4" />
                                                        <span className="text-[10px] leading-tight font-medium">
                                                            {imgs.length > 0 ? `Foto GR (${imgs.length})` : 'Foto GR'}
                                                        </span>
                                                    </Button>

                                                    {/* Print Invoice */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={!row.linked_invoice_id}
                                                        title={row.linked_invoice_id ? 'Lihat Faktur Terkait' : 'Belum ada faktur pembelian'}
                                                        className={`flex flex-col h-auto py-1 px-2 gap-0.5 ${
                                                            row.linked_invoice_id
                                                                ? 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50'
                                                                : 'text-slate-300 dark:text-slate-600'
                                                        }`}
                                                        onClick={() => {
                                                            if (!row.linked_invoice_id) return
                                                            const url = `/finance/invoices/print/${row.linked_invoice_id}`
                                                            window.open(url, '_blank')
                                                        }}
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                        <span className="text-[10px] leading-tight font-medium">Faktur</span>
                                                    </Button>

                                                    {/* Cancel / Return PO */}
                                                    {canCancelOrReturnPo && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={!canReturnStatus}
                                                            title={cancelDisabledTitle}
                                                            className={`flex flex-col h-auto py-1 px-2 gap-0.5 ${
                                                                canReturnStatus
                                                                    ? 'text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50'
                                                                    : 'text-slate-300 dark:text-slate-600'
                                                            }`}
                                                            onClick={() => {
                                                                if (!canReturnStatus) return
                                                                setReturnTargetPoId(row.po_id)
                                                            }}
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                            <span className="text-[10px] leading-tight font-medium">Batal PO</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="text-center text-xs text-slate-400 mt-4">
                    Menampilkan {data.length} data
                </div>
            </div>

            {/* Goods Receipt Multi-Photo Gallery Dialog */}
            <TransactionImageGalleryDialog
                open={!!galleryModal}
                onOpenChange={(open) => !open && setGalleryModal(null)}
                title={galleryModal?.title || 'Bukti Foto Penerimaan'}
                images={galleryModal?.images || []}
            />

            {/* Cancel / Return PO Modal */}
            <PurchaseReturnModal
                poId={returnTargetPoId}
                open={!!returnTargetPoId}
                onOpenChange={(open) => !open && setReturnTargetPoId(null)}
                onSuccess={fetchData}
            />

            {/* Return History & Debit Note Dialog */}
            <Dialog open={!!historyTargetPo} onOpenChange={(open) => !open && setHistoryTargetPo(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5 text-rose-600" />
                            Riwayat Retur PO: {historyTargetPo?.poDocNo}
                        </DialogTitle>
                        <DialogDescription>
                            Daftar dokumen retur pembelian, rincian item yang dikembalikan, dan tautan cetak Nota Debet terkait.
                        </DialogDescription>
                    </DialogHeader>
                    {historyLoading ? (
                        <div className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Memuat riwayat retur...
                        </div>
                    ) : historyRows.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            Belum ada dokumen retur pasca-penerimaan untuk PO ini.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {historyRows.map((ret) => (
                                <div
                                    key={ret.id}
                                    className="rounded-lg border bg-card p-4 space-y-3"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-semibold">
                                                    {ret.document_number}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                                                    {ret.return_type === 'FULL_RETURN' ? 'Retur Penuh' : 'Retur Sebagian'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Oleh {ret.created_by_name || '-'} • {formatDate(ret.created_at)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                                                -{formatCurrencyAuto(ret.total_return_amount)}
                                            </p>
                                            {Number(ret.shipping_deduction || 0) > 0 && (
                                                <p className="text-[11px] text-muted-foreground">
                                                    Termasuk potongan ongkir: -{formatCurrencyAuto(ret.shipping_deduction)}
                                                </p>
                                            )}
                                            {Number(ret.other_cost_deduction || 0) !== 0 && (
                                                <p className="text-[11px] text-muted-foreground">
                                                    Penyesuaian biaya lain-lain: {formatCurrencyAuto(-Number(ret.other_cost_deduction))}
                                                </p>
                                            )}
                                            {ret.deduction_invoice_id && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-1 h-7 text-xs gap-1"
                                                    onClick={() => window.open(`/finance/invoices/print/${ret.deduction_invoice_id}`, '_blank')}
                                                >
                                                    <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                                    Cetak Nota Debet ({ret.deduction_invoice_doc || 'DN'})
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-xs bg-muted/50 rounded p-2">
                                        <span className="font-semibold">Alasan: </span>
                                        <span>{ret.reason}</span>
                                    </div>

                                    {ret.items && ret.items.length > 0 && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b text-muted-foreground">
                                                        <th className="py-1.5 text-left font-medium">Barang</th>
                                                        <th className="py-1.5 text-right font-medium">Qty Retur</th>
                                                        <th className="py-1.5 text-right font-medium">Harga Satuan</th>
                                                        <th className="py-1.5 text-right font-medium">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {ret.items.map((item, idx) => (
                                                        <tr key={`${ret.id}-${item.barang_id}-${idx}`} className="border-b last:border-0">
                                                            <td className="py-1.5">
                                                                <span className="font-medium">{item.item_name}</span>
                                                                {item.sku && (
                                                                    <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                                                                        ({item.sku})
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-1.5 text-right">
                                                                {item.qty_returned} {item.uom_purchase}
                                                            </td>
                                                            <td className="py-1.5 text-right">
                                                                {formatCurrencyAuto(item.price_per_unit)}
                                                            </td>
                                                            <td className="py-1.5 text-right font-medium text-rose-600 dark:text-rose-400">
                                                                -{formatCurrencyAuto(item.subtotal)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="secondary" size="sm" onClick={() => setHistoryTargetPo(null)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    )
}
