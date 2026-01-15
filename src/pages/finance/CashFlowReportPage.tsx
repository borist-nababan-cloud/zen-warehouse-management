
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuthUser } from '@/hooks/useAuth'
import { useCashFlowReport } from '@/hooks/useFinance'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { CashFlowItem } from '@/types/database'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFinancialAccounts } from '@/hooks/useBankCash'
import { FinancialAccount } from '@/services/financeService'
import { DashboardLayout } from '@/components/layout/Sidebar'

export default function CashFlowReportPage() {
    const { user } = useAuthUser()
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    const [selectedAccount, setSelectedAccount] = useState<string>('ALL')

    const { data: accountsData } = useFinancialAccounts(user?.kode_outlet)
    const accounts = accountsData?.data || []

    const { data: reportData, isLoading } = useCashFlowReport(user?.kode_outlet ?? undefined, startDate, endDate)
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
        if (!filteredData.length) return

        const headers = ['Date', 'Account', 'Transaction Type', 'Description', 'Money In', 'Money Out', 'Balance After']
        const rows = filteredData.map((item: CashFlowItem) => [
            format(new Date(item.created_at), 'yyyy-MM-dd HH:mm'),
            item.account_name,
            item.transaction_type,
            `"${item.description}"`, // Quote descriptions to handle commas
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
        link.setAttribute('download', `cash_flow_report_${startDate}_to_${endDate}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (isLoading) return <DashboardLayout><div className="p-8">Loading report...</div></DashboardLayout>

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800">Cash Flow Report</h1>
                    <Button onClick={handleExport} disabled={filteredData.length === 0} className="bg-slate-800 hover:bg-slate-700">
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                </div>

                {/* Filters */}
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-slate-500">Filters</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-500">Start Date</label>
                            <input
                                type="date"
                                className="border rounded p-2 text-sm"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-500">End Date</label>
                            <input
                                type="date"
                                className="border rounded p-2 text-sm"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-2 min-w-[200px]">
                            <label className="text-xs font-semibold text-slate-500">Account</label>
                            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="All Accounts" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Accounts</SelectItem>
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
                            <CardTitle className="text-sm font-medium text-slate-500">Total Inflow</CardTitle>
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600 font-mono">{formatCurrency(totalInflow)}</div>
                            <p className="text-xs text-slate-500 mt-1">Total Money In</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Total Outflow</CardTitle>
                            <TrendingDown className="h-4 w-4 text-rose-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-rose-600 font-mono">{formatCurrency(totalOutflow)}</div>
                            <p className="text-xs text-slate-500 mt-1">Total Money Out</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">Net Change</CardTitle>
                            <DollarSign className="h-4 w-4 text-slate-500" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold font-mono ${netChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatCurrency(netChange)}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Inflow - Outflow</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Data Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Transaction History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date / Time</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right text-emerald-600 font-bold">Money In</TableHead>
                                    <TableHead className="text-right text-rose-600 font-bold">Money Out</TableHead>
                                    <TableHead className="text-right">Balance After</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-slate-500">
                                            No transactions found for the selected period.
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
