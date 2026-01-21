import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { getReportGrSupplier } from '@/services/goodsReceiptService'
import { ViewPoDetailsReceived } from '@/types/database'
import { DashboardLayout } from '@/components/layout/Sidebar'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { FileText, Loader2, Filter, Download } from 'lucide-react'
import { format } from 'date-fns'

// Helper for currency formatting
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
}

import { masterOutletService } from '@/services/masterOutletService'
import { MasterOutlet } from '@/types/database'

// at top of component
export function ReportGrSupplierPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<ViewPoDetailsReceived[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Filters
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [selectedOutlet, setSelectedOutlet] = useState<string>('ALL')
    const [outlets, setOutlets] = useState<MasterOutlet[]>([])

    // Roles who can see ALL outlets: 5 (Finance) and 8 (Superuser)
    const canSeeAllOutlets = user?.user_role === 5 || user?.user_role === 8

    useEffect(() => {
        if (canSeeAllOutlets) {
            masterOutletService.getAllWhOutlet().then(setOutlets).catch(console.error)
        }
    }, [canSeeAllOutlets])

    useEffect(() => {
        // Initialize filters based on user
        if (user) {
            // Default date range: current month
            const today = new Date()
            setEndDate(format(today, 'yyyy-MM-dd'))
            setStartDate(format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd'))

            if (!canSeeAllOutlets && user.kode_outlet) {
                setSelectedOutlet(user.kode_outlet)
            }
        }
    }, [user])

    const handleSearch = async () => {
        setIsLoading(true)
        try {
            // Determine outlet code to send
            let outletFilter = selectedOutlet
            if (!canSeeAllOutlets && user?.kode_outlet) {
                outletFilter = user.kode_outlet
            }

            const result = await getReportGrSupplier({
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                outletCode: outletFilter === 'ALL' ? undefined : outletFilter
            })

            if (result.isSuccess && result.data) {
                setData(result.data)
            } else {
                toast.error(result.error || "Failed to fetch report data")
            }
        } catch (error) {
            console.error(error)
            toast.error("An error occurred while fetching data")
        } finally {
            setIsLoading(false)
        }
    }

    // Initial load
    useEffect(() => {
        if (user) {
            handleSearch()
        }
    }, [user?.kode_outlet]) // simplistic dependency

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Report GR Supplier</h1>
                        <p className="text-muted-foreground">
                            Monitor Goods Receipt history against Purchase Orders.
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Filter Options
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>





                            {canSeeAllOutlets && (
                                <div className="space-y-2">
                                    <Label>Outlet</Label>
                                    <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Outlets" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Outlets</SelectItem>
                                            {outlets.map((outlet) => (
                                                <SelectItem key={outlet.kode_outlet} value={outlet.kode_outlet}>
                                                    {outlet.name_outlet} ({outlet.kode_outlet})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <Button onClick={handleSearch} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Apply Filter
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Data Table */}
                <Card className="border-pastel-blue/20 shadow-sm">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>PO Number</TableHead>
                                        <TableHead>Date</TableHead>
                                        {canSeeAllOutlets && <TableHead>Outlet</TableHead>}
                                        <TableHead>Item Name</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead className="text-right">Qty Ordered</TableHead>
                                        <TableHead className="text-right">Qty Received</TableHead>
                                        <TableHead className="text-right">Remaining</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={canSeeAllOutlets ? 9 : 8} className="text-center py-8 text-muted-foreground">
                                                No data found matching your filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data.map((item) => (
                                            <TableRow key={item.po_item_id + item.po_id}>
                                                <TableCell className="font-medium">{item.document_number}</TableCell>
                                                <TableCell>
                                                    {item.po_created_at ? format(new Date(item.po_created_at), 'dd/MM/yyyy') : '-'}
                                                </TableCell>
                                                {canSeeAllOutlets && <TableCell>{item.kode_outlet}</TableCell>}
                                                <TableCell>{item.item_name}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{item.sku}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {item.qty_ordered} {item.uom_purchase}
                                                </TableCell>
                                                <TableCell className="text-right text-blue-600 font-bold">
                                                    {item.qty_already_received} {item.uom_purchase}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {item.qty_remaining > 0 ? item.qty_remaining : 0}
                                                </TableCell>
                                                <TableCell>
                                                    {item.qty_remaining <= 0 ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            Fulfilled
                                                        </span>
                                                    ) : item.qty_already_received > 0 ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            Partial
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                            Ordered
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
