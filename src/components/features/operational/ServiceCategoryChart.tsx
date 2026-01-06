import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tag } from 'lucide-react'

interface ServiceCategoryChartProps {
    data: { name: string; value: number }[]
    loading?: boolean
}

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#60a5fa']

export function ServiceCategoryChart({ data, loading }: ServiceCategoryChartProps) {
    if (loading) {
        return <div className="h-[300px] animate-pulse rounded-xl bg-muted/50 col-span-4" />
    }

    return (
        <Card className="col-span-4 border-none shadow-sm md:col-span-2 lg:col-span-2 transition-all hover:shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-700">
                    <Tag className="h-5 w-5 text-slate-500" />
                    Guest Count by Service
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                stroke="#888888"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                width={100}
                            />
                            <Tooltip
                                cursor={{ fill: '#f3f4f6' }}
                                contentStyle={{
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                                {/* @ts-ignore */}
                                <LabelList
                                    dataKey="value"
                                    position="right"
                                    formatter={(value: any) => value}
                                    style={{ fill: '#64748b', fontSize: '12px' }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
