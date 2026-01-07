import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { ProductMixData, PromoData } from '@/types/dashboard'
import { CategoryRevenueChart } from './CategoryRevenueChart'
import { TopProductsChart } from './TopProductsChart'
import { PromoEffectivenessChart } from './PromoEffectivenessChart'
import { startOfWeek, endOfDay } from 'date-fns'
import { DashboardFilters } from '@/components/features/financial/DashboardFilters'

interface ProductMixHistoricalSectionProps {
    userRole?: number
    userOutlet?: string
    availableOutlets: { kode_outlet: string, name_outlet: string }[]
}

export function ProductMixHistoricalSection({ userRole, userOutlet, availableOutlets }: ProductMixHistoricalSectionProps) {
    const [productData, setProductData] = useState<ProductMixData[]>([])
    const [promoData, setPromoData] = useState<PromoData[]>([])
    const [loading, setLoading] = useState(true)

    // Local Filters
    const [selectedOutletId, setSelectedOutletId] = useState<string>('ALL')
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfDay(new Date())
    })

    // Init Filter
    useEffect(() => {
        if (userRole && userRole !== 1 && userRole !== 5 && userRole !== 8) {
            setSelectedOutletId(userOutlet || 'ALL')
        }
    }, [userRole, userOutlet])

    const fetchData = async () => {
        try {
            setLoading(true)
            const startStr = dateRange.from.toISOString().split('T')[0]
            const endStr = dateRange.to.toISOString().split('T')[0]

            // 1. Fetch Product Data
            let pQuery = supabase
                .from('view_product_mix')
                .select('*')
                .gte('tanggal', startStr)
                .lte('tanggal', endStr)

            if (userRole !== 1 && userRole !== 5 && userRole !== 8 && userOutlet) {
                pQuery = pQuery.eq('kode_outlet', userOutlet)
            } else if (selectedOutletId !== 'ALL') {
                pQuery = pQuery.eq('kode_outlet', selectedOutletId)
            }

            const { data: pData, error: pError } = await pQuery
            if (pError) throw pError

            // 2. Fetch Promo Data
            let prQuery = supabase
                .from('view_promo_stats')
                .select('*')
                .gte('tanggal', startStr)
                .lte('tanggal', endStr)

            if (userRole !== 1 && userRole !== 5 && userRole !== 8 && userOutlet) {
                prQuery = prQuery.eq('kode_outlet', userOutlet)
            } else if (selectedOutletId !== 'ALL') {
                prQuery = prQuery.eq('kode_outlet', selectedOutletId)
            }

            const { data: prData, error: prError } = await prQuery
            if (prError) throw prError

            setProductData(pData || [])
            setPromoData(prData || [])
        } catch (error) {
            console.error('Error fetching historical product mix:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [dateRange, selectedOutletId, userRole, userOutlet])

    // Handler for DashboardFilters comp
    const handleFilterChange = (newFilters: any) => {
        if (newFilters.outletId) setSelectedOutletId(newFilters.outletId)
        if (newFilters.startDate && newFilters.endDate) {
            setDateRange({ from: newFilters.startDate, to: newFilters.endDate })
        }
    }

    const charts = useMemo(() => {
        // 1. Category Revenue (Pie)
        const categoryMap = productData.reduce((acc, item) => {
            const key = item.trans_type_id || 'UNKNOWN'
            acc[key] = (acc[key] || 0) + item.total_revenue
            return acc
        }, {} as Record<string, number>)

        const categoryRevenue = Object.entries(categoryMap).map(([name, value]) => ({ name, value }))

        // 2. Top 10 Best Sellers (Bar) - Quantity Desc
        const productMap = productData.reduce((acc, item) => {
            const key = item.produk_jasa_nama
            if (!acc[key]) acc[key] = { name: key, quantity: 0, revenue: 0 }
            acc[key].quantity += item.quantity
            acc[key].revenue += item.total_revenue
            return acc
        }, {} as Record<string, { name: string; quantity: number; revenue: number }>)

        const topProducts = Object.values(productMap)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10)

        // 3. Promo Effectiveness (Bar)
        const promoMap = promoData.reduce((acc, item) => {
            const key = item.kodepromo || 'NO CODE'
            if (!acc[key]) acc[key] = { name: key, count: 0, value: 0 }
            acc[key].count += 1
            acc[key].value += item.discount_amount
            return acc
        }, {} as Record<string, { name: string; count: number; value: number }>)

        const promoStats = Object.values(promoMap)
            .sort((a, b) => b.count - a.count)

        return { categoryRevenue, topProducts, promoStats }
    }, [productData, promoData])

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Historical Analysis</h2>

                {/* Reusing DashboardFilters for unified look */}
                <DashboardFilters
                    filters={{
                        outletId: selectedOutletId,
                        startDate: dateRange.from,
                        endDate: dateRange.to
                    }}
                    onFilterChange={handleFilterChange}
                    userRole={userRole as any} // Casting as RoleId
                    userOutlet={userOutlet}
                    availableOutlets={availableOutlets}
                    showPresets={true}
                />
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center animate-pulse bg-muted/20 rounded-xl">Loading Analysis...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Chart 1: Category Revenue Split */}
                    <CategoryRevenueChart data={charts.categoryRevenue} />

                    {/* Chart 2: Top 10 Products */}
                    <TopProductsChart data={charts.topProducts} />

                    {/* Chart 3: Promo Effectiveness */}
                    <PromoEffectivenessChart data={charts.promoStats} />
                </div>
            )}
        </div>
    )
}
