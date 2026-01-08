import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const COLORS = ['#A7C7E7', '#F8C8DC', '#C1E1C1'] // Pastel Blue, Pink, Green for JASA, PRODUCT, ADDITIONAL

interface CategoryRevenueChartProps {
    data: { name: string; value: number }[]
}

export function CategoryRevenueChart({ data }: CategoryRevenueChartProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value)
    }

    return (
        <Card className="col-span-1 shadow-sm hover:shadow-md transition-all">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    Category Revenue Split
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: any) => formatCurrency(value)}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
