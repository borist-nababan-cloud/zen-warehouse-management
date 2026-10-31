import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuthUser } from '@/hooks/useAuth'
import { useCashFlowReport } from '@/hooks/useFinance'
import { masterOutletService } from '@/services/masterOutletService'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Download, Printer, TrendingUp, TrendingDown, DollarSign, Store } from 'lucide-react'
import { CashFlowItem, MasterOutlet } from '@/types/database'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFinancialAccounts } from '@/hooks/useBankCash'
import { FinancialAccount } from '@/services/financeService'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { printReportA4 } from '@/utils/reportPrintUtils'
import { toast } from 'sonner'

export default function CashFlowReportPage() {
    const { user } = useAuthUser()
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    const [selectedAccount, setSelectedAccount] = useState<string>('ALL')
    const [selectedOutlet, setSelectedOutlet] = useState<string>('')
    const [availableOutlets, setAvailableOutlets] = useState<MasterOutlet[]>([])

    const canSelectOutlet = [5, 8, 13, 14].includes(Number(user?.user_role))

    useEffect(() => {
        if (!canSelectOutlet && user?.kode_outlet) {
            setSelectedOutlet(user.kode_outlet)
        } else if (canSelectOutlet) {
            setSelectedOutlet('ALL')
        }
    }, [user, canSelectOutlet])

    useEffect(() => {
        if (canSelectOutlet) {
            masterOutletService
                .getAllWhOutlet()
                .then(setAvailableOutlets)
                .catch((err) => console.error(err))
        }
    }, [canSelectOutlet])

    const activeOutletFilter = selectedOutlet || user?.kode_outlet || undefined

    const { data: accountsData } = useFinancialAccounts(activeOutletFilter)
    const accounts = accountsData?.data || []

    const { data: reportData, isLoading } = useCashFlowReport(activeOutletFilter, startDate, endDate)
    const fullData = reportData?.data || []

    // Client-side Filtering
    const filteredData = fullData.filter((item: CashFlowItem) => {
        const matchesAccount = selectedAccount === 'ALL' || item.account_name === selectedAccount
        return matchesAccount
    })

    // Summaries
    const totalInflow = filteredData.reduce((sum: number, item: CashFlowItem) => sum + (item.money_in || 0), 0)
    const totalOutflow = filteredData.reduce((sum: number, item: CashFlowItem) => sum + (item.money_out || 0), 0)
    const netChange = totalInflow - totalOutflow

    // Helper: Format Currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
    }

    const handleExport = () => {
        if (!filteredData.length) {
            toast.error('Tidak ada data untuk diekspor')
            return
        }

        const headers = ['Tanggal / Waktu', 'Rekening / Kas', 'Tipe Transaksi', 'Deskripsi', 'Kas Masuk', 'Kas Keluar', 'Saldo Akhir']
        const rows = filteredData.map((item: CashFlowItem) => [
            format(new Date(item.created_at), 'yyyy-MM-dd HH:mm'),
            `"${item.account_name}"`,
            item.transaction_type,
            `"${item.description || ''}"`,
            item.money_in,
            item.money_out,
            item.balance_after
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map((row: (string | number)[]) => row.join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `Laporan_Arus_Kas_${startDate}_sd_${endDate}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handlePrintReport = async () => {
        if (!filteredData.length) {
            toast.error('Tidak ada data untuk dicetak')
            return
        }

        await printReportA4({
            title: 'Laporan Arus Kas',
            subtitle: 'Catatan mutasi kas masuk, kas keluar, dan saldo akhir rekening/kas.',
            canSelectOutlet,
            selectedOutlet: selectedOutlet || user?.kode_outlet || 'ALL',
            userOutletCode: user?.kode_outlet,
            availableOutlets,
            startDate,
            endDate,
            statusLabel: selectedAccount === 'ALL' ? 'Semua Rekening / Kas' : `Rekening: ${selectedAccount}`,
            summaryItems: [
                { label: 'Total Kas Masuk', value: formatCurrency(totalInflow) },
                { label: 'Total Kas Keluar', value: formatCurrency(totalOutflow) },
                { label: 'Perubahan Bersih (Net)', value: formatCurrency(netChange) },
            ],
            columns: [
                { header: 'Tanggal / Waktu', width: '15%' },
                { header: 'Rekening / Kas', width: '16%' },
                { header: 'Tipe', align: 'center', width: '11%' },
                { header: 'Deskripsi / Keterangan', width: '25%' },
                { header: 'Kas Masuk', align: 'right', width: '11%' },
                { header: 'Kas Keluar', align: 'right', width: '11%' },
                { header: 'Saldo Akhir', align: 'right', width: '11%' },
            ],
            rows: filteredData.map((item: CashFlowItem) => [
                format(new Date(item.created_at), 'dd/MMM/yyyy HH:mm'),
                item.account_name,
                item.transaction_type,
                item.description || '-',
                item.money_in > 0 ? formatCurrency(item.money_in) : '-',
                item.money_out > 0 ? formatCurrency(item.money_out) : '-',
                formatCurrency(item.balance_after),
            ]),
            totalRow: [
                '',
                '',
                '',
                'TOTAL MUTASI',
                formatCurrency(totalInflow),
                formatCurrency(totalOutflow),
                formatCurrency(netChange),
            ],
        })
    }

    if (isLoading) return <DashboardLayout><div className="p-8">Memuat data laporan arus kas...</div></DashboardLayout>

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Laporan Arus Kas</h1>
                        <p className="text-slate-500 text-sm">Pantau mutasi kas masuk, kas keluar, dan saldo rekening/kas.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handlePrintReport}
                            disabled={filteredData.length === 0}
                            variant="outline"
                            className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        >
                            <Printer className="mr-2 h-4 w-4" /> Cetak
                        </Button>
                        <Button onClick={handleExport} disabled={filteredData.length === 0} className="bg-slate-800 hover:bg-slate-700">
                            <Download className="mr-2 h-4 w-4" /> Ekspor CSV
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-slate-500">Filter Laporan</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-500">Tanggal Mulai</label>
                            <input
                                type="date"
                                className="border rounded p-2 text-sm bg-white"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-500">Tanggal Akhir</label>
                            <input
                                type="date"
                                className="border rounded p-2 text-sm bg-white"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        {canSelectOutlet && (
                            <div className="flex flex-col gap-2 min-w-[220px]">
                                <label className="text-xs font-semibold text-slate-500">Outlet</label>
                                <Select
                                    value={selectedOutlet}
                                    onValueChange={(val) => {
                                        setSelectedOutlet(val)
                                        setSelectedAccount('ALL')
                                    }}
                                >
                                    <SelectTrigger className="bg-white">
                                        <div className="flex items-center gap-2">
                                            <Store className="h-4 w-4 text-muted-foreground" />
                                            <SelectValue placeholder="Pilih Outlet" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Semua Outlet (ALL OUTLET)</SelectItem>
                                        {availableOutlets.map((outlet) => (
                                            <SelectItem key={outlet.kode_outlet} value={outlet.kode_outlet}>
                                                {outlet.name_outlet} ({outlet.kode_outlet})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex flex-col gap-2 min-w-[200px]">
                            <label className="text-xs font-semibold text-slate-500">Rekening / Kas</label>
                            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Semua Rekening" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua Rekening / Kas</SelectItem>
                                    {accounts.map((acc: FinancialAccount) => (
                                        <SelectItem key={acc.id} value={acc.account_name}>{acc.account_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Total Kas Masuk</CardTitle>
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600 font-mono">{formatCurrency(totalInflow)}</div>
                            <p className="text-xs text-slate-500 mt-1">Total Penerimaan Dana</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Total Kas Keluar</CardTitle>
                            <TrendingDown className="h-4 w-4 text-rose-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-rose-600 font-mono">{formatCurrency(totalOutflow)}</div>
                            <p className="text-xs text-slate-500 mt-1">Total Pengeluaran Dana</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Perubahan Bersih (Net)</CardTitle>
                            <DollarSign className="h-4 w-4 text-slate-500" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold font-mono ${netChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatCurrency(netChange)}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Kas Masuk - Kas Keluar</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Data Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Riwayat Transaksi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal / Waktu</TableHead>
                                    <TableHead>Rekening / Kas</TableHead>
                                    <TableHead>Tipe</TableHead>
                                    <TableHead>Deskripsi / Keterangan</TableHead>
                                    <TableHead className="text-right text-emerald-600 font-bold">Kas Masuk</TableHead>
                                    <TableHead className="text-right text-rose-600 font-bold">Kas Keluar</TableHead>
                                    <TableHead className="text-right">Saldo Akhir</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-slate-500">
                                            Tidak ada transaksi yang ditemukan untuk periode terpilih.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((item: CashFlowItem, index: number) => {
                                        return (
                                            <TableRow key={`${item.created_at}-${index}`}>
                                                <TableCell className="font-mono text-xs text-slate-600">
                                                    {format(new Date(item.created_at), 'yyyy-MM-dd HH:mm')}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-700">{item.account_name}</TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                                                        {item.transaction_type}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-slate-600 max-w-[300px] truncate" title={item.description}>
                                                    {item.description}
                                                </TableCell>
                                                <TableCell className={`text-right font-mono font-medium ${item.money_in > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                    {item.money_in > 0 ? formatCurrency(item.money_in) : '-'}
                                                </TableCell>
                                                <TableCell className={`text-right font-mono font-medium ${item.money_out > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                                    {item.money_out > 0 ? formatCurrency(item.money_out) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-slate-700">
                                                    {formatCurrency(item.balance_after)}
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
