import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { getStoTransitReport } from '@/services/stoReportService'
import { StoTransitReportItem } from '@/types/database'
import { DashboardLayout } from '@/components/layout/Sidebar'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { AlertCircle, ArrowRight, Package } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export function ReportStoTransitPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<StoTransitReportItem[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const fetchReport = async () => {
            if (!user?.kode_outlet) return
            setIsLoading(true)
            const res = await getStoTransitReport(user.kode_outlet)
            if (res.isSuccess && res.data) {
                setData(res.data)
            }
            setIsLoading(false)
        }
        fetchReport()
    }, [user?.kode_outlet])

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Stock In Transit Report</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Live tracking of shipments currently on the road.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="bg-red-50/50 border-red-100 dark:bg-red-950/10 dark:border-red-900">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-red-700 dark:text-red-400 text-lg flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                High Risk (Delayed)
                            </CardTitle>
                            <CardDescription>Shipments in transit for more than 3 days</CardDescription>
                        </CardHeader>
                    </Card>
                    <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-blue-700 dark:text-blue-400 text-lg">Normal Transit</CardTitle>
                            <CardDescription>Shipments within expected timeframe (≤ 3 days)</CardDescription>
                        </CardHeader>
                    </Card>
                </div>

                <Card className="border-pastel-blue/20 shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead>Document No</TableHead>
                                    <TableHead>Shipped Date</TableHead>
                                    <TableHead className="text-center">Route</TableHead>
                                    <TableHead className="text-right">Value in Transit</TableHead>
                                    <TableHead className="text-center">Days in Transit</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Loading...</TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No shipments currently in transit.</TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item) => {
                                        const isDelayed = item.days_in_transit > 3

                                        return (
                                            <TableRow
                                                key={item.sto_id}
                                                className={cn(
                                                    "transition-colors",
                                                    isDelayed ? "bg-red-50/70 hover:bg-red-100/70 dark:bg-red-900/10" : "bg-blue-50/30 hover:bg-blue-100/30 dark:bg-blue-900/10"
                                                )}
                                            >
                                                <TableCell className="font-medium">{item.document_number}</TableCell>
                                                <TableCell>{format(new Date(item.shipped_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-center gap-2 text-sm">
                                                        <span className={item.from_outlet === user?.kode_outlet ? "font-bold text-gray-700" : "text-muted-foreground"}>
                                                            {item.from_outlet || '???'}
                                                        </span>
                                                        <ArrowRight className={cn("h-4 w-4", isDelayed ? "text-red-400" : "text-blue-400")} />
                                                        <span className={item.to_outlet === user?.kode_outlet ? "font-bold text-gray-700" : "text-muted-foreground"}>
                                                            {item.to_outlet}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-medium">
                                                    {formatCurrency(item.grand_total)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded-md text-xs font-bold",
                                                        isDelayed ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                                    )}>
                                                        {item.days_in_transit} Days
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        SHIPPED
                                                    </span>
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
