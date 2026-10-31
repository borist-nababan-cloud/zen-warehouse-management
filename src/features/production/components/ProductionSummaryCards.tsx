import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Package, Activity } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ProductionSummaryCardsProps {
    totalValue: number
    totalYield: number
    runCount: number
}

export const ProductionSummaryCards: React.FC<ProductionSummaryCardsProps> = ({
    totalValue,
    totalYield,
    runCount,
}) => {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-white border-l-4 border-l-indigo-500 shadow-sm transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Nilai Produksi
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-indigo-700">
                        {formatCurrency(totalValue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Total biaya bahan baku yang digunakan
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Hasil Produksi (Yield)
                    </CardTitle>
                    <Package className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-700">
                        {totalYield.toLocaleString('id-ID')} <span className="text-sm font-normal">Unit</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Total kuantitas produk jadi yang dihasilkan
                    </p>
                </CardContent>
            </Card>

            <Card className="bg-white border-l-4 border-l-emerald-500 shadow-sm transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Proses Produksi
                    </CardTitle>
                    <Activity className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-700">
                        {runCount}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Jumlah batch produksi yang diselesaikan
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
