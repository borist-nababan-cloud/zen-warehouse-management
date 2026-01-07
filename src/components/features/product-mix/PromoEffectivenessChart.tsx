import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface PromoEffectivenessChartProps {
    data: { name: string; count: number; value: number }[]
}

const COUNT_COLOR = '#A7C7E7' // Pastel Blue
const VALUE_COLOR = '#F8C8DC' // Pastel Pink

export function PromoEffectivenessChart({ data }: PromoEffectivenessChartProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value)
    }

    return (
        <Card className="col-span-1 lg:col-span-3 shadow-sm hover:shadow-md transition-all">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    Promo Effectiveness
                </CardTitle>
                <CardDescription>Usage Count vs Discount Value Given</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    {data.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                            No promo data available for selected period
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis yAxisId="left" orientation="left" stroke="#888888" />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#888888"
                                    tickFormatter={(val) =>
                                        new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(val)
                                    }
                                />
                                <Tooltip
                                    formatter={(value: any, name: any) => {
                                        if (name === 'value') return formatCurrency(value)
                                        return value
                                    }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="count" name="Usage Count" fill={COUNT_COLOR} radius={[4, 4, 0, 0]} />
                                <Bar yAxisId="right" dataKey="value" name="Discount Value" fill={VALUE_COLOR} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
