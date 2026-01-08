import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PaymentMethodStats } from '@/types/dashboard'

interface PaymentMethodChartProps {
    data: PaymentMethodStats[]
    loading?: boolean
}

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#60a5fa', '#a3e635']

export function PaymentMethodChart({ data, loading }: PaymentMethodChartProps) {
    if (loading) {
        return (
            <Card className="col-span-4 border-none shadow-sm md:col-span-2 lg:col-span-2">
                <CardHeader>
                    <CardTitle>Payment Mix</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] animate-pulse rounded-xl bg-muted/50" />
                </CardContent>
            </Card>
        )
    }

    const sortedData = [...data].sort((a, b) => b.value - a.value)

    return (
        <Card className="col-span-4 border-none shadow-sm md:col-span-2 lg:col-span-2 transition-all hover:shadow-md h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-slate-700">Payment Mix</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col h-[300px] w-full gap-4">
                    <div style={{ width: '100%', height: 180 }} className="w-full shrink-0 relative">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                            <PieChart>
                                <Pie
                                    data={sortedData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {sortedData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    }}
                                    itemStyle={{ color: '#1e293b', fontSize: '12px' }}
                                    formatter={(value: number | undefined) => [
                                        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0),
                                        'Amount'
                                    ]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex-1 w-full min-h-0 overflow-y-auto pr-2">
                        <div className="space-y-2">
                            {sortedData.map((entry, index) => (
                                <div key={index} className="flex items-center justify-between text-xs sm:text-sm p-1.5 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0"
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <span className="font-medium text-slate-600 truncate max-w-[100px]" title={entry.name}>
                                            {entry.name}
                                        </span>
                                    </div>
                                    <span className="font-semibold text-slate-800 text-xs">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(entry.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
