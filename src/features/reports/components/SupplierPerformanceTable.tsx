import React from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { ViewReportSupplierPerformance } from '@/types/database'
import { formatCurrency } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface SupplierPerformanceTableProps {
    data: ViewReportSupplierPerformance[]
}

export const SupplierPerformanceTable: React.FC<SupplierPerformanceTableProps> = ({ data }) => {
    if (data.length === 0) {
        return (
            <div className="text-center p-8 border rounded-lg bg-slate-50 text-slate-500">
                No supplier performance data available.
            </div>
        )
    }

    // Helper to determine color based on strict logic: <80 Red, 80-95 Yellow, >95 Green
    const getProgressColor = (value: number) => {
        if (value > 95) return "bg-green-500"
        if (value >= 80) return "bg-yellow-500"
        return "bg-red-500"
    }

    const getScoreLabel = (value: number) => {
        if (value > 95) return "Excellent"
        if (value >= 80) return "Fair"
        return "Poor"
    }

    return (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-100">
                    <TableRow>
                        <TableHead>Supplier Name</TableHead>
                        <TableHead className="text-center">Total POs</TableHead>
                        <TableHead className="text-center">Ordered</TableHead>
                        <TableHead className="text-center">Received</TableHead>
                        <TableHead className="w-[300px]">Fulfillment Rate</TableHead>
                        <TableHead className="text-right">Total Spend</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={index} className="hover:bg-slate-50/50">
                            <TableCell className="font-medium text-slate-800">
                                {row.supplier_name}
                            </TableCell>
                            <TableCell className="text-center text-slate-600">
                                {row.total_pos}
                            </TableCell>
                            <TableCell className="text-center text-slate-500">
                                {row.total_qty_ordered}
                            </TableCell>
                            <TableCell className="text-center text-slate-500">
                                {row.total_qty_received}
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-medium">{row.fulfillment_rate_percent}%</span>
                                        <span className={cn(
                                            "font-semibold",
                                            row.fulfillment_rate_percent > 95 ? "text-green-600" :
                                                row.fulfillment_rate_percent >= 80 ? "text-yellow-600" : "text-red-600"
                                        )}>
                                            {getScoreLabel(row.fulfillment_rate_percent)}
                                        </span>
                                    </div>
                                    <Progress
                                        value={Math.min(row.fulfillment_rate_percent, 100)}
                                        className="h-2"
                                        indicatorClassName={getProgressColor(row.fulfillment_rate_percent)}
                                    />
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-700">
                                {formatCurrency(row.total_spend)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
