import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BankStats } from '@/types/dashboard'

interface BankReconciliationChartProps {
    data: BankStats[]
    loading?: boolean
}

export function BankReconciliationChart({ data, loading }: BankReconciliationChartProps) {
    if (loading) {
        return <div className="h-[300px] animate-pulse rounded-xl bg-muted/50" />
    }

    return (
        <Card className="col-span-4 border-none shadow-sm md:col-span-2 lg:col-span-2 transition-all hover:shadow-md">
            <CardHeader>
                <CardTitle>Bank Reconciliation</CardTitle>
            </CardHeader>
            <CardContent>
                <div style={{ width: '100%', height: 300 }} className="w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="bankName"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `Rp${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                cursor={{ fill: '#f3f4f6' }}
                                contentStyle={{
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                                formatter={(value: number | undefined) => [
                                    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value || 0),
                                    'Total',
                                ]}
                            />
                            <Bar
                                dataKey="amount"
                                fill="#818cf8"
                                radius={[4, 4, 0, 0]}
                                barSize={40}
                            >
                                {/* @ts-ignore */}
                                <LabelList
                                    dataKey="amount"
                                    position="top"
                                    formatter={(value: any) => `Rp${(Number(value) / 1000).toFixed(0)}k`}
                                    style={{ fill: '#64748b', fontSize: '10px' }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
