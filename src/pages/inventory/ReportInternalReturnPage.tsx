import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { useAuthUser } from '@/hooks/useAuth'
import { reportService } from '@/services/reportService'
import { masterOutletService } from '@/services/masterOutletService'
import { ViewReportInternalReturn } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
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
import { Filter, Store, Download, Search, RefreshCw, BadgeDollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export default function ReportInternalReturnPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<ViewReportInternalReturn[]>([])
    const [originalData, setOriginalData] = useState<ViewReportInternalReturn[]>([])
    const [loading, setLoading] = useState(true)

    // Filter States
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [conditionFilter, setConditionFilter] = useState('')

    // Initialize Default Dates
    useEffect(() => {
        const today = new Date()
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'))
        setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'))
    }, [])

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
        if (selectedOutlet && startDate && endDate) {
            fetchData()
        }
    }, [selectedOutlet, startDate, endDate])

    // Local Filtering
    useEffect(() => {
        let filtered = [...originalData]

        if (conditionFilter) {
            const lowerFilter = conditionFilter.toLowerCase()
            filtered = filtered.filter(item =>
                (item.condition_notes && item.condition_notes.toLowerCase().includes(lowerFilter)) ||
                item.document_number.toLowerCase().includes(lowerFilter) ||
                (item.item_name && item.item_name.toLowerCase().includes(lowerFilter))
            )
        }

        setData(filtered)
    }, [conditionFilter, originalData])

    const fetchData = async () => {
        if (!selectedOutlet) return

        setLoading(true)
        try {
            const res = await reportService.getInternalReturnReport(selectedOutlet, startDate, endDate)

            if (res.isSuccess && res.data) {
                setOriginalData(res.data)
                setData(res.data)
            } else {
                toast.error(res.error || 'Gagal memuat laporan retur internal')
            }
        } catch (error) {
            console.error('Error:', error)
            toast.error('Terjadi kesalahan sistem saat memuat laporan')
        } finally {
            setLoading(false)
        }
    }

    const handleExportCsv = () => {
        if (data.length === 0) {
            toast.error('Tidak ada data untuk diekspor')
            return
        }

        const headers = ['Tanggal', 'No Dokumen', 'Outlet', 'Kategori', 'Nama Barang', 'SKU', 'Dikembalikan Oleh', 'Petugas', 'Jumlah Qty', 'Satuan', 'Kondisi / Catatan', 'Nilai Dipulihkan']
        const csvRows = [headers.join(',')]

        data.forEach(row => {
            const values = [
                formatDate(row.transaction_date),
                `"${row.document_number}"`,
                `"${row.name_outlet}"`,
                `"${row.category_name}"`,
                `"${row.item_name || ''}"`,
                `"${row.sku || ''}"`,
                `"${row.returned_by || ''}"`,
                `"${row.created_by_name || ''}"`,
                row.qty_returned,
                `"${row.uom || ''}"`,
                `"${row.condition_notes || ''}"`,
                row.total_value_recovered
            ]
            csvRows.push(values.join(','))
        })

        const csvContent = csvRows.join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Laporan_Retur_Internal_${startDate}_${endDate}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }

    // Summary Calculations
    const totalItems = data.reduce((acc, curr) => acc + (Number(curr.qty_returned) || 0), 0)
    const totalValue = data.reduce((acc, curr) => acc + (Number(curr.total_value_recovered) || 0), 0)

    // Helper for Condition Logic
    const getConditionStyle = (condition: string | null) => {
        if (!condition) return 'text-slate-600 dark:text-[#A6A095]'
        const lower = condition.toLowerCase()
        if (lower.includes('damaged') || lower.includes('bad') || lower.includes('rusak') || lower.includes('broken')) {
            return 'text-rose-600 dark:text-rose-400 font-bold'
        }
        return 'text-[#6E8027] dark:text-[#9BB33B] font-medium'
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-[#EBE6DF]">
                        Laporan Retur Internal
                    </h1>
                    <p className="text-slate-500 dark:text-[#A6A095]">
                        Pantau barang dan sisa perlengkapan yang dikembalikan ke stok gudang beserta nilai aset yang dipulihkan.
                    </p>
                </div>

                {/* Filters */}
                <Card className="bg-white dark:bg-[#22221B] shadow-sm border-slate-200 dark:border-[#38382E]">
                    <CardHeader className="pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-[#EBE6DF]">
                            <Filter className="h-4 w-4 text-[#889D35]" />
                            Filter & Pencarian
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-200 dark:border-[#38382E] hover:bg-slate-50 dark:hover:bg-[#2a2a22]"
                            onClick={handleExportCsv}
                        >
                            <Download className="mr-2 h-4 w-4 text-[#889D35]" />
                            Ekspor CSV
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label className="dark:text-[#EBE6DF]">Tanggal Mulai</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="dark:text-[#EBE6DF]">Tanggal Akhir</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
                                />
                            </div>

                            {canSelectOutlet && (
                                <div className="space-y-2">
                                    <Label className="dark:text-[#EBE6DF]">Outlet / Cabang</Label>
                                    <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                        <SelectTrigger className="w-full bg-white dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]">
                                            <div className="flex items-center gap-2">
                                                <Store className="h-4 w-4 text-muted-foreground" />
                                                <SelectValue placeholder="Pilih Outlet" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="dark:bg-[#22221B] dark:border-[#38382E]">
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
                                <Label className="dark:text-[#EBE6DF]">Cari Kondisi / Dokumen / Barang</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Cth: Rusak, Baik, atau No. Dokumen..."
                                        value={conditionFilter}
                                        onChange={(e) => setConditionFilter(e.target.value)}
                                        className="pl-9 dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-[#889D35]/10 border-[#889D35]/25 dark:bg-[#22221B] dark:border-[#889D35]/30 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[#889D35]/20 rounded-xl text-[#6E8027] dark:text-[#9BB33B]">
                                    <RefreshCw className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#6E8027] dark:text-[#9BB33B]">Total Barang Diretur</p>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-[#EBE6DF]">{totalItems}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50/70 border-emerald-200 dark:bg-[#22221B] dark:border-emerald-900/40 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl text-emerald-700 dark:text-emerald-400">
                                    <BadgeDollarSign className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Total Nilai Aset Dipulihkan</p>
                                    <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">{formatCurrency(totalValue)}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Table */}
                <div className="rounded-xl border border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/80 dark:bg-[#191914]">
                            <TableRow className="border-b border-slate-200 dark:border-[#38382E]">
                                <TableHead className="dark:text-[#EBE6DF]">Tanggal</TableHead>
                                <TableHead className="dark:text-[#EBE6DF]">No. Dokumen</TableHead>
                                <TableHead className="dark:text-[#EBE6DF]">Outlet</TableHead>
                                <TableHead className="dark:text-[#EBE6DF]">Kategori</TableHead>
                                <TableHead className="dark:text-[#EBE6DF]">Nama Barang</TableHead>
                                <TableHead className="dark:text-[#EBE6DF]">Dikembalikan Oleh</TableHead>
                                <TableHead className="text-right dark:text-[#EBE6DF]">Jumlah (Qty)</TableHead>
                                <TableHead className="dark:text-[#EBE6DF]">Kondisi / Catatan</TableHead>
                                <TableHead className="text-right dark:text-[#EBE6DF]">Total Nilai</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center dark:text-[#A6A095]">
                                        Memuat data retur internal...
                                    </TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center text-slate-500 dark:text-[#A6A095]">
                                        Tidak ada data retur internal untuk periode atau filter yang dipilih.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row) => (
                                    <TableRow key={row.item_id} className="hover:bg-slate-50/50 dark:hover:bg-[#191914]/50 border-b border-slate-100 dark:border-[#38382E]/50">
                                        <TableCell className="font-medium text-slate-600 dark:text-[#EBE6DF] whitespace-nowrap">
                                            {formatDate(row.transaction_date)}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-slate-500 dark:text-[#A6A095]">
                                            {row.document_number}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-600 dark:text-[#A6A095]">
                                            {row.name_outlet}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#889D35]/15 text-[#6E8027] dark:text-[#9BB33B] border border-[#889D35]/20">
                                                {row.category_name}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-800 dark:text-[#EBE6DF]">
                                            {row.item_name}
                                            <span className="block text-xs text-slate-400 dark:text-[#A6A095] font-mono">{row.sku}</span>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600 dark:text-[#A6A095]">
                                            {row.returned_by || '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-medium dark:text-[#EBE6DF] whitespace-nowrap">
                                            {row.qty_returned} {row.uom}
                                        </TableCell>
                                        <TableCell className={`text-sm ${getConditionStyle(row.condition_notes)}`}>
                                            {row.condition_notes || '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                            {formatCurrency(row.total_value_recovered)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </DashboardLayout>
    )
}
