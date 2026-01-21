
import { useAuthUser } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { reportService } from '@/services/reportService'
import { SupplierPerformanceTable } from '@/features/reports/components/SupplierPerformanceTable'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Loader2, AlertCircle, Store } from 'lucide-react'
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

    // Filter/Sor logic can be added here if needed, 
    // but reportService already sorts by fulfillment_rate ASC by default.
    const data = apiResponse?.data || []

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-[400px] items-center justify-center space-x-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-muted-foreground">Analyzing supplier performance...</span>
                </div>
            </DashboardLayout>
        )
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="flex h-[400px] flex-col items-center justify-center space-y-4 text-destructive">
                    <AlertCircle className="h-10 w-10" />
                    <p className="font-medium">Failed to load performance data</p>
                    <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Supplier Performance Report</h1>
                    <p className="text-muted-foreground">
                        Evaluate supplier reliability based on order fulfillment rates and spend.
                    </p>
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
                                        <SelectValue placeholder="Select Outlet" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">ALL OUTLETS</SelectItem>
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
