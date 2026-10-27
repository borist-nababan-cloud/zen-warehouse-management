import { useState, useEffect, useMemo } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { getStoSummaryReport } from '@/services/stoReportService'
import { StoSummaryReportItem } from '@/types/database'
import { DashboardLayout } from '@/components/layout/Sidebar'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { Loader2, Filter, ArrowRight, ArrowUpRight, ArrowDownLeft, Truck } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export function ReportStoSummaryPage() {
    const { user } = useAuthUser()
    const [data, setData] = useState<StoSummaryReportItem[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Filters
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    const [direction, setDirection] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL')

    const fetchReport = async () => {
        if (!user?.kode_outlet) return

        setIsLoading(true)
        const res = await getStoSummaryReport({
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            direction,
            userOutlet: user.kode_outlet
        })

        if (res.isSuccess && res.data) {
            setData(res.data)
        } else {
            toast.error(res.error || "Failed to load report")
        }
        setIsLoading(false)
    }

    // Load on mount/filter change
    useEffect(() => {
        if (user?.kode_outlet) {
            fetchReport()
        }
    }, [user?.kode_outlet]) // Only on mount, user triggers search manually usually? Or we can auto-search

    // Calculate Summaries
    const summaries = useMemo(() => {
        if (!user?.kode_outlet) return { incoming: 0, outgoing: 0, shipping: 0 }

        let incoming = 0
        let outgoing = 0
        let shipping = 0

        data.forEach(item => {
            shipping += (item.shipping_cost || 0)

            if (item.to_outlet === user.kode_outlet) {
                incoming += (item.grand_total || 0)
            }
            if (item.from_outlet === user.kode_outlet) {
                outgoing += (item.grand_total || 0)
            }
        })

        return { incoming, outgoing, shipping }
    }, [data, user?.kode_outlet])

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold font-serif tracking-tight text-zen-charcoal">Ringkasan Laporan STO</h1>
                    <p className="text-muted-foreground text-sm">Ikhtisar seluruh pergerakan transfer stok barang masuk dan keluar.</p>
                </div>

                {/* Filters */}
                <Card className="bg-zen-sand/10 dark:bg-zen-stone/40 border-zen-border shadow-xs">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-zen-charcoal flex items-center gap-2">
                            <Filter className="h-4 w-4 text-zen-moss" /> Parameter Filter
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-zen-charcoal">Dari Tanggal</Label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-zen-charcoal">Sampai Tanggal</Label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-zen-charcoal">Arah Transfer</Label>
                                <Select value={direction} onValueChange={(v: any) => setDirection(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Arah" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Semua Arah</SelectItem>
                                        <SelectItem value="INCOMING">Barang Masuk (Ke Gerai Ini)</SelectItem>
                                        <SelectItem value="OUTGOING">Barang Keluar (Dari Gerai Ini)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={fetchReport} disabled={isLoading} className="bg-zen-moss hover:bg-zen-moss/90 text-white font-medium">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Terapkan Filter
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-l-4 border-l-zen-moss border-zen-border shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Barang Keluar</CardTitle>
                            <ArrowUpRight className="h-4 w-4 text-zen-moss" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-mono text-zen-charcoal">{formatCurrency(summaries.outgoing)}</div>
                            <p className="text-xs text-muted-foreground">Kirim transfer ke gerai cabang lain</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-emerald-600 border-zen-border shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Barang Masuk</CardTitle>
                            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-mono text-zen-charcoal">{formatCurrency(summaries.incoming)}</div>
                            <p className="text-xs text-muted-foreground">Penerimaan pasokan stok dari gerai lain</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-500 border-zen-border shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Ongkos Kirim</CardTitle>
                            <Truck className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-mono text-zen-charcoal">{formatCurrency(summaries.shipping)}</div>
                            <p className="text-xs text-muted-foreground">Biaya logistik pengiriman antar gerai</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Data Table */}
                <Card className="shadow-xs border-zen-border overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>No. Dokumen</TableHead>
                                    <TableHead className="text-center">Rute Pengiriman</TableHead>
                                    <TableHead>Status Pengirim</TableHead>
                                    <TableHead>Status Penerima</TableHead>
                                    <TableHead>Rincian Barang</TableHead>
                                    <TableHead className="text-right">Total Nilai</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground text-sm">Tidak ada data transfer pada periode ini.</TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item, idx) => (
                                        <TableRow key={`${item.id}-${idx}`}>
                                            <TableCell className="whitespace-nowrap font-mono text-xs">{format(new Date(item.order_date), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell className="font-medium font-mono text-xs">{item.document_number}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-2 text-xs">
                                                    <span className={item.from_outlet === user?.kode_outlet ? "font-bold text-zen-moss dark:text-zen-matcha" : "text-muted-foreground"}>
                                                        {item.from_outlet_name || item.from_outlet}
                                                    </span>
                                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className={item.to_outlet === user?.kode_outlet ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                                                        {item.to_outlet_name || item.to_outlet}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zen-sand/20 text-zen-charcoal">
                                                    {item.sender_status}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zen-matcha/20 text-zen-moss">
                                                    {item.recipient_status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground" title={item.items_summary}>
                                                {item.items_summary}
                                            </TableCell>
                                            <TableCell className="text-right font-bold font-mono">
                                                {formatCurrency(item.grand_total)}
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
