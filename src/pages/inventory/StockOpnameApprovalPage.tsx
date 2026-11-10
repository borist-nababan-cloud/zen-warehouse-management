import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import {
    getStockOpnameBatches,
    getStockOpnameBatchDetail,
    approveStockOpnameBatch,
    rejectStockOpnameBatch,
    StockOpnameBatchRow,
} from '@/services/inventoryService'
import { masterOutletService } from '@/services/masterOutletService'
import { MasterOutlet, StockOpnameStatus } from '@/types/database'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
    CheckCircle2,
    XCircle,
    Clock,
    Eye,
    Loader2,
    RefreshCw,
    Search,
    Store,
    FileCheck,
    AlertTriangle,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'

export default function StockOpnameApprovalPage() {
    const { user } = useAuthUser()
    const userRole = Number(user?.user_role)

    // Permissions: Only Role 5 (Finance), 8 (SUPERUSER), 14 (MANAGER)
    const canAccess = [5, 8, 14].includes(userRole)
    const canSelectOutlet = [5, 8].includes(userRole) // Role 14 is strictly locked to their own outlet

    // Filters State
    const [selectedOutlet, setSelectedOutlet] = useState<string>('')
    const [availableOutlets, setAvailableOutlets] = useState<MasterOutlet[]>([])
    const [statusFilter, setStatusFilter] = useState<string>('PENDING_APPROVAL')
    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    })
    const [searchTerm, setSearchTerm] = useState('')

    // Data State
    const [batches, setBatches] = useState<StockOpnameBatchRow[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Detail Dialog State
    const [selectedHeaderId, setSelectedHeaderId] = useState<string | null>(null)
    const [detailData, setDetailData] = useState<any | null>(null)
    const [isLoadingDetail, setIsLoadingDetail] = useState(false)
    const [isActionLoading, setIsActionLoading] = useState(false)
    const [actionNotes, setActionNotes] = useState('')

    // Initialize Outlet based on role
    useEffect(() => {
        if (!canSelectOutlet && user?.kode_outlet) {
            setSelectedOutlet(user.kode_outlet)
        } else if (canSelectOutlet) {
            setSelectedOutlet('ALL')
        }
    }, [user, canSelectOutlet])

    // Load available outlets for privileged users
    useEffect(() => {
        if (canSelectOutlet) {
            masterOutletService.getAllWhOutlet()
                .then(setAvailableOutlets)
                .catch(err => console.error('Failed to load outlets:', err))
        }
    }, [canSelectOutlet])

    // Fetch Batches
    useEffect(() => {
        if (selectedOutlet) {
            loadBatches()
        }
    }, [selectedOutlet, statusFilter, dateRange.startDate, dateRange.endDate])

    async function loadBatches() {
        setIsLoading(true)
        const outletToQuery = selectedOutlet !== 'ALL' ? selectedOutlet : undefined
        const res = await getStockOpnameBatches(
            outletToQuery,
            statusFilter !== 'ALL' ? statusFilter : undefined,
            dateRange.startDate,
            dateRange.endDate
        )
        if (res.isSuccess && res.data) {
            setBatches(res.data)
        } else {
            toast.error(res.error || 'Gagal memuat daftar batch opname')
        }
        setIsLoading(false)
    }

    // Load Batch Detail
    async function openDetailModal(headerId: string) {
        setSelectedHeaderId(headerId)
        setIsLoadingDetail(true)
        setActionNotes('')
        const res = await getStockOpnameBatchDetail(headerId)
        if (res.isSuccess && res.data) {
            setDetailData(res.data)
        } else {
            toast.error(res.error || 'Gagal memuat rincian batch opname')
            setSelectedHeaderId(null)
        }
        setIsLoadingDetail(false)
    }

    // Handle Approve
    async function handleApprove() {
        if (!selectedHeaderId) return

        if (!window.confirm('Apakah Anda yakin ingin MENYETUJUI dokumen opname ini? Stok fisik pada sistem inventaris akan langsung diperbarui sesuai hasil perhitungan aktual.')) {
            return
        }

        setIsActionLoading(true)
        try {
            const res = await approveStockOpnameBatch(selectedHeaderId)
            if (res.isSuccess) {
                toast.success('Batch Stock Opname berhasil disetujui! Saldo inventaris telah diperbarui.')
                setSelectedHeaderId(null)
                setDetailData(null)
                loadBatches()
            } else {
                toast.error(res.error || 'Gagal menyetujui stock opname')
            }
        } catch (err: any) {
            toast.error(err.message || 'Terjadi kesalahan sistem')
        } finally {
            setIsActionLoading(false)
        }
    }

    // Handle Reject
    async function handleReject() {
        if (!selectedHeaderId) return

        if (!actionNotes.trim()) {
            toast.error('Mohon isi alasan penolakan pada kolom catatan di bawah sebelum menolak pengajuan.')
            return
        }

        if (!window.confirm('Apakah Anda yakin ingin MENOLAK dokumen opname ini? Saldo inventaris TIDAK akan diubah.')) {
            return
        }

        setIsActionLoading(true)
        try {
            const res = await rejectStockOpnameBatch(selectedHeaderId, actionNotes.trim())
            if (res.isSuccess) {
                toast.success('Batch Stock Opname berhasil ditolak.')
                setSelectedHeaderId(null)
                setDetailData(null)
                loadBatches()
            } else {
                toast.error(res.error || 'Gagal menolak stock opname')
            }
        } catch (err: any) {
            toast.error(err.message || 'Terjadi kesalahan sistem')
        } finally {
            setIsActionLoading(false)
        }
    }

    // Client-side search filter
    const filteredBatches = batches.filter(b => {
        const matchesSearch =
            (b.document_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (b.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (b.master_outlet?.name_outlet || '').toLowerCase().includes(searchTerm.toLowerCase())
        return matchesSearch
    })

    // KPI Summary
    const totalPending = batches.filter(b => b.status === 'PENDING_APPROVAL').length
    const totalApproved = batches.filter(b => b.status === 'COMPLETED').length
    const totalRejected = batches.filter(b => b.status === 'REJECTED').length

    const getStatusBadge = (status: StockOpnameStatus) => {
        switch (status) {
            case 'PENDING_APPROVAL':
                return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold"><Clock className="w-3 h-3 mr-1 inline" /> Menunggu Persetujuan</Badge>
            case 'COMPLETED':
                return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold"><CheckCircle2 className="w-3 h-3 mr-1 inline" /> Disetujui</Badge>
            case 'REJECTED':
                return <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-semibold"><XCircle className="w-3 h-3 mr-1 inline" /> Ditolak</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    if (!canAccess) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center max-w-lg mx-auto">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900">Akses Dibatasi</h2>
                    <p className="text-muted-foreground mt-2">
                        Halaman Persetujuan Stock Opname hanya dapat diakses oleh Manager (Role 14), Finance (Role 5), dan Superuser (Role 8).
                    </p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-20 p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <FileCheck className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Persetujuan Stock Opname</h1>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Verifikasi dan setujui pengajuan Stock Opname (Batch & Satuan) sebelum pembaruan saldo inventaris fisik.
                        </p>
                    </div>
                    <Button onClick={loadBatches} variant="outline" size="sm" disabled={isLoading} className="bg-white">
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Segarkan Data
                    </Button>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border border-border/60 shadow-sm bg-white">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase">Total Pengajuan</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{batches.length}</p>
                            </div>
                            <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600">
                                <FileCheck className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-amber-200 shadow-sm bg-amber-50/50">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-amber-700 uppercase">Menunggu Persetujuan</p>
                                <p className="text-2xl font-bold text-amber-900 mt-1">{totalPending}</p>
                            </div>
                            <div className="p-2.5 bg-amber-100 rounded-lg text-amber-700">
                                <Clock className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-emerald-200 shadow-sm bg-emerald-50/50">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-emerald-700 uppercase">Disetujui (Selesai)</p>
                                <p className="text-2xl font-bold text-emerald-900 mt-1">{totalApproved}</p>
                            </div>
                            <div className="p-2.5 bg-emerald-100 rounded-lg text-emerald-700">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-rose-200 shadow-sm bg-rose-50/50">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-rose-700 uppercase">Ditolak</p>
                                <p className="text-2xl font-bold text-rose-900 mt-1">{totalRejected}</p>
                            </div>
                            <div className="p-2.5 bg-rose-100 rounded-lg text-rose-700">
                                <XCircle className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Bar */}
                <Card className="bg-slate-50 border-slate-200 shadow-sm">
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end flex-wrap">
                        {/* Status Filter */}
                        <div className="flex flex-col gap-1.5 w-full md:w-auto">
                            <label className="text-xs font-semibold text-slate-600">Status Pengajuan</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[200px] bg-white">
                                    <SelectValue placeholder="Pilih Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua Status</SelectItem>
                                    <SelectItem value="PENDING_APPROVAL">Menunggu Persetujuan</SelectItem>
                                    <SelectItem value="COMPLETED">Disetujui (Selesai)</SelectItem>
                                    <SelectItem value="REJECTED">Ditolak</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Outlet Filter */}
                        {canSelectOutlet ? (
                            <div className="flex flex-col gap-1.5 w-full md:w-auto">
                                <label className="text-xs font-semibold text-slate-600">Outlet</label>
                                <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                    <SelectTrigger className="w-[220px] bg-white">
                                        <div className="flex items-center gap-2">
                                            <Store className="h-4 w-4 text-muted-foreground" />
                                            <SelectValue placeholder="Pilih Outlet" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">SEMUA OUTLET (ALL OUTLET)</SelectItem>
                                        {availableOutlets.map(o => (
                                            <SelectItem key={o.kode_outlet} value={o.kode_outlet}>
                                                {o.name_outlet}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1.5 w-full md:w-auto">
                                <label className="text-xs font-semibold text-slate-600">Outlet Anda</label>
                                <div className="h-10 px-3 py-2 bg-slate-100 rounded-md border border-slate-300 text-sm font-medium text-slate-700 flex items-center gap-2 min-w-[180px]">
                                    <Store className="h-4 w-4 text-slate-500" />
                                    {user?.outlet?.name_outlet || user?.kode_outlet}
                                </div>
                            </div>
                        )}

                        {/* Date Range */}
                        <div className="flex flex-col gap-1.5 w-full md:w-auto">
                            <label className="text-xs font-semibold text-slate-600">Tanggal Mulai</label>
                            <Input
                                type="date"
                                value={dateRange.startDate}
                                onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                className="bg-white w-[160px]"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 w-full md:w-auto">
                            <label className="text-xs font-semibold text-slate-600">Tanggal Akhir</label>
                            <Input
                                type="date"
                                value={dateRange.endDate}
                                onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                className="bg-white w-[160px]"
                            />
                        </div>

                        {/* Search Input */}
                        <div className="flex flex-col gap-1.5 w-full md:w-auto flex-1 min-w-[200px]">
                            <label className="text-xs font-semibold text-slate-600">Cari No. Dokumen / Catatan</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Ketik No. Dokumen (SO-...) atau catatan..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-white"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Batches Table */}
                <Card className="border shadow-sm">
                    <CardHeader className="bg-muted/40 pb-4">
                        <CardTitle className="text-base font-semibold">Daftar Pengajuan Stock Opname</CardTitle>
                        <CardDescription>
                            Daftar pengajuan perhitungan fisik inventaris yang siap ditinjau dan disetujui.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="h-64 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : filteredBatches.length === 0 ? (
                            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground p-6">
                                <CheckCircle2 className="h-10 w-10 text-slate-300 mb-2" />
                                <p className="font-medium text-slate-600">Tidak ada dokumen pengajuan stock opname.</p>
                                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan filter status atau rentang tanggal di atas.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-[140px]">No. Dokumen</TableHead>
                                            <TableHead className="w-[120px]">Tanggal</TableHead>
                                            <TableHead className="w-[150px]">Gerai / Outlet</TableHead>
                                            <TableHead className="w-[100px] text-center">Total Item</TableHead>
                                            <TableHead className="w-[110px] text-center">Berselisih</TableHead>
                                            <TableHead className="w-[170px]">Status</TableHead>
                                            <TableHead>Catatan Pengajuan</TableHead>
                                            <TableHead className="w-[130px] text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredBatches.map(b => {
                                            const items = b.stock_opname_items || []
                                            const totalItems = items.length
                                            const diffItems = items.filter(i => (Number(i.difference) || 0) !== 0).length

                                            return (
                                                <TableRow key={b.id} className="hover:bg-slate-50/80">
                                                    <TableCell className="font-mono text-xs font-bold text-primary">
                                                        {b.document_number}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {format(new Date(b.opname_date), 'dd/MMM/yyyy')}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-xs">
                                                        {b.master_outlet?.name_outlet || b.kode_outlet}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono text-xs">
                                                        {totalItems} SKU
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs">
                                                        {diffItems > 0 ? (
                                                            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                                {diffItems} SKU
                                                            </span>
                                                        ) : (
                                                            <span className="text-emerald-700 font-medium">0 (Sesuai)</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(b.status)}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground truncate max-w-[220px]">
                                                        {b.notes || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            variant={b.status === 'PENDING_APPROVAL' ? 'default' : 'outline'}
                                                            className="h-8 text-xs font-semibold"
                                                            onClick={() => openDetailModal(b.id)}
                                                        >
                                                            <Eye className="w-3.5 h-3.5 mr-1" />
                                                            {b.status === 'PENDING_APPROVAL' ? 'Periksa' : 'Rincian'}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Detail & Approval Dialog */}
                <Dialog open={!!selectedHeaderId} onOpenChange={open => !open && setSelectedHeaderId(null)}>
                    <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                        <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                        Rincian Batch Opname: {detailData?.document_number}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs mt-1">
                                        Gerai: {detailData?.master_outlet?.name_outlet || detailData?.kode_outlet} • Tanggal: {detailData?.opname_date ? format(new Date(detailData.opname_date), 'dd MMMM yyyy') : '-'}
                                    </DialogDescription>
                                </div>
                                <div>
                                    {detailData && getStatusBadge(detailData.status)}
                                </div>
                            </div>
                        </DialogHeader>

                        {isLoadingDetail ? (
                            <div className="p-16 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : detailData ? (
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                                    <div>
                                        <span className="text-slate-500 font-medium">Catatan Pengaju: </span>
                                        <span className="font-semibold text-slate-800">{detailData.notes || 'Tidak ada catatan'}</span>
                                    </div>
                                    <div className="text-slate-500">
                                        Total Barang: <strong className="text-slate-800">{detailData.stock_opname_items?.length || 0} SKU</strong>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/60 text-xs">
                                                <TableHead className="w-[120px]">SKU</TableHead>
                                                <TableHead>Nama Barang</TableHead>
                                                <TableHead className="text-right w-[100px]">Stok Sistem</TableHead>
                                                <TableHead className="text-right w-[110px]">Fisik (Aktual)</TableHead>
                                                <TableHead className="text-right w-[100px]">Selisih</TableHead>
                                                <TableHead className="w-[180px]">Catatan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(detailData.stock_opname_items || []).map((item: any) => {
                                                const diff = Number(item.difference) || 0
                                                const diffStr = diff > 0 ? `+${diff}` : `${diff}`

                                                return (
                                                    <TableRow key={item.id} className={diff !== 0 ? 'bg-amber-50/40' : ''}>
                                                        <TableCell className="font-mono text-xs font-semibold">
                                                            {item.master_barang?.sku || '-'}
                                                        </TableCell>
                                                        <TableCell className="font-medium text-xs">
                                                            {item.master_barang?.name || 'Item'}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs font-medium text-slate-600">
                                                            {item.system_qty}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                                                            {item.actual_qty}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs">
                                                            {diff !== 0 ? (
                                                                <span className={diff < 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                                                                    {diffStr}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400">0</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]">
                                                            {item.notes || '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Rejection / Action Notes if Pending */}
                                {detailData.status === 'PENDING_APPROVAL' && (
                                    <div className="space-y-2 pt-2">
                                        <Label className="text-xs font-semibold text-slate-700">
                                            Catatan Verifikasi / Alasan Penolakan (Wajib diisi jika ditolak):
                                        </Label>
                                        <Input
                                            placeholder="Tuliskan catatan verifikasi atau alasan jika ingin menolak pengajuan ini..."
                                            value={actionNotes}
                                            onChange={e => setActionNotes(e.target.value)}
                                            className="text-xs"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : null}

                        <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-between">
                            <Button
                                variant="outline"
                                onClick={() => setSelectedHeaderId(null)}
                                disabled={isActionLoading}
                            >
                                Tutup
                            </Button>

                            {detailData?.status === 'PENDING_APPROVAL' && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="destructive"
                                        onClick={handleReject}
                                        disabled={isActionLoading}
                                    >
                                        {isActionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                                        Tolak Pengajuan
                                    </Button>
                                    <Button
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                        onClick={handleApprove}
                                        disabled={isActionLoading}
                                    >
                                        {isActionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                        Setujui & Perbarui Stok
                                    </Button>
                                </div>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}

