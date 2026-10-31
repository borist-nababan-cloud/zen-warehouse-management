import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { stoArService, StoArReportItem } from '@/services/stoArService'
import { masterOutletService } from '@/services/masterOutletService'
import { MasterOutlet } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { printReportA4 } from '@/utils/reportPrintUtils'
import { Loader2, Download, Printer, Filter, Store } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/layout/Sidebar'

// Helper to format date
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

export default function StoArReportPage() {
    const { user } = useAuthUser()

    const [items, setItems] = useState<StoArReportItem[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedOutlet, setSelectedOutlet] = useState<string>('')
    const [availableOutlets, setAvailableOutlets] = useState<MasterOutlet[]>([])

    const canSelectOutlet = [5, 8, 13, 14].includes(Number(user?.user_role))

    // Filters - Default to Start of Previous Month to catch recent history
    const [startDate, setStartDate] = useState<string>(() => {
        const date = new Date()
        date.setMonth(date.getMonth() - 1) // Go back 1 month
        date.setDate(1) // Set to 1st
        return date.toISOString().split('T')[0]
    })

    const [endDate, setEndDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    )
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'WAITING' | 'COMPLETED'>('ALL')

    useEffect(() => {
        if (!canSelectOutlet && user?.kode_outlet) {
            setSelectedOutlet(user.kode_outlet)
        } else if (canSelectOutlet) {
            setSelectedOutlet('ALL')
        }
    }, [user, canSelectOutlet])

    useEffect(() => {
        if (canSelectOutlet) {
            masterOutletService
                .getAllWhOutlet()
                .then(setAvailableOutlets)
                .catch((err) => console.error(err))
        }
    }, [canSelectOutlet])

    const fetchData = async (overrideOutlet?: string) => {
        const activeOutlet = overrideOutlet ?? (canSelectOutlet ? selectedOutlet : user?.kode_outlet)
        if (!activeOutlet) {
            return
        }

        setLoading(true)
        try {
            const data = await stoArService.getArReport({
                outlet_code: activeOutlet,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                status: statusFilter
            })
            setItems(data || [])
        } catch (err: any) {
            toast.error(err.message || 'Gagal memuat laporan piutang STO')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user && selectedOutlet) {
            fetchData(selectedOutlet)
        }
    }, [user?.kode_outlet, selectedOutlet])

    // Calculate Metrics
    const totalReceivables = items
        .filter(i => i.settlement_status === 'UNCLAIMED') // Both Unpaid and Paid-but-Unclaimed
        .reduce((sum, item) => sum + item.total_amount, 0)

    const actionableCash = items
        .filter(i => i.payment_status === 'PAID' && i.settlement_status === 'UNCLAIMED')
        .reduce((sum, item) => sum + item.total_amount, 0)

    const totalAllAmount = items.reduce((sum, item) => sum + (item.total_amount || 0), 0)

    const getStatusText = (item: StoArReportItem) => {
        if (item.settlement_status === 'RECEIVED') {
            return 'SELESAI (COMPLETED)'
        }
        if (item.payment_status === 'PAID' && item.settlement_status === 'UNCLAIMED') {
            return 'MENUNGGU KLAIM (WAITING)'
        }
        return 'BELUM LUNAS (UNPAID)'
    }

    const getStatusFilterLabel = (status: string) => {
        switch (status) {
            case 'UNPAID': return 'Belum Lunas (UNPAID)'
            case 'WAITING': return 'Menunggu Klaim (WAITING)'
            case 'COMPLETED': return 'Selesai (COMPLETED)'
            default: return 'Semua Status'
        }
    }

    // Export to CSV
    const handleExport = () => {
        if (items.length === 0) {
            toast.error('Tidak ada data untuk diekspor')
            return
        }

        const headers = ['Tanggal', 'No. Faktur', 'No. Dokumen STO', 'Kode Outlet Debitur', 'Nama Outlet Debitur', 'Jumlah Tagihan', 'Status Pembayaran', 'Status Penyelesaian']
        const csvContent = [
            headers.join(','),
            ...items.map(item => [
                item.invoice_date.split('T')[0],
                item.document_number,
                item.sto_doc_number,
                item.debtor_outlet_code,
                `"${item.debtor_outlet_name}"`,
                item.total_amount,
                item.payment_status,
                item.settlement_status
            ].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `Laporan_Piutang_STO_${startDate}_${endDate}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handlePrintReport = async () => {
        if (items.length === 0) {
            toast.error('Tidak ada data untuk dicetak')
            return
        }

        await printReportA4({
            title: 'Laporan Piutang STO (Accounts Receivable)',
            subtitle: 'Pantau pembayaran masuk dari pengiriman transfer stok antar outlet.',
            canSelectOutlet,
            selectedOutlet: selectedOutlet || user?.kode_outlet || 'ALL',
            userOutletCode: user?.kode_outlet,
            availableOutlets,
            startDate,
            endDate,
            statusLabel: getStatusFilterLabel(statusFilter),
            summaryItems: [
                { label: 'Total Piutang STO (Belum Klaim)', value: formatCurrency(totalReceivables) },
                { label: 'Dana Siap Klaim (Sudah Dibayar Outlet)', value: formatCurrency(actionableCash) },
                { label: 'Total Nilai Dokumen', value: formatCurrency(totalAllAmount) },
            ],
            columns: [
                { header: 'Tanggal', width: '13%' },
                { header: 'No. Faktur', width: '18%' },
                { header: 'No. Dokumen STO', width: '18%' },
                { header: 'Outlet Debitur', width: '24%' },
                { header: 'Jumlah Tagihan', align: 'right', width: '14%' },
                { header: 'Status', align: 'center', width: '13%' },
            ],
            rows: items.map((item) => [
                formatDate(item.invoice_date),
                item.document_number,
                item.sto_doc_number,
                `${item.debtor_outlet_name} (${item.debtor_outlet_code})`,
                formatCurrency(item.total_amount),
                getStatusText(item),
            ]),
            totalRow: ['', '', '', 'TOTAL KESELURUHAN', formatCurrency(totalAllAmount), ''],
        })
    }

    const getStatusBadge = (item: StoArReportItem) => {
        if (item.settlement_status === 'RECEIVED') {
            return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">SELESAI (COMPLETED)</Badge>
        }
        if (item.payment_status === 'PAID' && item.settlement_status === 'UNCLAIMED') {
            return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">MENUNGGU KLAIM</Badge>
        }
        return <Badge variant="outline" className="text-gray-500">BELUM LUNAS (UNPAID)</Badge>
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Laporan Piutang STO</h2>
                        <p className="text-muted-foreground">Pantau pembayaran masuk dari pengiriman transfer stok antar outlet.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handlePrintReport}
                            disabled={loading || items.length === 0}
                            className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        >
                            <Printer className="mr-2 h-4 w-4" />
                            Cetak
                        </Button>
                        <Button variant="outline" onClick={handleExport} disabled={loading || items.length === 0}>
                            <Download className="mr-2 h-4 w-4" />
                            Ekspor CSV
                        </Button>
                    </div>
                </div>

                {/* SUMMARY CARDS */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-indigo-50 border-indigo-100">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-indigo-900">Total Piutang STO</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-indigo-700">{formatCurrency(totalReceivables)}</div>
                            <p className="text-xs text-indigo-600">Belum Dibayar & Belum Diklaim</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-orange-50 border-orange-100">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-orange-900">Dana Siap Klaim</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-700">{formatCurrency(actionableCash)}</div>
                            <p className="text-xs text-orange-600">Sudah Dibayar Outlet, Menunggu Verifikasi</p>
                        </CardContent>
                    </Card>
                </div>

                {/* FILTERS */}
                <Card>
                    <CardContent className="pt-6">
                        <div className={`grid gap-4 ${canSelectOutlet ? 'md:grid-cols-5' : 'md:grid-cols-4'} items-end`}>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tanggal Mulai</label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tanggal Akhir</label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                            {canSelectOutlet && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Outlet</label>
                                    <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                        <SelectTrigger>
                                            <div className="flex items-center gap-2">
                                                <Store className="h-4 w-4 text-muted-foreground" />
                                                <SelectValue placeholder="Pilih Outlet" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Semua Outlet (ALL OUTLET)</SelectItem>
                                            {availableOutlets.map((outlet) => (
                                                <SelectItem key={outlet.kode_outlet} value={outlet.kode_outlet}>
                                                    {outlet.name_outlet} ({outlet.kode_outlet})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Semua Status</SelectItem>
                                        <SelectItem value="UNPAID">Belum Lunas (UNPAID)</SelectItem>
                                        <SelectItem value="WAITING">Menunggu Klaim (WAITING)</SelectItem>
                                        <SelectItem value="COMPLETED">Selesai (COMPLETED)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={() => fetchData()} disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
                                Terapkan Filter
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* DATA TABLE */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>No. Faktur</TableHead>
                                    <TableHead>No. Dokumen STO</TableHead>
                                    <TableHead>Outlet Debitur</TableHead>
                                    <TableHead className="text-right">Jumlah Tagihan</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                            Tidak ada data piutang STO untuk periode yang dipilih.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((item) => (
                                        <TableRow key={item.invoice_id}>
                                            <TableCell>{formatDate(item.invoice_date)}</TableCell>
                                            <TableCell className="font-medium">{item.document_number}</TableCell>
                                            <TableCell>{item.sto_doc_number}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{item.debtor_outlet_name}</span>
                                                    <span className="text-xs text-muted-foreground">{item.debtor_outlet_code}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.total_amount)}</TableCell>
                                            <TableCell className="text-center">
                                                {getStatusBadge(item)}
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
