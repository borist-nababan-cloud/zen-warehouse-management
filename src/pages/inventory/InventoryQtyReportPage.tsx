import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { useInventoryReport } from '@/hooks/useInventory'
import { masterOutletService } from '@/services/masterOutletService'
import { MasterOutlet } from '@/types/database'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
} from "@/components/ui/select"
import { Download, Printer, Search, Package, Store } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { startOfMonth, format } from 'date-fns'
import { printReportA4 } from '@/utils/reportPrintUtils'
import { toast } from 'sonner'

export default function InventoryQtyReportPage() {
    const { user } = useAuthUser()
    const [selectedOutlet, setSelectedOutlet] = useState<string>('')
    const [availableOutlets, setAvailableOutlets] = useState<MasterOutlet[]>([])
    const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
    const [statusFilter, setStatusFilter] = useState<string>('ALL')

    const canSelectOutlet = [5, 8, 13, 14].includes(Number(user?.user_role))

    // Initialize Default Outlet
    useEffect(() => {
        if (!canSelectOutlet && user?.kode_outlet) {
            setSelectedOutlet(user.kode_outlet)
        } else if (canSelectOutlet) {
            setSelectedOutlet('ALL')
        }
    }, [user, canSelectOutlet])

    // Fetch Outlets
    useEffect(() => {
        if (canSelectOutlet) {
            masterOutletService.getAllWhOutlet()
                .then(setAvailableOutlets)
                .catch(err => console.error(err))
        }
    }, [canSelectOutlet])

    const { data: reportData, isLoading } = useInventoryReport(selectedOutlet)
    const [searchTerm, setSearchTerm] = useState('')

    // 1. Filter Data
    const filteredData = (reportData?.data || []).filter(item => {
        const matchesSearch =
            item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchTerm.toLowerCase())

        if (!matchesSearch) return false

        if (statusFilter === 'IN_STOCK') return (item.qty_on_hand || 0) > 0
        if (statusFilter === 'OUT_OF_STOCK') return (item.qty_on_hand || 0) <= 0
        return true
    })

    // 2. Calculate Summary Metrics
    const totalItems = filteredData.length
    const totalQtyOnHand = filteredData.reduce((sum, item) => sum + (Number(item.qty_on_hand) || 0), 0)

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'IN_STOCK': return 'Stok Tersedia (> 0)'
            case 'OUT_OF_STOCK': return 'Stok Habis (0)'
            default: return 'Semua Status'
        }
    }

    // 3. Export to CSV (Qty Only)
    const handleExport = () => {
        if (!filteredData.length) {
            toast.error('Tidak ada data untuk diekspor')
            return
        }

        const headers = ['SKU', 'Nama Barang', 'Outlet', 'Satuan (UOM)', 'Stok Tersedia']
        const rows = filteredData.map(item => [
            item.sku,
            `"${item.item_name}"`,
            `"${item.name_outlet || item.kode_outlet}"`,
            item.purchase_uom,
            item.qty_on_hand
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        const timestamp = format(new Date(), 'yyyyMMdd_HHmm')
        link.setAttribute('href', url)
        link.setAttribute('download', `Laporan_Kuantitas_Stok_${selectedOutlet || user?.kode_outlet}_${timestamp}.csv`)
        link.style.visibility = 'hidden'

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handlePrintReport = async () => {
        if (!filteredData.length) {
            toast.error('Tidak ada data untuk dicetak')
            return
        }

        const showOutletCol = canSelectOutlet && selectedOutlet === 'ALL'

        const columns = showOutletCol
            ? [
                  { header: 'SKU', width: '18%' },
                  { header: 'Nama Barang', width: '40%' },
                  { header: 'Outlet', width: '18%' },
                  { header: 'Satuan (UOM)', align: 'center' as const, width: '12%' },
                  { header: 'Stok Tersedia', align: 'right' as const, width: '12%' },
              ]
            : [
                  { header: 'SKU', width: '20%' },
                  { header: 'Nama Barang', width: '50%' },
                  { header: 'Satuan (UOM)', align: 'center' as const, width: '15%' },
                  { header: 'Stok Tersedia', align: 'right' as const, width: '15%' },
              ]

        const rows = filteredData.map((item) =>
            showOutletCol
                ? [
                      item.sku,
                      item.item_name,
                      item.name_outlet || item.kode_outlet,
                      item.purchase_uom,
                      item.qty_on_hand,
                  ]
                : [item.sku, item.item_name, item.purchase_uom, item.qty_on_hand]
        )

        const totalRow = showOutletCol
            ? ['', '', '', 'TOTAL KUANTITAS', totalQtyOnHand]
            : ['', '', 'TOTAL KUANTITAS', totalQtyOnHand]

        await printReportA4({
            title: 'Laporan Kuantitas Stok',
            subtitle: 'Jumlah ketersediaan stok barang saat ini berdasarkan item.',
            canSelectOutlet,
            selectedOutlet: selectedOutlet || user?.kode_outlet || 'ALL',
            userOutletCode: user?.kode_outlet,
            availableOutlets,
            startDate,
            endDate,
            statusLabel: getStatusLabel(statusFilter),
            extraFilters: searchTerm ? [{ label: 'Pencarian', value: searchTerm }] : [],
            summaryItems: [
                { label: 'Total Barang (SKU)', value: `${totalItems} SKU` },
                { label: 'Total Kuantitas Fisik', value: `${totalQtyOnHand}` },
            ],
            columns,
            rows,
            totalRow,
        })
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-20 p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Laporan Kuantitas Stok</h1>
                        <p className="text-muted-foreground">Jumlah ketersediaan stok barang saat ini berdasarkan item.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {canSelectOutlet && (
                            <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium hidden md:block">Outlet:</Label>
                                <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                    <SelectTrigger className="w-[220px] bg-white">
                                        <div className="flex items-center gap-2">
                                            <Store className="h-4 w-4 text-muted-foreground" />
                                            <SelectValue placeholder="Pilih Outlet" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">SEMUA OUTLET (ALL OUTLET)</SelectItem>
                                        {availableOutlets.map((outlet) => (
                                            <SelectItem key={outlet.kode_outlet} value={outlet.kode_outlet}>
                                                {outlet.name_outlet}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <Button
                            onClick={handlePrintReport}
                            disabled={isLoading || filteredData.length === 0}
                            variant="outline"
                            className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                        >
                            <Printer className="mr-2 h-4 w-4" />
                            Cetak
                        </Button>
                        <Button
                            onClick={handleExport}
                            disabled={isLoading || filteredData.length === 0}
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Ekspor CSV
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-blue-900">Total Barang</CardTitle>
                            <Package className="h-4 w-4 text-blue-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-700">{totalItems}</div>
                            <p className="text-xs text-blue-600/80">Jumlah SKU dalam stok</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <Card className="shadow-md border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-600">Tanggal Mulai</Label>
                                <Input
                                    type="date"
                                    className="bg-white"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-600">Tanggal Akhir</Label>
                                <Input
                                    type="date"
                                    className="bg-white"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-600">Status Stok</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Semua Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Semua Status</SelectItem>
                                        <SelectItem value="IN_STOCK">Stok Tersedia (&gt; 0)</SelectItem>
                                        <SelectItem value="OUT_OF_STOCK">Stok Habis (0)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-600">Pencarian</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Cari SKU atau Nama Barang..."
                                        className="pl-8 bg-white"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                    <TableHead className="w-[120px] font-semibold text-slate-700">SKU</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Nama Barang</TableHead>
                                    {canSelectOutlet && selectedOutlet === 'ALL' && (
                                        <TableHead className="font-semibold text-slate-700">Outlet</TableHead>
                                    )}
                                    <TableHead className="w-[80px] text-center font-semibold text-slate-700">Satuan</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Stok Tersedia</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            Memuat data inventaris...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            Tidak ada data barang inventaris yang ditemukan.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((item, index) => (
                                        <TableRow key={`${item.sku}-${item.kode_outlet}-${index}`} className="hover:bg-slate-50">
                                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                            <TableCell className="font-medium">{item.item_name}</TableCell>
                                            {canSelectOutlet && selectedOutlet === 'ALL' && (
                                                <TableCell className="text-xs text-muted-foreground">{item.name_outlet || item.kode_outlet}</TableCell>
                                            )}
                                            <TableCell className="text-center text-xs text-muted-foreground">{item.purchase_uom}</TableCell>
                                            <TableCell className="text-right font-bold text-slate-700">{item.qty_on_hand}</TableCell>
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
