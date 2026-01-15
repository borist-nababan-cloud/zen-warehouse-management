import { useState } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { useInventoryReport } from '@/hooks/useInventory'
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
import { Download, Search, Package } from 'lucide-react'
import { format } from 'date-fns'

export default function InventoryQtyReportPage() {
    const { user } = useAuthUser()
    const { data: reportData, isLoading } = useInventoryReport(user?.kode_outlet || '')
    const [searchTerm, setSearchTerm] = useState('')

    // 1. Filter Data
    const filteredData = reportData?.data?.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

    // 2. Calculate Summary Metrics
    const totalItems = filteredData.length
    // Removed Financial Totals

    // 3. Export to CSV (Qty Only)
    const handleExport = () => {
        if (!filteredData.length) return

        const headers = ['SKU', 'Item Name', 'UOM', 'Qty On Hand']
        const rows = filteredData.map(item => [
            item.sku,
            item.item_name,
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
        link.setAttribute('download', `inventory_qty_${user?.kode_outlet}_${timestamp}.csv`)
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
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inventory Quantity Report</h1>
                        <p className="text-muted-foreground">Current stock levels by item.</p>
                    </div>
                    <Button
                        onClick={handleExport}
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
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
                    {/* Removed Financial Cards */}
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
                                    <TableHead className="w-[80px] text-center font-semibold text-slate-700">UOM</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700">Qty On Hand</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            Loading inventory data...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            No inventory items found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((item) => (
                                        <TableRow key={item.sku} className="hover:bg-slate-50">
                                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                            <TableCell className="font-medium">{item.item_name}</TableCell>
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
