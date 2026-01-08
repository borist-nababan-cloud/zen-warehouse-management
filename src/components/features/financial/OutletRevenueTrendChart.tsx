import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

interface OutletRevenueTrendChartProps {
    data: any[] // We'll reshape the data in the Section
    loading?: boolean
    outletNamesMap: Record<string, string>
}

// Pastel colors for up to 10 outlets
const COLORS = [
    '#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
    '#f472b6', '#60a5fa', '#c084fc', '#4ade80', '#fb923c'
]

export function OutletRevenueTrendChart({ data, loading, outletNamesMap }: OutletRevenueTrendChartProps) {
    if (loading) {
        return <div className="h-[300px] animate-pulse rounded-xl bg-muted/50 col-span-4" />
    }

    // data format: { date: '2023-01-01', '101': 500000, '102': 700000 }

    // Get unique outlet codes from the first data point (excluding 'date')
    const outletCodes = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'date') : []

    return (
        <Card className="col-span-4 shadow-sm border-none hover:shadow-md transition-all">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-700">
                    <TrendingUp className="h-5 w-5 text-slate-500" />
                    Revenue Trend by Outlet
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div style={{ width: '100%', height: 350 }} className="w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                        <LineChart data={data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="date"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => {
                                    if (!value) return ''
                                    const date = new Date(value)
                                    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
                                }}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${(value / 1000000).toFixed(0)} Juta`}
                                width={80}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                                formatter={(value: any, name: any) => [
                                    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value || 0),
                                    outletNamesMap[name] || name // Map code to name
                                ]}
                            />
                            <Legend />
                            {outletCodes.map((code, index) => (
                                <Line
                                    key={code}
                                    type="monotone"
                                    dataKey={code}
                                    name={outletNamesMap[code] || code}
                                    stroke={COLORS[index % COLORS.length]}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
