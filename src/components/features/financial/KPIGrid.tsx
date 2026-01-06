import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, CreditCard, Wallet } from 'lucide-react'
import { DashboardState } from '@/types/dashboard'
import { cn } from '@/lib/utils'

interface KPIGridProps {
    data: DashboardState
    loading?: boolean
}

export function KPIGrid({ data, loading }: KPIGridProps) {
    if (loading) {
        return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/50" />
            ))}
        </div>
    }

    const kpiCards = [
        {
            title: 'Total Revenue',
            value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.totalRevenue),
            icon: DollarSign,
            color: 'bg-pastel-blue text-blue-700',
        },
        {
            title: 'Total Discounts',
            value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.totalDiscounts),
            icon: Wallet,
            color: 'bg-pastel-red text-red-700',
        },
        {
            title: 'Cash Received',
            value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.totalCash),
            icon: CreditCard,
            color: 'bg-pastel-green text-green-700',
        },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpiCards.map((card) => (
                <Card key={card.title} className={cn("border-none shadow-sm transition-all hover:shadow-md", card.color)}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium opacity-80">
                            {card.title}
                        </CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/40 shadow-sm backdrop-blur-sm">
                            <card.icon className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{card.value}</div>

                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
