import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OperationalDashboardState } from '@/types/dashboard'
import { Users } from 'lucide-react'

// Professional Pastel Palette for Gender
const COLORS = ['#FF9AA2', '#81B0FF'] // Soft Pink (F), Soft Blue (M)

interface GenderChartProps {
    data: OperationalDashboardState['genderDistribution']
    loading: boolean
}

export function GenderChart({ data, loading }: GenderChartProps) {
    if (loading) {
        return (
            <Card className="col-span-1 lg:col-span-2 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Gender Distribution
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="col-span-1 lg:col-span-2 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Gender Distribution
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div style={{ width: '100%', height: 250 }} className="w-full">
                    {data.length > 0 ? (
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
                                    label={({ name, value }) => `${name}: ${value}`}
                                >
                                    {data.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any) => [`${value} Guests`, 'Count']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                            No gender data available
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
