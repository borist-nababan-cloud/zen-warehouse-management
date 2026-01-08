import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface HourlyTrendChartProps {
    data: { hour: number; value: number }[]
}

export function HourlyTrendChart({ data }: HourlyTrendChartProps) {
    // Fill gaps for hours 9-22
    const filledData = Array.from({ length: 14 }, (_, i) => {
        const h = i + 9
        const found = data.find(d => d.hour === h)
        return { hour: `${h}:00`, value: found ? found.value : 0 }
    })

    return (
        <Card className="col-span-1 lg:col-span-2 shadow-sm hover:shadow-md transition-all">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    Hourly Traffic Trend
                </CardTitle>
                <CardDescription>Aggregate traffic pattern across selected period</CardDescription>
            </CardHeader>
            <CardContent>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                        <LineChart data={filledData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="hour"
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                stroke="#888888"
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#6366f1"
                                strokeWidth={3}
                                dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
