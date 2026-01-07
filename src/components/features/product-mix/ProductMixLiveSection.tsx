import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Scissors, ShoppingBag, Package, Ticket, Clock, Store, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ProductMixData, PromoData } from '@/types/dashboard'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { LiveProductTable } from './LiveProductTable'

interface ProductMixLiveSectionProps {
    userRole?: number
    userOutlet?: string
    availableOutlets: { kode_outlet: string, name_outlet: string }[]
}

export function ProductMixLiveSection({ userRole, userOutlet, availableOutlets }: ProductMixLiveSectionProps) {
    const [productData, setProductData] = useState<ProductMixData[]>([])
    const [promoData, setPromoData] = useState<PromoData[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const [selectedOutletId, setSelectedOutletId] = useState<string>('ALL')

    // Initialize Filter
    useEffect(() => {
        if (userRole && userRole !== 1 && userRole !== 5 && userRole !== 8) {
            setSelectedOutletId(userOutlet || 'ALL')
        }
    }, [userRole, userOutlet])

    const fetchTodayStats = useCallback(async () => {
        try {
            setLoading(true)
            const today = new Date().toISOString().split('T')[0]

            // 1. Fetch Product Mix Data
            let productQuery = supabase
                .from('view_product_mix')
                .select('*')
                .eq('tanggal', today)

            if (userRole !== 1 && userRole !== 5 && userRole !== 8 && userOutlet) {
                productQuery = productQuery.eq('kode_outlet', userOutlet)
            } else if (selectedOutletId !== 'ALL') {
                productQuery = productQuery.eq('kode_outlet', selectedOutletId)
            }

            const { data: pData, error: pError } = await productQuery
            if (pError) throw pError

            // 2. Fetch Promo Data
            let promoQuery = supabase
                .from('view_promo_stats')
                .select('*')
                .eq('tanggal', today)

            if (userRole !== 1 && userRole !== 5 && userRole !== 8 && userOutlet) {
                promoQuery = promoQuery.eq('kode_outlet', userOutlet)
            } else if (selectedOutletId !== 'ALL') {
                promoQuery = promoQuery.eq('kode_outlet', selectedOutletId)
            }

            const { data: prData, error: prError } = await promoQuery
            if (prError) throw prError

            setProductData(pData || [])
            setPromoData(prData || [])
            setLastUpdated(new Date())
            toast.success('Live Product Mix updated')
        } catch (error) {
            console.error('Error fetching live product mix:', error)
            toast.error('Failed to update live data')
        } finally {
            setLoading(false)
        }
    }, [userRole, userOutlet, selectedOutletId])

    useEffect(() => {
        fetchTodayStats()
        const interval = setInterval(fetchTodayStats, 300000) // 5 minutes
        return () => clearInterval(interval)
    }, [fetchTodayStats])

    const stats = useMemo(() => {
        const serviceRevenue = productData
            .filter(d => d.trans_type_id === 'JASA')
            .reduce((sum, item) => sum + item.total_revenue, 0)

        const productRevenue = productData
            .filter(d => d.trans_type_id === 'PRODUCT')
            .reduce((sum, item) => sum + item.total_revenue, 0)

        const totalItems = productData
            .reduce((sum, item) => sum + item.quantity, 0)

        const promoValue = promoData
            .reduce((sum, item) => sum + item.discount_amount, 0)

        return { serviceRevenue, productRevenue, totalItems, promoValue }
    }, [productData, promoData])

    const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', maximumFractionDigits: 0
    }).format(val)

    const cards = [
        {
            title: 'Service Revenue',
            value: formatCurrency(stats.serviceRevenue),
            icon: Scissors,
            color: 'bg-pastel-blue text-blue-700',
            borderColor: 'border-blue-100'
        },
        {
            title: 'Product Revenue',
            value: formatCurrency(stats.productRevenue),
            icon: ShoppingBag,
            color: 'bg-pastel-pink text-pink-700',
            borderColor: 'border-pink-100'
        },
        {
            title: 'Items Sold',
            value: stats.totalItems.toLocaleString('id-ID'),
            icon: Package,
            color: 'bg-pastel-green text-green-700',
            borderColor: 'border-green-100'
        },
        {
            title: 'Promo Value Given',
            value: formatCurrency(stats.promoValue),
            icon: Ticket,
            color: 'bg-pastel-yellow text-yellow-700',
            borderColor: 'border-yellow-100'
        }
    ]

    const canSelectOutlet = userRole === 1 || userRole === 5 || userRole === 8

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            Live Monitor (Today)
                        </h2>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Auto-refreshes every 5m
                        </span>
                    </div>

                    {/* Live Outlet Selector */}
                    {canSelectOutlet && (
                        <div className="w-[200px]">
                            <div className="relative">
                                <Store className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <select
                                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 pl-9 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                    value={selectedOutletId}
                                    onChange={(e) => setSelectedOutletId(e.target.value)}
                                >
                                    <option value="ALL">All Outlets</option>
                                    {availableOutlets.map((outlet) => (
                                        <option key={outlet.kode_outlet} value={outlet.kode_outlet}>
                                            {outlet.name_outlet}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">
                        Last updated: {format(lastUpdated, 'HH:mm:ss')}
                    </span>
                    <Button variant="outline" size="sm" onClick={fetchTodayStats} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/50" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {cards.map((card) => (
                        <Card key={card.title} className={cn("border shadow-sm transition-all hover:shadow-md", card.borderColor, card.color.split(' ')[0], "bg-opacity-20")}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium opacity-80">
                                    {card.title}
                                </CardTitle>
                                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-white/60 shadow-sm backdrop-blur-sm", card.color.split(' ')[1])}>
                                    <card.icon className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{card.value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Live Sales Breakdown Table */}
            <div className="pt-2">
                <LiveProductTable data={productData} userRole={userRole} />
            </div>
        </div>
    )
}
