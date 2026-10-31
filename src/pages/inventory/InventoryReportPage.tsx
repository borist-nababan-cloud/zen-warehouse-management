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
import { Download, Printer, Search, Package, TrendingUp, DollarSign, Store } from 'lucide-react'
import { startOfMonth, format } from 'date-fns'
import { Label } from '@/components/ui/label'
import { printReportA4 } from '@/utils/reportPrintUtils'
import { toast } from 'sonner'

export default function InventoryReportPage() {
    const { user } = useAuthUser()

    // --- Outlet Filter Logic ---
    const [selectedOutlet, setSelectedOutlet] = useState<string>('')
    const [availableOutlets, setAvailableOutlets] = useState<MasterOutlet[]>([])
    const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
    const [statusFilter, setStatusFilter] = useState<string>('ALL')

    // Check if user is Role 5, 8, 13, 14
    const canSelectOutlet = [5, 8, 13, 14].includes(Number(user?.user_role))

    // Initialize Default Outlet
    useEffect(() => {
        if (!canSelectOutlet && user?.kode_outlet) {
            setSelectedOutlet(user.kode_outlet)
        } else if (canSelectOutlet) {
            setSelectedOutlet('ALL') // Default to ALL for privileged users
        }
    }, [user, canSelectOutlet])

    // Fetch Outlets for Privileged Users
    useEffect(() => {
        if (canSelectOutlet) {
            masterOutletService.getAllWhOutlet()
                .then(setAvailableOutlets)
                .catch(err => console.error("Failed to fetch outlets:", err))
        }
    }, [canSelectOutlet])

    // --- Data Fetching ---
    const { data: reportData, isLoading } = useInventoryReport(selectedOutlet)
    const [searchTerm, setSearchTerm] = useState('')

    // 1. Filter Data (Client-side Search & Status)
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
    const totalAssetValue = filteredData.reduce((sum, item) => sum + (item.valuation_buy_total || 0), 0)
    const totalSalesPotential = filteredData.reduce((sum, item) => sum + (item.valuation_sell_total || 0), 0)

    // Helper: Format Currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'IN_STOCK': return 'Stok Tersedia (> 0)'
            case 'OUT_OF_STOCK': return 'Stok Habis (0)'
            default: return 'Semua Status'
        }
    }

    // 3. Export to CSV
    const handleExport = () => {
        if (!filteredData.length) {
            toast.error('Tidak ada data untuk diekspor')
            return
        }

        const headers = ['SKU', 'Nama Barang', 'Outlet', 'Satuan (UOM)', 'Stok Tersedia', 'Harga Beli', 'Harga Jual', 'Total Nilai Aset', 'Total Nilai Penjualan']
        const rows = filteredData.map(item => [
            item.sku,
            `"${item.item_name}"`,
            `"${item.name_outlet || item.kode_outlet}"`,
            item.purchase_uom,
            item.qty_on_hand,
            item.buy_price,
            item.sell_price,
            item.valuation_buy_total,
            item.valuation_sell_total
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
        link.setAttribute('download', `Laporan_Nilai_Stok_${selectedOutlet}_${timestamp}.csv`)
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
                  { header: 'SKU', width: '12%' },
                  { header: 'Nama Barang', width: '22%' },
                  { header: 'Outlet', width: '13%' },
                  { header: 'Satuan', align: 'center' as const, width: '7%' },
                  { header: 'Stok', align: 'right' as const, width: '8%' },
                  { header: 'Harga Beli', align: 'right' as const, width: '11%' },
                  { header: 'Harga Jual', align: 'right' as const, width: '11%' },
                  { header: 'Nilai Aset', align: 'right' as const, width: '13%' },
                  { header: 'Nilai Jual', align: 'right' as const, width: '13%' },
              ]
            : [
                  { header: 'SKU', width: '13%' },
                  { header: 'Nama Barang', width: '27%' },
                  { header: 'Satuan', align: 'center' as const, width: '8%' },
                  { header: 'Stok Tersedia', align: 'right' as const, width: '10%' },
                  { header: 'Harga Beli', align: 'right' as const, width: '13%' },
                  { header: 'Harga Jual', align: 'right' as const, width: '13%' },
                  { header: 'Nilai Aset', align: 'right' as const, width: '16%' },
                  { header: 'Nilai Penjualan', align: 'right' as const, width: '16%' },
              ]

        const rows = filteredData.map((item) =>
            showOutletCol
                ? [
                      item.sku,
                      item.item_name,
                      item.name_outlet || item.kode_outlet,
                      item.purchase_uom,
                      item.qty_on_hand,
                      formatCurrency(item.buy_price),
                      formatCurrency(item.sell_price),
                      formatCurrency(item.valuation_buy_total),
                      formatCurrency(item.valuation_sell_total),
                  ]
                : [
                      item.sku,
                      item.item_name,
                      item.purchase_uom,
                      item.qty_on_hand,
                      formatCurrency(item.buy_price),
                      formatCurrency(item.sell_price),
                      formatCurrency(item.valuation_buy_total),
                      formatCurrency(item.valuation_sell_total),
                  ]
        )

        const totalRow = showOutletCol
            ? ['', '', '', '', '', '', 'TOTAL', formatCurrency(totalAssetValue), formatCurrency(totalSalesPotential)]
            : ['', '', '', '', '', 'TOTAL', formatCurrency(totalAssetValue), formatCurrency(totalSalesPotential)]

        await printReportA4({
            title: 'Laporan Nilai Stok (Valuasi Inventaris)',
            subtitle: 'Valuasi aset stok secara real-time dan potensi nilai penjualan.',
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
                { label: 'Total Nilai Aset (Beli)', value: formatCurrency(totalAssetValue) },
                { label: 'Potensi Nilai Penjualan', value: formatCurrency(totalSalesPotential) },
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
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Laporan Nilai Stok (Valuasi Inventaris)</h1>
                        <p className="text-muted-foreground">Valuasi nilai aset stok secara real-time dan potensi nilai penjualan.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Outlet Dropdown for Role 5, 8, 13, 14 */}
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
                            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
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

                    <Card className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border-purple-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-purple-900">Total Nilai Aset</CardTitle>
                            <DollarSign className="h-4 w-4 text-purple-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-700">{formatCurrency(totalAssetValue)}</div>
                            <p className="text-xs text-purple-600/80">Berdasarkan Harga Beli</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-900">Potensi Nilai Penjualan</CardTitle>
                            <TrendingUp className="h-4 w-4 text-emerald-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(totalSalesPotential)}</div>
                            <p className="text-xs text-emerald-600/80">Berdasarkan Harga Jual</p>
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
                                    {/* Show Outlet Column if ALL is selected or user is privileged */}
                                    {canSelectOutlet && selectedOutlet === 'ALL' && (
                                        <TableHead className="font-semibold text-slate-700">Outlet</TableHead>
                                    )}
                                    <TableHead className="w-[80px] text-center font-semibold text-slate-700">Satuan</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Stok Tersedia</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Harga Beli</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Harga Jual</TableHead>
                                    <TableHead className="text-right font-bold text-purple-700 bg-purple-50/30">Nilai Aset</TableHead>
                                    <TableHead className="text-right font-bold text-emerald-700 bg-emerald-50/30">Nilai Penjualan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">
                                            Memuat data inventaris...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                            Tidak ada data barang inventaris yang ditemukan.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((item) => (
                                        <TableRow key={`${item.kode_outlet}-${item.sku}`} className="hover:bg-slate-50">
                                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                            <TableCell className="font-medium">{item.item_name}</TableCell>
                                            {/* Show Outlet Cell if ALL is selected */}
                                            {canSelectOutlet && selectedOutlet === 'ALL' && (
                                                <TableCell className="text-xs text-muted-foreground">{item.name_outlet || item.kode_outlet}</TableCell>
                                            )}
                                            <TableCell className="text-center text-xs text-muted-foreground">{item.purchase_uom}</TableCell>
                                            <TableCell className="text-right font-bold text-slate-700">{item.qty_on_hand}</TableCell>
                                            <TableCell className="text-right text-muted-foreground text-xs">{formatCurrency(item.buy_price)}</TableCell>
                                            <TableCell className="text-right text-muted-foreground text-xs">{formatCurrency(item.sell_price)}</TableCell>
                                            <TableCell className="text-right font-mono font-medium text-purple-700 bg-purple-50/10">
                                                {formatCurrency(item.valuation_buy_total)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium text-emerald-700 bg-emerald-50/10">
                                                {formatCurrency(item.valuation_sell_total)}
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
