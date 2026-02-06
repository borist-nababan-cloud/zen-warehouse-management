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
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Internal Return History</h1>
                        <p className="text-slate-500">List of items returned to warehouse.</p>
                    </div>
                    <Button
                        onClick={() => navigate('/inventory/internal-return/create')}
                        className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Create Return
                    </Button>
                </div>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/50 pb-4 border-b">
                        <div className="flex flex-col md:flex-row gap-4 justify-between">
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search Document or Person..."
                                    className="pl-9 bg-white"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    type="date"
                                    className="w-auto bg-white"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                                <span className="self-center text-slate-400">-</span>
                                <Input
                                    type="date"
                                    className="w-auto bg-white"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">Document No</TableHead>
                                    <TableHead className="w-[120px]">Date</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Returned By</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <div className="flex justify-center items-center gap-2 text-slate-500">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                            No return records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-slate-50/50">
                                            <TableCell className="font-medium font-mono text-xs">
                                                {item.document_number}
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(item.transaction_date), 'dd MMM yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
                                                    {item.master_issue_category?.category_name}
                                                </span>
                                            </TableCell>
                                            <TableCell>{item.returned_by}</TableCell>
                                            <TableCell className="max-w-[200px] truncate text-slate-500">
                                                {item.notes || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost" disabled>
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
