import React from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { ViewReportPoOutstanding } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Phone } from 'lucide-react'

interface OutstandingPoTableProps {
    data: ViewReportPoOutstanding[]
}

export const OutstandingPoTable: React.FC<OutstandingPoTableProps> = ({ data }) => {
    if (data.length === 0) {
        return (
            <div className="text-center p-8 border rounded-lg bg-orange-50 text-orange-600">
                No outstanding items found. All clear!
            </div>
        )
    }

    return (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-orange-50/50">
                    <TableRow>
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-center">Ordered</TableHead>
                        <TableHead className="text-center">Received</TableHead>
                        <TableHead className="text-center font-bold text-orange-600">Remaining</TableHead>
                        <TableHead className="text-right">Pending Value</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={index} className="hover:bg-orange-50/20">
                            <TableCell className="font-medium text-slate-600">
                                {formatDate(row.po_created_at)}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-slate-500">
                                {row.document_number}
                            </TableCell>
                            <TableCell>
                                <div className="font-medium text-slate-800">{row.supplier_name}</div>
                                {row.supplier_phone && (
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <Phone className="h-3 w-3" />
                                        <span>{row.supplier_phone}</span>
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="text-slate-700 font-medium">
                                {row.item_name}
                            </TableCell>
                            <TableCell className="text-center text-slate-500">
                                {row.qty_ordered}
                            </TableCell>
                            <TableCell className="text-center text-slate-500">
                                {row.qty_received}
                            </TableCell>
                            <TableCell className="text-center font-bold text-orange-600 bg-orange-50/50">
                                {row.qty_remaining}
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-700">
                                {formatCurrency(row.estimated_pending_value)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
