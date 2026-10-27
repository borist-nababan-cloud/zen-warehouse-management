import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { useAuthUser } from '@/hooks/useAuth'
import { internalReturnService } from '@/services/internalReturnService'
import { InternalReturnHeader } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Plus, Printer, Search, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

export default function InternalReturnListPage() {
    const navigate = useNavigate()
    const { user } = useAuthUser()
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<InternalReturnHeader[]>([])

    // Filters
    const [search, setSearch] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    useEffect(() => {
        if (user?.kode_outlet) {
            fetchData()
        }
    }, [user, startDate, endDate])

    const fetchData = async () => {
        setLoading(true)
        const res = await internalReturnService.getReturnList(
            user?.kode_outlet || 'ALL',
            startDate || undefined,
            endDate || undefined
        )
        if (res.data) {
            setData(res.data)
        }
        setLoading(false)
    }

    const filteredData = data.filter(item =>
        item.document_number.toLowerCase().includes(search.toLowerCase()) ||
        item.returned_by?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-[#EBE6DF]">
                            Riwayat Retur Internal
                        </h1>
                        <p className="text-slate-500 dark:text-[#A6A095]">
                            Daftar barang dan perlengkapan yang dikembalikan ke stok gudang outlet.
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate('/inventory/internal-return/create')}
                        className="bg-[#889D35] hover:bg-[#72842B] text-white font-medium shadow-sm gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Catat Retur Baru
                    </Button>
                </div>

                <Card className="bg-white dark:bg-[#22221B] shadow-sm border-slate-200 dark:border-[#38382E]">
                    <CardHeader className="bg-slate-50/50 dark:bg-[#191914] pb-4 border-b border-slate-200 dark:border-[#38382E]">
                        <div className="flex flex-col md:flex-row gap-4 justify-between">
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Cari Dokumen atau Nama..."
                                    className="pl-9 bg-white dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    type="date"
                                    className="w-auto bg-white dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                                <span className="self-center text-slate-400">-</span>
                                <Input
                                    type="date"
                                    className="w-auto bg-white dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50/80 dark:bg-[#191914]">
                                <TableRow className="border-b border-slate-200 dark:border-[#38382E]">
                                    <TableHead className="w-[170px] dark:text-[#EBE6DF]">No. Dokumen</TableHead>
                                    <TableHead className="w-[140px] dark:text-[#EBE6DF]">Tanggal</TableHead>
                                    <TableHead className="dark:text-[#EBE6DF]">Kategori</TableHead>
                                    <TableHead className="dark:text-[#EBE6DF]">Dikembalikan Oleh</TableHead>
                                    <TableHead className="dark:text-[#EBE6DF]">Catatan</TableHead>
                                    <TableHead className="text-right dark:text-[#EBE6DF]">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center dark:text-[#A6A095]">
                                            <div className="flex justify-center items-center gap-2 text-slate-500 dark:text-[#A6A095]">
                                                <Loader2 className="h-5 w-5 animate-spin text-[#889D35]" /> Memuat data retur...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-500 dark:text-[#A6A095]">
                                            Tidak ada riwayat retur internal ditemukan.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-[#191914]/50 border-b border-slate-100 dark:border-[#38382E]/50">
                                            <TableCell className="font-medium font-mono text-xs dark:text-[#EBE6DF]">
                                                {item.document_number}
                                            </TableCell>
                                            <TableCell className="text-slate-600 dark:text-[#EBE6DF] whitespace-nowrap">
                                                {format(new Date(item.transaction_date), 'dd MMM yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#889D35]/15 text-[#6E8027] dark:text-[#9BB33B] border border-[#889D35]/20">
                                                    {item.master_issue_category?.category_name}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-slate-700 dark:text-[#EBE6DF]">
                                                {item.returned_by || '-'}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate text-slate-500 dark:text-[#A6A095]" title={item.notes || ''}>
                                                {item.notes || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost" disabled title="Bukti Retur">
                                                    <Printer className="h-4 w-4 text-slate-400" />
                                                </Button>
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
