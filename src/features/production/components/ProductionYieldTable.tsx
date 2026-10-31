import React from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { ViewReportProductionYield } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface ProductionYieldTableProps {
    data: ViewReportProductionYield[]
    showOutlet?: boolean
    outlets?: { kode_outlet: string, name_outlet: string }[]
}

export const ProductionYieldTable: React.FC<ProductionYieldTableProps> = ({ data, showOutlet = false, outlets = [] }) => {
    if (data.length === 0) {
        return (
            <div className="text-center p-8 border rounded-lg bg-slate-50 text-slate-500">
                Tidak ada data produksi yang ditemukan untuk periode yang dipilih.
            </div>
        )
    }

    return (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-100">
                    <TableRow>
                        <TableHead className="w-[120px]">Tanggal</TableHead>
                        {showOutlet && <TableHead>Outlet</TableHead>}
                        <TableHead>No. Dokumen</TableHead>
                        <TableHead>Nama Produk Jadi</TableHead>
                        <TableHead className="text-center">Hasil (Qty)</TableHead>
                        <TableHead className="text-right font-bold text-indigo-700">
                            Biaya / Unit (HPP)
                        </TableHead>
                        <TableHead className="text-right">Total Biaya</TableHead>
                        <TableHead className="text-center">Bahan Baku</TableHead>
                        <TableHead>Dibuat Oleh</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={index} className="hover:bg-slate-50/50">
                            <TableCell className="font-medium text-slate-600">
                                {formatDate(row.transaction_date)}
                            </TableCell>
                            {showOutlet && (
                                <TableCell className="text-sm">
                                    {outlets.find(o => o.kode_outlet === row.kode_outlet)?.name_outlet || row.kode_outlet}
                                </TableCell>
                            )}
                            <TableCell className="text-xs font-mono text-slate-500">
                                {row.document_number}
                            </TableCell>
                            <TableCell className="font-medium text-slate-800">
                                {row.finished_good_name}
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    {row.qty_produced}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-indigo-700 bg-indigo-50/30">
                                {formatCurrency(row.unit_cost_result)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-700">
                                {formatCurrency(row.total_production_cost)}
                            </TableCell>
                            <TableCell className="text-center text-slate-500 text-sm">
                                {row.ingredient_count} bahan
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm">
                                {row.created_by_name}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
