
import { useAuthUser } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { reportService } from '@/services/reportService'
import { SupplierPerformanceTable } from '@/features/reports/components/SupplierPerformanceTable'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Loader2, AlertCircle } from 'lucide-react'

export const SupplierPerformanceReportPage = () => {
    const { user } = useAuthUser()

    // Fetch Data
    const { data: apiResponse, isLoading, error } = useQuery({
        queryKey: ['report-supplier-performance', user?.kode_outlet],
        queryFn: () => {
            if (!user?.kode_outlet) throw new Error('No outlet assigned')
            return reportService.getSupplierPerformanceReport(user.kode_outlet)
        },
        enabled: !!user?.kode_outlet,
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

                <SupplierPerformanceTable data={data} />
            </div>
        </DashboardLayout>
    )
}
