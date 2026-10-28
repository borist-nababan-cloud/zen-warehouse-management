import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    Plus,
    FileText,
    ArrowRight,
    Calendar,
    Eye,
    XCircle,
    Search,
    Send,
    Inbox,
    CheckCircle2,
    Clock,
    Loader2
} from 'lucide-react'
import { toast } from 'sonner'

import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'

import { useAuthUser } from '@/hooks/useAuth'
import { stoService } from '@/services/stoService'
import { StoRequest, StoRequestStatus } from '@/types/database'

export function StoRequestListPage() {
    const navigate = useNavigate()
    const { user } = useAuthUser()
    const queryClient = useQueryClient()

    const [directionFilter, setDirectionFilter] = useState<'ALL' | 'OUTGOING' | 'INCOMING'>('ALL')
    const [statusFilter, setStatusFilter] = useState<StoRequestStatus | 'ALL'>('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRequest, setSelectedRequest] = useState<StoRequest | null>(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)

    const isSuperOrFinance = user?.user_role === 5 || user?.user_role === 8

    const { data: requests = [], isLoading } = useQuery({
        queryKey: ['sto_requests', user?.kode_outlet, directionFilter, statusFilter],
        queryFn: () =>
            stoService.getStoRequests({
                outlet_code: isSuperOrFinance && directionFilter === 'ALL' ? 'ALL' : user?.kode_outlet || undefined,
                direction: directionFilter,
                status: statusFilter
            }),
        enabled: !!user
    })

    const cancelMutation = useMutation({
        mutationFn: (id: string) => stoService.updateStoRequestStatus(id, 'CANCELLED', user?.id),
        onSuccess: () => {
            toast.success('Dokumen Request Kirim Barang berhasil dibatalkan.')
            setIsDetailOpen(false)
            queryClient.invalidateQueries({ queryKey: ['sto_requests'] })
        },
        onError: (err: any) => {
            toast.error(err.message || 'Gagal membatalkan dokumen request.')
        }
    })

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const q = searchQuery.toLowerCase().trim()
            if (!q) return true
            const matchDoc = req.document_number?.toLowerCase().includes(q)
            const matchFrom = req.requesting_master_outlet?.name_outlet?.toLowerCase().includes(q) || req.requesting_outlet?.toLowerCase().includes(q)
            const matchTo = req.target_master_outlet?.name_outlet?.toLowerCase().includes(q) || req.target_outlet?.toLowerCase().includes(q)
            const matchNotes = req.notes?.toLowerCase().includes(q)
            return matchDoc || matchFrom || matchTo || matchNotes
        })
    }, [requests, searchQuery])

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

    const totalCount = requests.length
    const submittedCount = requests.filter(r => r.status === 'SUBMITTED').length
    const fulfilledCount = requests.filter(r => r.status === 'FULFILLED').length

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold font-serif tracking-tight text-slate-900 dark:text-[#EBE6DF]">
                            Request Kirim Barang (STO)
                        </h1>
                        <p className="text-slate-500 dark:text-[#A6A095] text-sm mt-1">
                            Kelola permintaan pengiriman stok barang antar outlet (tahap sebelum pembuatan dokumen Kirim Barang STO).
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate('/sto/requests/create')}
                        className="bg-[#889D35] hover:bg-[#72842B] text-white font-medium shadow-sm"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Buat Request Kirim Barang
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
                        <CardContent className="pt-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-[#A6A095]">Total Dokumen Request</p>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-[#EBE6DF] mt-1">{totalCount}</h3>
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
                </div>

                {/* Main Table Card */}
                <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
                    <CardHeader className="bg-[#F8F5F1]/60 dark:bg-[#191914]/50 border-b border-slate-100 dark:border-[#38382E] pb-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-base font-semibold text-slate-900 dark:text-[#EBE6DF]">
                                    Daftar Dokumen Request Kirim Barang
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500 dark:text-[#A6A095]">
                                    Pantau permintaan barang yang diajukan oleh outlet Anda maupun permintaan masuk dari outlet lain.
                                </CardDescription>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                {/* Direction Filter */}
                                <div className="inline-flex rounded-lg border border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#191914] p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setDirectionFilter('ALL')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                            directionFilter === 'ALL'
                                                ? 'bg-[#889D35] text-white'
                                                : 'text-slate-600 dark:text-[#A6A095] hover:text-slate-900'
                                        }`}
                                    >
                                        Semua
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDirectionFilter('OUTGOING')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 transition-colors ${
                                            directionFilter === 'OUTGOING'
                                                ? 'bg-[#889D35] text-white'
                                                : 'text-slate-600 dark:text-[#A6A095] hover:text-slate-900'
                                        }`}
                                    >
                                        <Send className="w-3 h-3" /> Permintaan Kita
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDirectionFilter('INCOMING')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 transition-colors ${
                                            directionFilter === 'INCOMING'
                                                ? 'bg-[#889D35] text-white'
                                                : 'text-slate-600 dark:text-[#A6A095] hover:text-slate-900'
                                        }`}
                                    >
                                        <Inbox className="w-3 h-3" /> Permintaan Masuk
                                    </button>
                                </div>

                                {/* Status Filter */}
                                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                                    <SelectTrigger className="w-44 h-9 text-xs dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]">
                                        <SelectValue placeholder="Filter Status" />
                                    </SelectTrigger>
                                    <SelectContent className="dark:bg-[#22221B] dark:border-[#38382E]">
                                        <SelectItem value="ALL">Semua Status</SelectItem>
                                        <SelectItem value="SUBMITTED">Menunggu Diproses</SelectItem>
                                        <SelectItem value="FULFILLED">Sudah Diproses STO</SelectItem>
                                        <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Search */}
                                <div className="relative w-full sm:w-56">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <Input
                                        placeholder="Cari No. Request / Outlet..."
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
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/70 dark:bg-[#191914]/70 border-b border-slate-200 dark:border-[#38382E]">
                                        <TableHead className="dark:text-[#EBE6DF]">No. Request</TableHead>
                                        <TableHead className="dark:text-[#EBE6DF]">Tanggal</TableHead>
                                        <TableHead className="dark:text-[#EBE6DF]">Outlet Pemohon $\to$ Outlet Tujuan</TableHead>
                                        <TableHead className="text-center dark:text-[#EBE6DF]">Jml Jenis Barang</TableHead>
                                        <TableHead className="dark:text-[#EBE6DF]">Catatan</TableHead>
                                        <TableHead className="text-center dark:text-[#EBE6DF]">Status</TableHead>
                                        <TableHead className="text-right dark:text-[#EBE6DF]">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-32 text-slate-500 dark:text-[#A6A095]">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Loader2 className="w-5 h-5 animate-spin text-[#889D35]" />
                                                    <span className="text-xs">Memuat dokumen Request Kirim Barang...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredRequests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-28 text-slate-500 dark:text-[#A6A095] text-sm">
                                                Belum ada dokumen Request Kirim Barang yang sesuai filter.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredRequests.map(req => {
                                            const isIncomingToMe = req.target_outlet === user?.kode_outlet
                                            return (
                                                <TableRow
                                                    key={req.id}
                                                    className="border-b border-slate-100 dark:border-[#38382E]/60 hover:bg-slate-50/60 dark:hover:bg-[#191914]/40"
                                                >
                                                    <TableCell className="font-mono font-semibold text-slate-900 dark:text-[#EBE6DF]">
                                                        {req.document_number}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600 dark:text-[#A6A095]">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="h-3.5 w-3.5 text-[#889D35]" />
                                                            {format(new Date(req.request_date), 'dd MMM yyyy')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span
                                                                className={
                                                                    req.requesting_outlet === user?.kode_outlet
                                                                        ? 'font-bold text-[#889D35]'
                                                                        : 'text-slate-700 dark:text-[#EBE6DF]'
                                                                }
                                                            >
                                                                [{req.requesting_outlet}] {req.requesting_master_outlet?.name_outlet || req.requesting_outlet}
                                                            </span>
                                                            <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                            <span
                                                                className={
                                                                    req.target_outlet === user?.kode_outlet
                                                                        ? 'font-bold text-[#889D35]'
                                                                        : 'text-slate-700 dark:text-[#EBE6DF]'
                                                                }
                                                            >
                                                                [{req.target_outlet}] {req.target_master_outlet?.name_outlet || req.target_outlet}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono text-xs font-semibold text-slate-700 dark:text-[#EBE6DF]">
                                                        {req.sto_request_items?.length || 0} Item
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-500 dark:text-[#A6A095] max-w-[220px] truncate">
                                                        {req.notes || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {getStatusBadge(req.status)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedRequest(req)
                                                                    setIsDetailOpen(true)
                                                                }}
                                                                className="h-8 text-xs text-slate-700 dark:text-[#EBE6DF] hover:text-[#889D35]"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 mr-1" />
                                                                Rincian
                                                            </Button>
                                                            {isIncomingToMe && req.status === 'SUBMITTED' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        navigate(
                                                                            `/sto/create?request_id=${req.id}&request_number=${encodeURIComponent(
                                                                                req.document_number
                                                                            )}&to_outlet=${req.requesting_outlet}`
                                                                        )
                                                                    }
                                                                    className="h-8 text-xs bg-[#889D35] hover:bg-[#72842B] text-white"
                                                                >
                                                                    Proses Kirim STO
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
                    </CardContent>
                </Card>

                {/* Detail Modal */}
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-2xl bg-white dark:bg-[#22221B] border-slate-200 dark:border-[#38382E]">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-[#EBE6DF]">
                                Rincian Request Barang: {selectedRequest?.document_number}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 dark:text-[#A6A095]">
                                Daftar barang yang diminta oleh outlet pemohon kepada outlet penyedia.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedRequest && (
                            <div className="space-y-4 py-2">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#191914] border border-slate-200 dark:border-[#38382E] text-xs">
                                    <div>
                                        <span className="text-slate-500 dark:text-[#A6A095] block">Outlet Pemohon (Meminta):</span>
                                        <span className="font-semibold text-slate-900 dark:text-[#EBE6DF]">
                                            [{selectedRequest.requesting_outlet}] {selectedRequest.requesting_master_outlet?.name_outlet || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 dark:text-[#A6A095] block">Outlet Tujuan (Dimintai):</span>
                                        <span className="font-semibold text-slate-900 dark:text-[#EBE6DF]">
                                            [{selectedRequest.target_outlet}] {selectedRequest.target_master_outlet?.name_outlet || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 dark:text-[#A6A095] block">Tanggal & Status:</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="font-medium text-slate-900 dark:text-[#EBE6DF]">
                                                {format(new Date(selectedRequest.request_date), 'dd MMM yyyy')}
                                            </span>
                                            {getStatusBadge(selectedRequest.status)}
                                        </div>
                                    </div>
                                </div>

                                {selectedRequest.notes && (
                                    <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs text-slate-700 dark:text-[#EBE6DF]">
                                        <span className="font-semibold">Catatan Permintaan: </span>
                                        {selectedRequest.notes}
                                    </div>
                                )}

                                <div className="rounded-xl border border-slate-200 dark:border-[#38382E] overflow-hidden max-h-64 overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50 dark:bg-[#191914]">
                                                <TableHead className="text-xs dark:text-[#EBE6DF]">SKU</TableHead>
                                                <TableHead className="text-xs dark:text-[#EBE6DF]">Nama Barang</TableHead>
                                                <TableHead className="text-xs text-right dark:text-[#EBE6DF]">Qty Diminta</TableHead>
                                                <TableHead className="text-xs text-center dark:text-[#EBE6DF]">Satuan</TableHead>
                                                <TableHead className="text-xs dark:text-[#EBE6DF]">Catatan Item</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedRequest.sto_request_items?.map(item => (
                                                <TableRow key={item.id} className="border-b border-slate-100 dark:border-[#38382E]">
                                                    <TableCell className="font-mono text-xs text-slate-500 dark:text-[#A6A095]">
                                                        {item.master_barang?.sku || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium text-slate-900 dark:text-[#EBE6DF]">
                                                        {item.master_barang?.name || `Barang #${item.barang_id}`}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-right font-mono font-bold text-[#889D35]">
                                                        {item.qty_requested}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-center font-mono text-slate-500 dark:text-[#A6A095]">
                                                        {item.uom || 'PCS'}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-500 dark:text-[#A6A095]">
                                                        {item.notes || '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2">
                            {selectedRequest?.status === 'SUBMITTED' &&
                                (selectedRequest.requesting_outlet === user?.kode_outlet ||
                                    selectedRequest.target_outlet === user?.kode_outlet ||
                                    isSuperOrFinance) && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        disabled={cancelMutation.isPending}
                                        onClick={() => {
                                            if (confirm('Apakah Anda yakin ingin membatalkan Request Kirim Barang ini?')) {
                                                cancelMutation.mutate(selectedRequest.id)
                                            }
                                        }}
                                    >
                                        <XCircle className="w-4 h-4 mr-1.5" />
                                        Batalkan Request
                                    </Button>
                                )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsDetailOpen(false)}
                                className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
                            >
                                Tutup
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
export default StoRequestListPage

