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
                    <h1 className="text-2xl font-bold font-serif tracking-tight text-zen-charcoal">Laporan STO Dalam Transit</h1>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                        <Package className="h-4 w-4 text-zen-moss" />
                        Pelacakan langsung pengiriman barang yang sedang dalam perjalanan antar outlet.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900 shadow-xs">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-red-700 dark:text-red-400 text-base flex items-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                Risiko Keterlambatan (&gt; 3 Hari)
                            </CardTitle>
                            <CardDescription className="text-xs">Pengiriman barang yang berada di perjalanan lebih dari 3 hari</CardDescription>
                        </CardHeader>
                    </Card>
                    <Card className="bg-zen-sand/15 border-zen-border dark:bg-zen-stone/40 shadow-xs">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-zen-moss dark:text-zen-matcha text-base flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Transit Normal (≤ 3 Hari)
                            </CardTitle>
                            <CardDescription className="text-xs">Pengiriman barang dalam rentang waktu wajar</CardDescription>
                        </CardHeader>
                    </Card>
                </div>

                <Card className="border-zen-border shadow-xs overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>No. Dokumen</TableHead>
                                    <TableHead>Waktu Dikirim</TableHead>
                                    <TableHead className="text-center">Rute Pengiriman</TableHead>
                                    <TableHead className="text-right">Nilai Barang Transit</TableHead>
                                    <TableHead className="text-center">Lama Transit</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground text-sm">Memuat data transit...</TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground text-sm">Tidak ada pengiriman yang sedang dalam transit.</TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item) => {
                                        const isDelayed = item.days_in_transit > 3

                                        return (
                                            <TableRow
                                                key={item.sto_id}
                                                className={cn(
                                                    "transition-colors",
                                                    isDelayed ? "bg-red-50/60 hover:bg-red-100/60 dark:bg-red-950/20" : "hover:bg-muted/30"
                                                )}
                                            >
                                                <TableCell className="font-medium font-mono text-xs">{item.document_number}</TableCell>
                                                <TableCell className="font-mono text-xs">{format(new Date(item.shipped_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-center gap-2 text-xs">
                                                        <span className={item.from_outlet === user?.kode_outlet ? "font-bold text-zen-moss dark:text-zen-matcha" : "text-muted-foreground"}>
                                                            {item.from_outlet_name || item.from_outlet || '-'}
                                                        </span>
                                                        <ArrowRight className={cn("h-3.5 w-3.5", isDelayed ? "text-red-400" : "text-zen-moss")} />
                                                        <span className={item.to_outlet === user?.kode_outlet ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                                                            {item.to_outlet_name || item.to_outlet}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-medium">
                                                    {formatCurrency(item.grand_total)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-md text-[11px] font-bold",
                                                        isDelayed ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" : "bg-zen-matcha/20 text-zen-moss"
                                                    )}>
                                                        {item.days_in_transit} Hari
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zen-sand/20 text-zen-charcoal">
                                                        DIKIRIM
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
