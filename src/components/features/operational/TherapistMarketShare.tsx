import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OperationalDashboardState } from '@/types/dashboard'
import { Briefcase } from 'lucide-react'

interface TherapistMarketShareProps {
    data: OperationalDashboardState['therapistStats']
    loading: boolean
}

export function TherapistMarketShare({ data, loading }: TherapistMarketShareProps) {
    if (loading) {
        return (
            <Card className="col-span-1 lg:col-span-3 shadow-sm h-full">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-500">Service Category Share</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                </CardContent>
            </Card>
        )
    }

    // Get all unique categories across all therapists
    const allCategories = Array.from(new Set(data.flatMap(t => Object.keys(t.serviceDistribution))))

    return (
        <Card className="col-span-1 lg:col-span-3 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Therapist Market Share (%)
                </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="p-3 font-medium">Therapist</th>
                            {allCategories.map(cat => (
                                <th key={cat} className="p-3 font-medium text-center">{cat}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.slice(0, 10).map((therapist) => (
                            <tr key={therapist.therapistId} className="hover:bg-slate-50">
                                <td className="p-3 font-medium text-slate-700">{therapist.therapistName || therapist.therapistId}</td>
                                {allCategories.map(cat => {
                                    const value = therapist.serviceDistribution[cat] || 0
                                    // Heatmap coloring logic simple version
                                    const opacity = Math.min(Math.max(value / 50, 0.1), 1) // Normalize somewhat
                                    return (
                                        <td key={`${therapist.therapistId}-${cat}`} className="p-3 text-center">
                                            <div className="flex items-center justify-center">
                                                <span
                                                    className="inline-block px-2 py-1 rounded text-xs font-medium"
                                                    style={{
                                                        backgroundColor: `rgba(99, 102, 241, ${opacity * 0.3})`,
                                                        color: value > 0 ? '#4338ca' : '#94a3b8'
                                                    }}
                                                >
                                                    {value > 0 ? `${value.toFixed(1)}%` : '-'}
                                                </span>
                                            </div>
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm">No market share data available</div>
                )}
            </CardContent>
            <div className="px-6 pb-4 pt-0">
                <p className="text-xs text-muted-foreground italic">
                    Percentage of total category volume performed by this therapist.
                </p>
            </div>
        </Card>
    )
}
