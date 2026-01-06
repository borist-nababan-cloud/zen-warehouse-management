import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DailyRevenue } from '@/types/dashboard'
import { format } from 'date-fns'

interface RevenueChartProps {
    data: DailyRevenue[]
    loading?: boolean
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
    if (loading) {
        return <div className="h-[300px] animate-pulse rounded-xl bg-muted/50" />
    }

    return (
        <Card className="col-span-4 border-none shadow-sm md:col-span-3 lg:col-span-4 transition-all hover:shadow-md">
            <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => format(new Date(value), 'dd MMM')}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `Rp${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                                formatter={(value: number | undefined) => [
                                    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value || 0),
                                    'Revenue',
                                ]}
                                labelFormatter={(label) => format(new Date(label), 'PPP')}
                            />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#818cf8"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
