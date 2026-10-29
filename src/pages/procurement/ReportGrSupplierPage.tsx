import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { getReportGrSupplier } from '@/services/goodsReceiptService'
import { ViewPoDetailsReceived, MasterOutlet } from '@/types/database'
import { DashboardLayout } from '@/components/layout/Sidebar'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Filter, Download, Printer, Image as ImageIcon, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

import { masterOutletService } from '@/services/masterOutletService'

export function ReportGrSupplierPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<ViewPoDetailsReceived[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null)

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

    // Export CSV Helper
    const handleExportCSV = () => {
        if (!data || data.length === 0) {
            toast.error("No data to export")
            return
        }

        // 1. Define Headers
        const headers = [
            "PO Number",
            "Date",
            "Outlet",
            "Item Name",
            "SKU",
            "Qty Ordered",
            "Qty Received",
            "Remaining",
            "UOM",
            "Status"
        ]

        // 2. Format Data Rows
        const rows = data.map(item => {
            const status = item.qty_remaining <= 0 ? 'Fulfilled'
                : item.qty_already_received > 0 ? 'Partial'
                    : 'Ordered'

            return [
                item.document_number,
                item.po_created_at ? format(new Date(item.po_created_at), 'yyyy-MM-dd') : '',
                item.kode_outlet,
                `"${item.item_name.replace(/"/g, '""')}"`, // Escape quotes
                item.sku,
                item.qty_ordered,
                item.qty_already_received,
                item.qty_remaining > 0 ? item.qty_remaining : 0,
                item.uom_purchase,
                status
            ].join(',')
        })

        // 3. Combine and Download
        const csvContent = [headers.join(','), ...rows].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `GR_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
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

                            <div className="flex gap-2">
                                <Button onClick={handleSearch} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Apply Filter
                                </Button>
                                <Button variant="outline" onClick={handleExportCSV} disabled={data.length === 0} title="Export to CSV">
                                    <Download className="mr-2 h-4 w-4" />
                                    Export CSV
                                </Button>
                            </div>
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
                                        <TableHead className="text-center w-[120px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={canSeeAllOutlets ? 10 : 9} className="text-center py-8 text-muted-foreground">
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
                                                {canSeeAllOutlets && (
                                                    <TableCell>
                                                        {outlets.find(o => o.kode_outlet === item.kode_outlet)?.name_outlet || item.kode_outlet}
                                                    </TableCell>
                                                )}
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
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {/* Print GR (or PO fallback) */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title={item.latest_gr_id ? "Print Goods Receipt" : "Print Purchase Order"}
                                                            className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                                            onClick={() => {
                                                                if (item.latest_gr_id) {
                                                                    window.open(`/procurement/goods-receipt/${item.latest_gr_id}/print`, '_blank')
                                                                } else {
                                                                    window.open(`/procurement/purchase-orders/${item.po_id}/print`, '_blank')
                                                                }
                                                            }}
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>

                                                        {/* View Uploaded Goods Receipt Photo (beside Print icon) */}
                                                        {item.receipt_image_url ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Lihat Foto Penerimaan Barang"
                                                                className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                                onClick={() =>
                                                                    setPreviewImage({
                                                                        url: item.receipt_image_url!,
                                                                        title: `Bukti Penerimaan PO: ${item.document_number} (${item.item_name})`,
                                                                    })
                                                                }
                                                            >
                                                                <ImageIcon className="h-4 w-4" />
                                                            </Button>
                                                        ) : (
                                                            <div
                                                                className="h-8 w-8 flex items-center justify-center text-slate-300 select-none"
                                                                title="Tidak ada foto bukti penerimaan"
                                                            >
                                                                -
                                                            </div>
                                                        )}
                                                    </div>
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

            {/* Goods Receipt Photo Preview Dialog */}
            <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{previewImage?.title || 'Bukti Foto Penerimaan Barang'}</DialogTitle>
                    </DialogHeader>
                    {previewImage && (
                        <div className="flex items-center justify-center bg-slate-900/5 rounded-lg p-2 max-h-[70vh] overflow-auto">
                            <img
                                src={previewImage.url}
                                alt={previewImage.title}
                                className="max-h-[65vh] w-auto object-contain rounded"
                            />
                        </div>
                    )}
                    <DialogFooter>
                        {previewImage && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(previewImage.url, '_blank')}
                            >
                                <ExternalLink className="h-4 w-4 mr-1.5" />
                                Buka di Tab Baru
                            </Button>
                        )}
                        <Button variant="secondary" size="sm" onClick={() => setPreviewImage(null)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    )
}
