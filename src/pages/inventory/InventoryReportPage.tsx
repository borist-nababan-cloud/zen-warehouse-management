import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { useInventoryReport } from '@/hooks/useInventory'
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
import { Download, Search, Package, TrendingUp, DollarSign, Store } from 'lucide-react'
import { format } from 'date-fns'
import { Label } from '@/components/ui/label'

export default function InventoryReportPage() {
    const { user } = useAuthUser()

    // --- Outlet Filter Logic ---
    const [selectedOutlet, setSelectedOutlet] = useState<string>('')
    const [availableOutlets, setAvailableOutlets] = useState<{ kode_outlet: string, name_outlet: string }[]>([])

    // Check if user is Role 5 (Finance) or 8 (Superuser)
    const canSelectOutlet = user?.user_role === 5 || user?.user_role === 8

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
    // Pass 'ALL' or specific outlet code. The hook/service handles the logic.
    const { data: reportData, isLoading } = useInventoryReport(selectedOutlet)
    const [searchTerm, setSearchTerm] = useState('')

    // 1. Filter Data (Client-side Search)
    const filteredData = reportData?.data?.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

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

    // 3. Export to CSV
    const handleExport = () => {
        if (!filteredData.length) return

        const headers = ['SKU', 'Item Name', 'Outlet', 'UOM', 'Qty On Hand', 'Buy Price', 'Sell Price', 'Total Asset Value', 'Total Sales Value']
        const rows = filteredData.map(item => [
            item.sku,
            item.item_name,
            item.name_outlet || item.kode_outlet, // Include Outlet Name
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
        link.setAttribute('download', `inventory_valuation_${selectedOutlet}_${timestamp}.csv`)
        link.style.visibility = 'hidden'

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-20 p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inventory Valuation Report</h1>
                        <p className="text-muted-foreground">Real-time valuation of stock assets and sales potential.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Outlet Dropdown for Role 5 & 8 */}
                        {canSelectOutlet && (
                            <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium hidden md:block">Outlet:</Label>
                                <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                    <SelectTrigger className="w-[200px] bg-white">
                                        <div className="flex items-center gap-2">
                                            <Store className="h-4 w-4 text-muted-foreground" />
                                            <SelectValue placeholder="Select Outlet" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">ALL OUTLETS</SelectItem>
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
                            onClick={handleExport}
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-blue-900">Total Items</CardTitle>
                            <Package className="h-4 w-4 text-blue-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-700">{totalItems}</div>
                            <p className="text-xs text-blue-600/80">Distinct SKUs in stock</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border-purple-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-purple-900">Total Asset Value</CardTitle>
                            <DollarSign className="h-4 w-4 text-purple-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-700">{formatCurrency(totalAssetValue)}</div>
                            <p className="text-xs text-purple-600/80">Based on Buy Price</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-900">Potential Sales</CardTitle>
                            <TrendingUp className="h-4 w-4 text-emerald-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(totalSalesPotential)}</div>
                            <p className="text-xs text-emerald-600/80">Based on Sell Price</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <Card className="shadow-md border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search SKU or Name..."
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
                                    <TableHead className="w-[120px] font-semibold text-slate-700">SKU</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Item Name</TableHead>
                                    {/* Show Outlet Column if ALL is selected or user is privileged */}
                                    {canSelectOutlet && selectedOutlet === 'ALL' && (
                                        <TableHead className="font-semibold text-slate-700">Outlet</TableHead>
                                    )}
                                    <TableHead className="w-[80px] text-center font-semibold text-slate-700">UOM</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Qty On Hand</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Buy Price</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Sell Price</TableHead>
                                    <TableHead className="text-right font-bold text-purple-700 bg-purple-50/30">Asset Value</TableHead>
                                    <TableHead className="text-right font-bold text-emerald-700 bg-emerald-50/30">Sales Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">
                                            Loading inventory data...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                                            No inventory items found.
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
