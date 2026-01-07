import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface TopProductsChartProps {
    data: { name: string; quantity: number; revenue: number }[]
}

const BAR_COLOR = '#C1E1C1' // Pastel Green

export function TopProductsChart({ data }: TopProductsChartProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value)
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border rounded-lg shadow-lg">
                    <p className="font-medium text-sm mb-1">{label}</p>
                    <p className="text-sm text-slate-600">
                        Quantity: <span className="font-semibold text-slate-900">{payload[0].value}</span>
                    </p>
                    <p className="text-sm text-slate-600">
                        Revenue: <span className="font-semibold text-green-600">{formatCurrency(payload[0].payload.revenue)}</span>
                    </p>
                </div>
            )
        }
        return null
    }

    return (
        <Card className="col-span-1 lg:col-span-2 shadow-sm hover:shadow-md transition-all">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    Top 10 Best Sellers
                </CardTitle>
                <CardDescription>By Quantity Sold</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={120}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                            <Bar dataKey="quantity" fill={BAR_COLOR} radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
