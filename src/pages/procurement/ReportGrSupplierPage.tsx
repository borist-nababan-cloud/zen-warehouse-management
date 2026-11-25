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
import { toast } from 'sonner'
import { Loader2, Filter, Download, Printer, Image as ImageIcon } from 'lucide-react'
import { format } from 'date-fns'

import { masterOutletService } from '@/services/masterOutletService'
import { printReportA4 } from '@/utils/reportPrintUtils'
import {
    TransactionImageGalleryDialog,
    normalizeViewReceiptImages,
    type GalleryImageItem,
} from '@/components/common/TransactionImageGalleryDialog'

export function ReportGrSupplierPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<ViewPoDetailsReceived[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [galleryModal, setGalleryModal] = useState<{ title: string; images: GalleryImageItem[] } | null>(null)

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
                toast.error(result.error || "Gagal memuat data laporan")
            }
        } catch (error) {
            console.error(error)
            toast.error("Terjadi kesalahan saat memuat data laporan")
        } finally {
            setIsLoading(false)
        }
    }

    // Export CSV Helper
    const handleExportCSV = () => {
        if (!data || data.length === 0) {
            toast.error("Tidak ada data untuk diekspor")
            return
        }

        // 1. Define Headers
        const headers = [
            "No. PO",
            "Tanggal",
            "Outlet",
            "Nama Barang",
            "SKU",
            "Jml Dipesan",
            "Jml Diterima",
            "Sisa Pesanan",
            "Satuan",
            "Status"
        ]

        // 2. Format Data Rows
        const rows = data.map(item => {
            const status = item.qty_remaining <= 0 ? 'Terpenuhi'
                : item.qty_already_received > 0 ? 'Sebagian'
                    : 'Dipesan'

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
        link.setAttribute('download', `Laporan_Penerimaan_Supplier_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handlePrintReport = async () => {
        if (!data || data.length === 0) {
            toast.error('Tidak ada data untuk dicetak')
            return
        }

        const totalOrdered = data.reduce((sum, i) => sum + Number(i.qty_ordered || 0), 0)
        const totalReceived = data.reduce((sum, i) => sum + Number(i.qty_already_received || 0), 0)
        const totalRemaining = data.reduce((sum, i) => sum + (i.qty_remaining > 0 ? Number(i.qty_remaining) : 0), 0)

        await printReportA4({
            title: 'Laporan Penerimaan Supplier (GR)',
            subtitle: 'Pantau riwayat penerimaan barang masuk terhadap Pesanan Pembelian (PO).',
            canSelectOutlet: canSeeAllOutlets,
            selectedOutlet,
            userOutletCode: user?.kode_outlet,
            availableOutlets: outlets,
            startDate,
            endDate,
            statusLabel: 'Semua Status Penerimaan',
            summaryItems: [
                { label: 'Total Baris Item', value: `${data.length} Item` },
                { label: 'Total Dipesan', value: totalOrdered.toLocaleString('id-ID') },
                { label: 'Total Diterima', value: totalReceived.toLocaleString('id-ID') },
                { label: 'Sisa Pesanan', value: totalRemaining.toLocaleString('id-ID') },
            ],
            columns: [
                { header: 'Tanggal', width: '75px' },
                { header: 'No. PO', width: '115px' },
                { header: 'Outlet', width: '50px' },
                { header: 'SKU', width: '75px' },
                { header: 'Nama Barang' },
                { header: 'Dipesan', align: 'right', width: '55px' },
                { header: 'Diterima', align: 'right', width: '55px' },
                { header: 'Sisa', align: 'right', width: '50px' },
                { header: 'Status', width: '75px' },
            ],
            rows: data.map((item) => {
                const status = item.qty_remaining <= 0 ? 'Terpenuhi' : item.qty_already_received > 0 ? 'Sebagian' : 'Dipesan'
                return [
                    item.po_created_at ? format(new Date(item.po_created_at), 'dd/MM/yyyy') : '-',
                    item.document_number,
                    item.kode_outlet,
                    item.sku || '-',
                    item.item_name || '-',
                    Number(item.qty_ordered || 0).toLocaleString('id-ID'),
                    Number(item.qty_already_received || 0).toLocaleString('id-ID'),
                    (item.qty_remaining > 0 ? Number(item.qty_remaining) : 0).toLocaleString('id-ID'),
                    status,
                ]
            }),
            totalRow: [
                'TOTAL',
                '',
                '',
                '',
                `${data.length} Item`,
                totalOrdered.toLocaleString('id-ID'),
                totalReceived.toLocaleString('id-ID'),
                totalRemaining.toLocaleString('id-ID'),
                '',
            ],
        })
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
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Laporan Penerimaan Supplier (GR)</h1>
                        <p className="text-muted-foreground">
                            Pantau riwayat penerimaan barang masuk terhadap Pesanan Pembelian (PO).
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handlePrintReport}
                            disabled={isLoading || data.length === 0}
                            variant="outline"
                            className="gap-2 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        >
                            <Printer className="h-4 w-4" />
                            Cetak
                        </Button>
                        <Button
                            onClick={handleExportCSV}
                            disabled={isLoading || data.length === 0}
                            variant="outline"
                            className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                            <Download className="h-4 w-4" />
                            Ekspor CSV
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Opsi Filter
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <Label>Tanggal Mulai</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tanggal Akhir</Label>
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
                                            <SelectValue placeholder="Semua Outlet" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Semua Outlet</SelectItem>
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
                                    Terapkan Filter
                                </Button>
                                <Button variant="outline" onClick={handleExportCSV} disabled={data.length === 0} title="Ekspor ke CSV">
                                    <Download className="mr-2 h-4 w-4" />
                                    Ekspor CSV
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
                                        <TableHead>No. PO</TableHead>
                                        <TableHead>Tanggal</TableHead>
                                        {canSeeAllOutlets && <TableHead>Outlet</TableHead>}
                                        <TableHead>Nama Barang</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead className="text-right">Jml Dipesan</TableHead>
                                        <TableHead className="text-right">Jml Diterima</TableHead>
                                        <TableHead className="text-right">Sisa</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-center w-[160px]">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={canSeeAllOutlets ? 10 : 9} className="text-center py-8 text-muted-foreground">
                                                Tidak ada data penerimaan barang yang sesuai dengan filter.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data.map((item) => {
                                            const grImages = normalizeViewReceiptImages(
                                                item.receipt_images,
                                                item.receipt_image_url,
                                                item.document_number
                                            )
                                            return (
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
                                                            Terpenuhi
                                                        </span>
                                                    ) : item.qty_already_received > 0 ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            Sebagian
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                            Dipesan
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {/* Print GR (or PO fallback) */}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title={item.latest_gr_id ? "Cetak Bukti Penerimaan (GR)" : "Cetak Pesanan Pembelian (PO)"}
                                                            className="flex flex-col h-auto py-1 px-2 gap-0.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                                                            onClick={() => {
                                                                if (item.latest_gr_id) {
                                                                    window.open(`/procurement/goods-receipt/${item.latest_gr_id}/print`, '_blank')
                                                                } else {
                                                                    window.open(`/procurement/purchase-orders/${item.po_id}/print`, '_blank')
                                                                }
                                                            }}
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                            <span className="text-[10px] leading-tight font-medium">Cetak</span>
                                                        </Button>

                                                        {/* View Uploaded Goods Receipt Photos (All GRs for this PO) */}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={grImages.length === 0}
                                                            title={
                                                                grImages.length > 0
                                                                    ? `Lihat ${grImages.length} Foto Penerimaan Barang`
                                                                    : 'Tidak ada foto bukti penerimaan'
                                                            }
                                                            className={`flex flex-col h-auto py-1 px-2 gap-0.5 ${
                                                                grImages.length > 0
                                                                    ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50'
                                                                    : 'text-slate-300 dark:text-slate-600'
                                                            }`}
                                                            onClick={() => {
                                                                if (grImages.length === 0) return
                                                                setGalleryModal({
                                                                    title: `Bukti Foto PO: ${item.document_number}`,
                                                                    images: grImages,
                                                                })
                                                            }}
                                                        >
                                                            <ImageIcon className="h-4 w-4" />
                                                            <span className="text-[10px] leading-tight font-medium">
                                                                {grImages.length > 0 ? `Foto (${grImages.length})` : 'Foto'}
                                                            </span>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )})
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <TransactionImageGalleryDialog
                open={!!galleryModal}
                onOpenChange={(open) => !open && setGalleryModal(null)}
                title={galleryModal?.title || 'Bukti Foto Penerimaan Barang'}
                images={galleryModal?.images || []}
            />
        </DashboardLayout>
    )
}
