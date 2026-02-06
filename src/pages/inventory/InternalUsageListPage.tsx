import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { useAuthUser } from '@/hooks/useAuth'
import { internalUsageService } from '@/services/internalUsageService'
import { InternalUsageHeader } from '@/types/database'
import { formatDate } from '@/lib/utils'
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
import { Plus, Printer, Search, Loader2 } from 'lucide-react'

export default function InternalUsageListPage() {
    const navigate = useNavigate()
    const { user } = useAuthUser()
    const [data, setData] = useState<InternalUsageHeader[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (user) {
            fetchData()
        }
    }, [user, startDate, endDate])

    const fetchData = async () => {
        setLoading(true)
        const outletCode = user?.kode_outlet || 'ALL'
        const res = await internalUsageService.getUsageList(outletCode, startDate, endDate)
        if (res.isSuccess && res.data) {
            setData(res.data)
        }
        setLoading(false)
    }

    const filteredData = data.filter(item =>
        item.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.requested_by && item.requested_by.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const handlePrint = (id: string) => {
        window.open(`/inventory/internal-usage/print/${id}`, '_blank')
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Internal Consumption</h1>
                        <p className="text-slate-500">
                            Track office supplies, cleaning materials, and other internal expenses.
                        </p>
                    </div>
                    <Button onClick={() => navigate('/inventory/internal-usage/create')} className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Usage
                    </Button>
                </div>

                <Card className="bg-white shadow-sm border-slate-200">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                            <Search className="h-4 w-4 text-indigo-500" />
                            Filters & Search
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Search</Label>
                                <Input
                                    placeholder="Search Doc No, Requestor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/80">
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Doc Number</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Requested By</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead className="text-center w-[100px]">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                                            <span>Loading...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                        No records found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium text-slate-600">
                                            {formatDate(item.transaction_date)}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-slate-500">
                                            {item.document_number}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                                {item.master_issue_category?.category_name || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-700">
                                            {item.requested_by || '-'}
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-sm max-w-[200px] truncate" title={item.notes || ''}>
                                            {item.notes || '-'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handlePrint(item.id)}
                                                className="text-slate-500 hover:text-indigo-600"
                                                title="Print Receipt"
                                            >
                                                <Printer className="h-4 w-4" />
                                            </Button>
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
