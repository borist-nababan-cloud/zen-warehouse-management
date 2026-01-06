import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardState } from '@/types/dashboard'

interface DiscountChartProps {
    data: DashboardState
    loading?: boolean
}

const COLORS = ['#818cf8', '#f87171'] // Indigo for Revenue, Red for Discount

export function DiscountChart({ data, loading }: DiscountChartProps) {
    if (loading) {
        return <div className="h-[300px] animate-pulse rounded-xl bg-muted/50" />
    }

    const chartData = [
        { name: 'Net Revenue', value: data.totalRevenue },
        { name: 'Discount', value: data.totalDiscounts }
    ]

    return (
        <Card className="col-span-4 border-none shadow-sm md:col-span-2 lg:col-span-2 transition-all hover:shadow-md">
            <CardHeader>
                <CardTitle>Discount Impact</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                                formatter={(value: number | undefined) => [
                                    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value || 0),
                                    'Amount'
                                ]}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
