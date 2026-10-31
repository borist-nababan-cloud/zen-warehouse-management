import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { useOpnameVarianceReport } from '@/hooks/useInventory'
import { masterOutletService } from '@/services/masterOutletService'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Download, Printer, AlertTriangle, TrendingUp, TrendingDown, Scale, Search, Store } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { MasterOutlet, OpnameVarianceItem } from '@/types/database'
import { printReportA4 } from '@/utils/reportPrintUtils'
import { toast } from 'sonner'

export default function StockOpnameVariancePage() {
    const { user } = useAuthUser()

    // Filters State
    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })
    const [showOnlyDiscrepancies, setShowOnlyDiscrepancies] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Outlet Logic
    const [selectedOutlet, setSelectedOutlet] = useState<string>('')
    const [availableOutlets, setAvailableOutlets] = useState<MasterOutlet[]>([])
    const canSelectOutlet = [5, 8, 13, 14].includes(Number(user?.user_role))

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

    // Fetch Data
    const { data: reportData, isLoading } = useOpnameVarianceReport(
        selectedOutlet || undefined,
        dateRange.startDate,
        dateRange.endDate
    )

    const fullData = reportData?.data || []

    // Client-side Filtering
    const filteredData = fullData.filter((item: OpnameVarianceItem) => {
        const diff = Number(item.difference) || 0
        const matchesDiscrepancy = !showOnlyDiscrepancies || diff !== 0
        const matchesSearch = (item.item_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.document_number || '').toLowerCase().includes(searchTerm.toLowerCase())

        return matchesDiscrepancy && matchesSearch
    })

    // Summaries
    const totalVarianceValueAbs = filteredData.reduce((sum: number, item: OpnameVarianceItem) => sum + Math.abs(Number(item.variance_value) || 0), 0)
    const totalNetValue = filteredData.reduce((sum: number, item: OpnameVarianceItem) => sum + (Number(item.variance_value) || 0), 0)
    const itemsWithVariance = filteredData.filter((item: OpnameVarianceItem) => (Number(item.difference) || 0) !== 0).length

    // Helper: Format Currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    // Export CSV
    const handleExport = () => {
        if (!filteredData.length) {
            toast.error('Tidak ada data untuk diekspor')
            return
        }

        const headers = ['Tanggal', 'Outlet', 'No. Dokumen', 'SKU', 'Nama Barang', 'Stok Sistem', 'Stok Aktual', 'Selisih', 'Biaya Satuan', 'Nilai Selisih']
        const rows = filteredData.map((item: OpnameVarianceItem) => [
            format(new Date(item.opname_date), 'yyyy-MM-dd'),
            `"${item.kode_outlet || ''}"`,
            item.document_number,
            item.sku,
            `"${item.item_name}"`,
            item.system_qty,
            item.actual_qty,
            item.difference,
            item.unit_cost,
            item.variance_value
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map((row: (string | number)[]) => row.join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        const timestamp = format(new Date(), 'yyyyMMdd_HHmm')
        link.setAttribute('href', url)
        link.setAttribute('download', `Laporan_Selisih_Opname_${selectedOutlet || user?.kode_outlet}_${timestamp}.csv`)
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
                  { header: 'Tanggal', width: '10%' },
                  { header: 'Outlet', width: '10%' },
                  { header: 'No. Dokumen', width: '14%' },
                  { header: 'SKU', width: '11%' },
                  { header: 'Nama Barang', width: '21%' },
                  { header: 'Sistem', align: 'right' as const, width: '7%' },
                  { header: 'Aktual', align: 'right' as const, width: '7%' },
                  { header: 'Selisih', align: 'right' as const, width: '7%' },
                  { header: 'Nilai Selisih', align: 'right' as const, width: '13%' },
              ]
            : [
                  { header: 'Tanggal', width: '11%' },
                  { header: 'No. Dokumen', width: '16%' },
                  { header: 'SKU', width: '13%' },
                  { header: 'Nama Barang', width: '24%' },
                  { header: 'Stok Sistem', align: 'right' as const, width: '7%' },
                  { header: 'Stok Aktual', align: 'right' as const, width: '7%' },
                  { header: 'Selisih', align: 'right' as const, width: '7%' },
                  { header: 'Nilai Selisih', align: 'right' as const, width: '15%' },
              ]

        const rows = filteredData.map((item: OpnameVarianceItem) => {
            const diffStr = item.difference > 0 ? `+${item.difference}` : `${item.difference}`
            const dateStr = format(new Date(item.opname_date), 'dd/MMM/yyyy')
            return showOutletCol
                ? [
                      dateStr,
                      item.kode_outlet || '-',
                      item.document_number,
                      item.sku,
                      item.item_name,
                      item.system_qty,
                      item.actual_qty,
                      diffStr,
                      formatCurrency(item.variance_value),
                  ]
                : [
                      dateStr,
                      item.document_number,
                      item.sku,
                      item.item_name,
                      item.system_qty,
                      item.actual_qty,
                      diffStr,
                      formatCurrency(item.variance_value),
                  ]
        })

        const totalDiffQty = filteredData.reduce((sum: number, item: OpnameVarianceItem) => sum + (item.difference || 0), 0)
        const totalDiffStr = totalDiffQty > 0 ? `+${totalDiffQty}` : `${totalDiffQty}`

        const totalRow = showOutletCol
            ? ['', '', '', '', '', '', 'TOTAL BERSIH', totalDiffStr, formatCurrency(totalNetValue)]
            : ['', '', '', '', '', 'TOTAL BERSIH', totalDiffStr, formatCurrency(totalNetValue)]

        await printReportA4({
            title: 'Laporan Selisih Stock Opname',
            subtitle: 'Audit akurasi inventaris dan dampak finansial dari selisih perhitungan stok.',
            canSelectOutlet,
            selectedOutlet: selectedOutlet || user?.kode_outlet || 'ALL',
            userOutletCode: user?.kode_outlet,
            availableOutlets,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            statusLabel: showOnlyDiscrepancies ? 'Hanya yang Berselisih' : 'Semua Data Opname',
            extraFilters: searchTerm ? [{ label: 'Pencarian', value: searchTerm }] : [],
            summaryItems: [
                { label: 'Total Selisih (Absolut)', value: formatCurrency(totalVarianceValueAbs) },
                { label: 'Rugi / Surplus Bersih (Net)', value: formatCurrency(totalNetValue) },
                { label: 'Barang Berselisih', value: `${itemsWithVariance} SKU` },
            ],
            columns,
            rows,
            totalRow,
        })
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-20 p-6">

                {/* Header & Main Filters */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Laporan Selisih Stock Opname</h1>
                            <p className="text-muted-foreground">Audit akurasi inventaris dan dampak finansial dari selisih perhitungan stok.</p>
                        </div>
                        <div className="flex items-center gap-2">
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
                                className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Ekspor CSV
                            </Button>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <Card className="bg-slate-50 border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex flex-col md:flex-row gap-6 items-end">
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <label className="text-xs font-semibold text-slate-500">Tanggal Mulai</label>
                                <Input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="bg-white"
                                    aria-label="Tanggal Mulai"
                                />
                            </div>

                            {/* Outlet Filter for Role 5, 8, 13, 14 */}
                            {canSelectOutlet && (
                                <div className="flex flex-col gap-2 w-full md:w-auto">
                                    <label className="text-xs font-semibold text-slate-500">Outlet</label>
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
                            <div className="flex flex-col gap-2 w-full md:w-auto">
                                <label className="text-xs font-semibold text-slate-500">Tanggal Akhir</label>
                                <Input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="bg-white"
                                    aria-label="Tanggal Akhir"
                                />
                            </div>

                            <div className="flex items-center space-x-2 pb-2">
                                <Checkbox
                                    id="showDiscrepancies"
                                    checked={showOnlyDiscrepancies}
                                    onChange={(e) => setShowOnlyDiscrepancies(e.target.checked)}
                                    className="cursor-pointer"
                                />
                                <label
                                    htmlFor="showDiscrepancies"
                                    className="text-sm font-medium leading-none cursor-pointer select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700"
                                >
                                    Tampilkan Hanya yang Berselisih
                                </label>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-slate-400">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-900">Total Selisih (Absolut)</CardTitle>
                            <Scale className="h-4 w-4 text-slate-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-700">{formatCurrency(totalVarianceValueAbs)}</div>
                            <p className="text-xs text-slate-600/80">Nilai absolut dari seluruh selisih</p>
                        </CardContent>
                    </Card>

                    <Card className={`bg-white border-l-4 shadow-sm ${totalNetValue < 0 ? 'border-l-red-400 border-red-100' : 'border-l-green-400 border-green-100'}`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className={`text-sm font-medium ${totalNetValue < 0 ? 'text-red-900' : 'text-green-900'}`}>Rugi / Surplus Bersih (Net)</CardTitle>
                            {totalNetValue < 0 ? <TrendingDown className="h-4 w-4 text-red-500" /> : <TrendingUp className="h-4 w-4 text-green-500" />}
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${totalNetValue < 0 ? 'text-red-700' : 'text-green-700'}`}>
                                {formatCurrency(totalNetValue)}
                            </div>
                            <p className={`text-xs ${totalNetValue < 0 ? 'text-red-600/80' : 'text-green-600/80'}`}>
                                {totalNetValue < 0 ? 'Kerugian finansial bersih' : 'Surplus finansial bersih'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-slate-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-900">Barang Berselisih</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-700">{itemsWithVariance}</div>
                            <p className="text-xs text-slate-600/80">Jumlah SKU dengan selisih hitung</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Table */}
                <Card className="shadow-md border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari No. Dokumen, Nama Barang, atau SKU..."
                                    className="pl-8 bg-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                    <TableHead className="w-[100px] font-semibold text-slate-700">Tanggal</TableHead>
                                    {canSelectOutlet && selectedOutlet === 'ALL' && (
                                        <TableHead className="font-semibold text-slate-700">Outlet</TableHead>
                                    )}
                                    <TableHead className="font-semibold text-slate-700">No. Dokumen</TableHead>
                                    <TableHead className="font-semibold text-slate-700">SKU</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Nama Barang</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Stok Sistem</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Stok Aktual</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Selisih</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700 bg-slate-100/50">Nilai Selisih</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">
                                            Memuat data selisih stock opname...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                            Tidak ada data yang sesuai dengan filter saat ini.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((item: OpnameVarianceItem, index: number) => {
                                        const diff = Number(item.difference) || 0
                                        const isLoss = diff < 0
                                        const isGain = diff > 0
                                        const colorClass = isLoss ? 'text-red-600 font-bold' : isGain ? 'text-green-600 font-bold' : 'text-slate-500'

                                        return (
                                            <TableRow key={`${item.document_number}-${item.sku}-${index}`} className="hover:bg-slate-50">
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(item.opname_date), 'dd/MM/yyyy')}
                                                </TableCell>
                                                {canSelectOutlet && selectedOutlet === 'ALL' && (
                                                    <TableCell className="text-xs text-muted-foreground">{item.kode_outlet}</TableCell>
                                                )}
                                                <TableCell className="text-xs font-mono">{item.document_number}</TableCell>
                                                <TableCell className="font-mono text-xs text-slate-500">{item.sku}</TableCell>
                                                <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">{item.system_qty}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">{item.actual_qty}</TableCell>
                                                <TableCell className={`text-right font-mono text-sm ${colorClass}`}>
                                                    {diff > 0 ? `+${diff}` : diff}
                                                </TableCell>
                                                <TableCell className={`text-right font-mono text-sm bg-slate-50/50 ${colorClass}`}>
                                                    {formatCurrency(Number(item.variance_value) || 0)}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
