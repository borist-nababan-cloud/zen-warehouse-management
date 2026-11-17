import { useAuthUser } from '@/hooks/useAuth'
import { useApAgingReport } from '@/hooks/useFinance'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Download, DollarSign, Clock, AlertCircle, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { printReportA4 } from '@/utils/reportPrintUtils'

export default function ApAgingReportPage() {
    const { user } = useAuthUser()
    const { data: reportData, isLoading } = useApAgingReport(user?.kode_outlet || undefined)

    const agingData = reportData?.data || []

    // 1. Calculate Summaries
    const totalDebt = agingData.reduce((sum, item) => sum + item.total_outstanding, 0)
    const healthyDebt = agingData.reduce((sum, item) => sum + item.bucket_current, 0)
    const overdueDebt = agingData.reduce((sum, item) => sum + (item.bucket_1_30 + item.bucket_31_60 + item.bucket_60_plus), 0)

    // Helper: Format Currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    // 2. Export CSV
    const handleExport = () => {
        if (!agingData.length) return

        const headers = ['Creditor Name', 'Total Debt', 'Not Due', '1-30 Days', '31-60 Days', '>60 Days']
        const rows = agingData.map(item => [
            item.creditor_name,
            item.total_outstanding,
            item.bucket_current,
            item.bucket_1_30,
            item.bucket_31_60,
            item.bucket_60_plus
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
        link.setAttribute('download', `ap_aging_${user?.kode_outlet}_${timestamp}.csv`)
        link.style.visibility = 'hidden'

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handlePrintReport = async () => {
        if (!agingData.length) {
            toast.error('Tidak ada data untuk dicetak')
            return
        }

        const totalCurrent = agingData.reduce((s, i) => s + (i.bucket_current || 0), 0)
        const total1_30 = agingData.reduce((s, i) => s + (i.bucket_1_30 || 0), 0)
        const total31_60 = agingData.reduce((s, i) => s + (i.bucket_31_60 || 0), 0)
        const total60Plus = agingData.reduce((s, i) => s + (i.bucket_60_plus || 0), 0)

        await printReportA4({
            title: 'Laporan Umur Hutang (AP Aging)',
            subtitle: 'Rincian kewajiban hutang jatuh tempo berdasarkan kreditur.',
            canSelectOutlet: false,
            selectedOutlet: user?.kode_outlet || '',
            userOutletCode: user?.kode_outlet,
            startDate: null,
            endDate: null,
            statusLabel: 'Hutang Berjalan',
            summaryItems: [
                { label: 'Total Hutang', value: formatCurrency(totalDebt) },
                { label: 'Belum Jatuh Tempo', value: formatCurrency(healthyDebt) },
                { label: 'Jatuh Tempo (Overdue)', value: formatCurrency(overdueDebt) },
            ],
            columns: [
                { header: 'Nama Kreditur' },
                { header: 'Total Hutang', align: 'right', width: '105px' },
                { header: 'Belum JT', align: 'right', width: '90px' },
                { header: '1-30 Hari', align: 'right', width: '90px' },
                { header: '31-60 Hari', align: 'right', width: '90px' },
                { header: '> 60 Hari', align: 'right', width: '90px' },
            ],
            rows: agingData.map((item) => [
                item.creditor_name || '-',
                formatCurrency(item.total_outstanding || 0),
                formatCurrency(item.bucket_current || 0),
                formatCurrency(item.bucket_1_30 || 0),
                formatCurrency(item.bucket_31_60 || 0),
                formatCurrency(item.bucket_60_plus || 0),
            ]),
            totalRow: [
                `TOTAL (${agingData.length} Kreditur)`,
                formatCurrency(totalDebt),
                formatCurrency(totalCurrent),
                formatCurrency(total1_30),
                formatCurrency(total31_60),
                formatCurrency(total60Plus),
            ],
        })
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-20 p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">AP Aging Report</h1>
                        <p className="text-muted-foreground">Detailed breakdown of overdue debts by creditor.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handlePrintReport}
                            disabled={isLoading || agingData.length === 0}
                            variant="outline"
                            className="gap-2 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        >
                            <Printer className="h-4 w-4" />
                            Cetak
                        </Button>
                        <Button
                            onClick={handleExport}
                            disabled={isLoading || agingData.length === 0}
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-red-900">Total Debt</CardTitle>
                            <DollarSign className="h-4 w-4 text-red-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-700">{formatCurrency(totalDebt)}</div>
                            <p className="text-xs text-red-600/80">Total Outstanding Payables</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-900">Healthy (Not Due)</CardTitle>
                            <Clock className="h-4 w-4 text-emerald-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(healthyDebt)}</div>
                            <p className="text-xs text-emerald-600/80">Invoices not yet due</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-amber-900">Overdue (Critical)</CardTitle>
                            <AlertCircle className="h-4 w-4 text-amber-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-700">{formatCurrency(overdueDebt)}</div>
                            <p className="text-xs text-amber-600/80">Sum of all overdue buckets</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Table */}
                <Card className="shadow-md border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                        <CardTitle className="text-lg text-slate-700">Aging Details</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                    <TableHead className="w-[200px] font-semibold text-slate-700">Creditor Name</TableHead>
                                    <TableHead className="text-right font-bold text-slate-800">Total Debt</TableHead>
                                    <TableHead className="text-right font-semibold text-emerald-700 bg-emerald-50/30">Not Due</TableHead>
                                    <TableHead className="text-right font-semibold text-amber-600 bg-amber-50/30">1 - 30 Days</TableHead>
                                    <TableHead className="text-right font-semibold text-orange-600 bg-orange-50/30">31 - 60 Days</TableHead>
                                    <TableHead className="text-right font-bold text-red-600 bg-red-50/30">{'>'} 60 Days</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            Loading data...
                                        </TableCell>
                                    </TableRow>
                                ) : agingData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No outstanding invoices found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {agingData.map((item, index) => (
                                            <TableRow key={index} className="hover:bg-slate-50">
                                                <TableCell className="font-medium text-slate-700">{item.creditor_name}</TableCell>
                                                <TableCell className="text-right font-bold text-slate-700">{formatCurrency(item.total_outstanding)}</TableCell>
                                                <TableCell className="text-right text-emerald-600 font-medium bg-emerald-50/10">
                                                    {item.bucket_current > 0 ? formatCurrency(item.bucket_current) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right text-amber-600 font-medium bg-amber-50/10">
                                                    {item.bucket_1_30 > 0 ? formatCurrency(item.bucket_1_30) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right text-orange-600 font-medium bg-orange-50/10">
                                                    {item.bucket_31_60 > 0 ? formatCurrency(item.bucket_31_60) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right text-red-600 font-bold bg-red-50/10">
                                                    {item.bucket_60_plus > 0 ? formatCurrency(item.bucket_60_plus) : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {/* Footer Row */}
                                        <TableRow className="bg-slate-100 hover:bg-slate-100 font-bold border-t-2">
                                            <TableCell>TOTAL</TableCell>
                                            <TableCell className="text-right">{formatCurrency(totalDebt)}</TableCell>
                                            <TableCell className="text-right text-emerald-700">{formatCurrency(healthyDebt)}</TableCell>
                                            <TableCell className="text-right text-amber-700">{formatCurrency(agingData.reduce((s, i) => s + i.bucket_1_30, 0))}</TableCell>
                                            <TableCell className="text-right text-orange-700">{formatCurrency(agingData.reduce((s, i) => s + i.bucket_31_60, 0))}</TableCell>
                                            <TableCell className="text-right text-red-700">{formatCurrency(agingData.reduce((s, i) => s + i.bucket_60_plus, 0))}</TableCell>
                                        </TableRow>
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
