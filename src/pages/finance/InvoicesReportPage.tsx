import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { useAuthUser } from '@/hooks/useAuth'
import { getInvoicesReport } from '@/services/invoiceService'
import { masterOutletService } from '@/services/masterOutletService'
import { ViewReportPurchaseInvoices, MasterOutlet } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import { printReportA4 } from '@/utils/reportPrintUtils'
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
import { Printer, FileText, Search, CreditCard, Filter, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function InvoicesReportPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<ViewReportPurchaseInvoices[]>([])
    const [originalData, setOriginalData] = useState<ViewReportPurchaseInvoices[]>([]) // For client-side search
    const [loading, setLoading] = useState(true)

    // Filters
    // Default dates: Start of month to Today
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)

    // Format as yyyy-MM-dd for HTML input
    const formatDateInput = (d: Date) => d.toISOString().split('T')[0]

    const [startDate, setStartDate] = useState<string>(formatDateInput(firstDay))
    const [endDate, setEndDate] = useState<string>(formatDateInput(today))
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [selectedOutlet, setSelectedOutlet] = useState<string>('ALL')
    const [outlets, setOutlets] = useState<MasterOutlet[]>([])

    // Roles who can see ALL outlets: 5, 8, 13, 14
    const canSeeAllOutlets = [5, 8, 13, 14].includes(Number(user?.user_role))

    useEffect(() => {
        if (canSeeAllOutlets) {
            masterOutletService.getAllWhOutlet().then(setOutlets).catch(console.error)
        }
    }, [canSeeAllOutlets])

    useEffect(() => {
        if (user) {
            // Initialize outlet filter for regular users
            if (!canSeeAllOutlets && user.kode_outlet) {
                setSelectedOutlet(user.kode_outlet)
            }
        }
    }, [user, canSeeAllOutlets])

    useEffect(() => {
        if (user) {
            fetchData()
        }
    }, [user, startDate, endDate, selectedOutlet])

    // Client-side search and status filter effect
    useEffect(() => {
        let filtered = [...originalData]

        // Status Filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(item => item.status === statusFilter)
        }

        // Search Filter (Invoice No, Supplier, PO No)
        if (searchTerm) {
            const lowerInfo = searchTerm.toLowerCase()
            filtered = filtered.filter(item =>
                item.invoice_doc.toLowerCase().includes(lowerInfo) ||
                item.supplier_name.toLowerCase().includes(lowerInfo) ||
                (item.po_doc && item.po_doc.toLowerCase().includes(lowerInfo)) ||
                (item.supplier_invoice_number && item.supplier_invoice_number.toLowerCase().includes(lowerInfo))
            )
        }

        setData(filtered)
    }, [searchTerm, statusFilter, originalData])

    const fetchData = async () => {
        setLoading(true)
        try {
            // Determine outlet code to send
            let outletFilter = selectedOutlet
            // Safety: If not privileged, force their own outlet
            if (!canSeeAllOutlets && user?.kode_outlet) {
                outletFilter = user.kode_outlet
            }

            const res = await getInvoicesReport(outletFilter, startDate || undefined, endDate || undefined)

            if (res.isSuccess && res.data) {
                setOriginalData(res.data)
                setData(res.data)
            } else {
                toast.error(res.error || 'Gagal memuat laporan faktur pembelian')
            }
        } catch (error: any) {
            console.error('Error:', error)
            toast.error('Terjadi kesalahan yang tidak terduga')
        } finally {
            setLoading(false)
        }
    }

    const getTotalAmount = () => {
        return data.reduce((sum, item) => sum + (item.total_amount || 0), 0)
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PAID': return 'Lunas (PAID)'
            case 'UNPAID': return 'Belum Lunas (UNPAID)'
            case 'PARTIAL': return 'Dibayar Sebagian (PARTIAL)'
            case 'CANCELLED': return 'Dibatalkan (CANCELLED)'
            default: return 'Semua Status'
        }
    }

    const exportToCSV = () => {
        if (data.length === 0) {
            toast.error("Tidak ada data untuk diekspor")
            return
        }

        // Define headers
        const headers = [
            "Tanggal",
            "No. Faktur",
            "No. Faktur Supplier",
            "Pemasok (Supplier)",
            "No. PO / STO",
            "Outlet",
            "Jatuh Tempo",
            "Status",
            "Total Tagihan"
        ]

        // Map data to CSV rows
        const csvRows = data.map(item => [
            formatDate(item.invoice_date),
            `"${item.invoice_doc}"`, // Quote to handle potential commas
            `"${item.supplier_invoice_number || ''}"`,
            `"${item.supplier_name}"`,
            `"${item.po_doc || ''}"`,
            `"${item.kode_outlet || ''}"`,
            item.payment_due_date ? formatDate(item.payment_due_date) : '',
            item.status,
            item.total_amount
        ])

        // Combine headers and rows
        const csvContent = [
            headers.join(","),
            ...csvRows.map(row => row.join(","))
        ].join("\n")

        // Create download link
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `Laporan_Faktur_Pembelian_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handlePrintReport = async () => {
        if (data.length === 0) {
            toast.error('Tidak ada data untuk dicetak')
            return
        }

        await printReportA4({
            title: 'Laporan Faktur Pembelian',
            subtitle: 'Pantau, lacak, dan cetak riwayat faktur pembelian Anda.',
            canSelectOutlet: canSeeAllOutlets,
            selectedOutlet,
            userOutletCode: user?.kode_outlet,
            availableOutlets: outlets,
            startDate,
            endDate,
            statusLabel: statusFilter === 'all' ? 'Semua Status' : getStatusLabel(statusFilter),
            extraFilters: searchTerm ? [{ label: 'Pencarian', value: searchTerm }] : [],
            summaryItems: [
                { label: 'Total Faktur', value: `${data.length} Dokumen` },
                { label: 'Total Nilai Faktur', value: formatCurrency(getTotalAmount()) },
            ],
            columns: [
                { header: 'Tanggal', width: '11%' },
                { header: 'Outlet', width: '9%' },
                { header: 'No. Faktur', width: '16%' },
                { header: 'Ref. Supplier', width: '13%' },
                { header: 'Pemasok (Supplier)', width: '18%' },
                { header: 'No. PO / STO', width: '13%' },
                { header: 'Status', align: 'center', width: '8%' },
                { header: 'Total Tagihan', align: 'right', width: '12%' },
            ],
            rows: data.map((row) => [
                formatDate(row.invoice_date),
                row.kode_outlet || '-',
                row.invoice_doc,
                row.supplier_invoice_number || '-',
                row.supplier_name,
                row.po_doc || '-',
                row.status,
                formatCurrency(row.total_amount),
            ]),
            totalRow: ['', '', '', '', '', '', 'TOTAL', formatCurrency(getTotalAmount())],
        })
    }

    // Status Badge Helpers
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
            case 'PARTIAL': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'UNPAID': return 'bg-amber-100 text-amber-800 border-amber-200'
            case 'CANCELLED': return 'bg-slate-100 text-slate-600 border-slate-200'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Laporan Faktur Pembelian</h1>
                        <p className="text-slate-500">
                            Pantau, lacak, dan cetak riwayat faktur pembelian Anda.
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
                            onClick={exportToCSV}
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
                            <Filter className="h-4 w-4 text-indigo-500" />
                            Filter & Pencarian
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="start-date">Tanggal Mulai</Label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="border-slate-300 focus:border-indigo-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-date">Tanggal Akhir</Label>
                                <Input
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="border-slate-300 focus:border-indigo-500"
                                />
                            </div>

                            {/* Outlet Filter for privileged roles */}
                            {canSeeAllOutlets && (
                                <div className="space-y-2">
                                    <Label>Outlet</Label>
                                    <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                        <SelectTrigger className="border-slate-300">
                                            <SelectValue placeholder="Semua Outlet" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Semua Outlet (ALL OUTLET)</SelectItem>
                                            {outlets.map((outlet) => (
                                                <SelectItem key={outlet.kode_outlet} value={outlet.kode_outlet}>
                                                    {outlet.name_outlet} ({outlet.kode_outlet})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="status-filter">Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger id="status-filter" className="border-slate-300">
                                        <SelectValue placeholder="Semua Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Status</SelectItem>
                                        <SelectItem value="PAID">Lunas (PAID)</SelectItem>
                                        <SelectItem value="UNPAID">Belum Lunas (UNPAID)</SelectItem>
                                        <SelectItem value="PARTIAL">Dibayar Sebagian (PARTIAL)</SelectItem>
                                        <SelectItem value="CANCELLED">Dibatalkan (CANCELLED)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="mt-4">
                            <Label htmlFor="search" className="mb-2 block">Pencarian</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    id="search"
                                    placeholder="Cari nomor faktur, pemasok, atau nomor PO..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 border-slate-300 focus:border-indigo-500 w-full md:w-1/2"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-indigo-50 border-indigo-100 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-indigo-600">Total Faktur</p>
                                    <h3 className="text-2xl font-bold text-indigo-900">{data.length}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                                    <CreditCard className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-emerald-600">Total Nilai Faktur</p>
                                    <h3 className="text-2xl font-bold text-emerald-900">{formatCurrency(getTotalAmount())}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Data Table */}
                <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/80">
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Outlet</TableHead>
                                <TableHead>No. Faktur</TableHead>
                                <TableHead>Pemasok (Supplier)</TableHead>
                                <TableHead>No. PO / STO</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total Tagihan</TableHead>
                                <TableHead className="text-center w-[180px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                            <span className="text-slate-500">Memuat data laporan...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                                        Tidak ada faktur pembelian yang sesuai dengan kriteria filter.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row) => (
                                    <TableRow key={row.invoice_id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium text-slate-600">
                                            {formatDate(row.invoice_date)}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500">
                                            {row.kode_outlet}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-slate-500">
                                            {row.invoice_doc}
                                            {row.supplier_invoice_number && (
                                                <div className="text-[10px] text-slate-400 mt-0.5">Ref: {row.supplier_invoice_number}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-700">
                                            {row.supplier_name}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-slate-500">
                                            {row.sto_id ? (
                                                <span>{row.po_doc}</span>
                                            ) : (
                                                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
                                                    const url = `/procurement/purchase-orders/${row.purchase_order_id}/print`
                                                    window.open(url, '_blank')
                                                }}>
                                                    <span>{row.po_doc}</span>
                                                    <FileText className="h-3 w-3 text-slate-400 group-hover:text-indigo-600" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(row.status)}`}>
                                                {row.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-slate-700">
                                            {formatCurrency(row.total_amount)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={!!row.sto_id}
                                                    title={row.sto_id ? "Cetak tidak tersedia untuk STO" : "Cetak Faktur"}
                                                    className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    onClick={() => {
                                                        if (row.sto_id) {
                                                            return
                                                        } else {
                                                            const url = `/finance/invoices/print/${row.invoice_id}`
                                                            window.open(url, '_blank')
                                                        }
                                                    }}
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>

                                                {/* View PO / STO Action */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title={row.sto_id ? "Lihat Laporan STO" : "Lihat / Cetak PO"}
                                                    className="h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                                                    disabled={!row.purchase_order_id && !row.sto_id}
                                                    onClick={() => {
                                                        if (row.sto_id) {
                                                            window.open('/sto/report-order', '_blank')
                                                        } else if (row.purchase_order_id) {
                                                            const url = `/procurement/purchase-orders/${row.purchase_order_id}/print`
                                                            window.open(url, '_blank')
                                                        }
                                                    }}
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="text-center text-xs text-slate-400 mt-4">
                    Menampilkan {data.length} data.
                    {canSeeAllOutlets && " Mode Tampilan Admin Aktif."}
                </div>
            </div>
        </DashboardLayout>
    )
}
