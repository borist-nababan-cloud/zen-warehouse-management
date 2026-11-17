import { useAuthUser } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { reportService } from '@/services/reportService'
import { SupplierPerformanceTable } from '@/features/reports/components/SupplierPerformanceTable'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Loader2, AlertCircle, Store, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { printReportA4 } from '@/utils/reportPrintUtils'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from '@/components/ui/label'
import { masterOutletService } from '@/services/masterOutletService'
import { useState, useEffect } from 'react'

export const SupplierPerformanceReportPage = () => {
    const { user } = useAuthUser()

    // Outlet Logic
    const [selectedOutlet, setSelectedOutlet] = useState<string>('')
    const [availableOutlets, setAvailableOutlets] = useState<{ kode_outlet: string, name_outlet: string }[]>([])
    const canSelectOutlet = user?.user_role === 5 || user?.user_role === 8

    useEffect(() => {
        if (!canSelectOutlet && user?.kode_outlet) {
            setSelectedOutlet(user.kode_outlet)
        } else if (canSelectOutlet) {
            setSelectedOutlet('ALL')
        }
    }, [user, canSelectOutlet])

    useEffect(() => {
        if (canSelectOutlet) {
            masterOutletService.getAllWhOutlet()
                .then(setAvailableOutlets)
                .catch(err => console.error(err))
        }
    }, [canSelectOutlet])

    // Fetch Data
    const { data: apiResponse, isLoading, error } = useQuery({
        queryKey: ['report-supplier-performance', selectedOutlet],
        queryFn: () => {
            return reportService.getSupplierPerformanceReport(selectedOutlet || user?.kode_outlet || '')
        },
        enabled: !!selectedOutlet,
    })

    const data = apiResponse?.data || []

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-[400px] items-center justify-center space-x-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-muted-foreground">Menganalisis kinerja pemasok...</span>
                </div>
            </DashboardLayout>
        )
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="flex h-[400px] flex-col items-center justify-center space-y-4 text-destructive">
                    <AlertCircle className="h-10 w-10" />
                    <p className="font-medium">Gagal memuat data kinerja pemasok</p>
                    <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
                </div>
            </DashboardLayout>
        )
    }

    const handlePrintReport = async () => {
        if (data.length === 0) {
            toast.error('Tidak ada data untuk dicetak')
            return
        }

        const totalPos = data.reduce((sum, r) => sum + Number(r.total_pos || 0), 0)
        const totalSpend = data.reduce((sum, r) => sum + Number(r.total_spend || 0), 0)

        await printReportA4({
            title: 'Laporan Kinerja Pemasok',
            subtitle: 'Evaluasi keandalan pemasok berdasarkan tingkat pemenuhan pesanan dan total nilai belanja.',
            canSelectOutlet,
            selectedOutlet,
            userOutletCode: user?.kode_outlet,
            availableOutlets,
            startDate: null,
            endDate: null,
            statusLabel: 'Semua Pemasok',
            summaryItems: [
                { label: 'Total Pemasok', value: `${data.length} Pemasok` },
                { label: 'Total PO', value: `${totalPos} PO` },
                { label: 'Total Nilai Belanja', value: formatCurrency(totalSpend) },
            ],
            columns: [
                { header: 'Nama Pemasok' },
                { header: 'Total PO', align: 'right', width: '65px' },
                { header: 'Jml Dipesan', align: 'right', width: '80px' },
                { header: 'Jml Diterima', align: 'right', width: '80px' },
                { header: 'Pemenuhan', align: 'right', width: '75px' },
                { header: 'Total Belanja', align: 'right', width: '115px' },
            ],
            rows: data.map((row) => [
                row.supplier_name || '-',
                Number(row.total_pos || 0).toLocaleString('id-ID'),
                Number(row.total_qty_ordered || 0).toLocaleString('id-ID'),
                Number(row.total_qty_received || 0).toLocaleString('id-ID'),
                `${row.fulfillment_rate_percent}%`,
                formatCurrency(Number(row.total_spend || 0)),
            ]),
            totalRow: [
                `TOTAL (${data.length} Pemasok)`,
                totalPos.toLocaleString('id-ID'),
                '',
                '',
                '',
                formatCurrency(totalSpend),
            ],
        })
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Laporan Kinerja Pemasok</h1>
                        <p className="text-muted-foreground">
                            Evaluasi keandalan pemasok berdasarkan tingkat pemenuhan pesanan dan total nilai belanja.
                        </p>
                    </div>
                    <Button
                        onClick={handlePrintReport}
                        disabled={isLoading || data.length === 0}
                        variant="outline"
                        className="gap-2 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    >
                        <Printer className="h-4 w-4" />
                        Cetak
                    </Button>
                </div>

                {/* Outlet Filter for Role 5 & 8 */}
                {canSelectOutlet && (
                    <div className="flex flex-col gap-4 md:flex-row md:items-end p-4 bg-white rounded-lg border shadow-sm">
                        <div className="space-y-2 w-full md:w-1/3">
                            <Label>Outlet</Label>
                            <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                <SelectTrigger className="w-full bg-white">
                                    <div className="flex items-center gap-2">
                                        <Store className="h-4 w-4 text-muted-foreground" />
                                        <SelectValue placeholder="Pilih Outlet" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">SEMUA OUTLET</SelectItem>
                                    {availableOutlets.map((outlet) => (
                                        <SelectItem key={outlet.kode_outlet} value={outlet.kode_outlet}>
                                            {outlet.name_outlet}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                <SupplierPerformanceTable data={data} />
            </div>
        </DashboardLayout>
    )
}
