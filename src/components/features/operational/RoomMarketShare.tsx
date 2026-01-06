import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RoomPerformance } from '@/types/dashboard'
import { LayoutGrid } from 'lucide-react'

interface RoomMarketShareProps {
    data: RoomPerformance[]
    loading: boolean
}

export function RoomMarketShare({ data, loading }: RoomMarketShareProps) {
    if (loading) {
        return <div className="h-[400px] animate-pulse rounded-xl bg-muted/50 col-span-4 md:col-span-2 lg:col-span-3" />
    }

    // Get all unique categories for columns
    const allCategories = Array.from(new Set(data.flatMap(room => Object.keys(room.serviceDistribution)))).sort()

    return (
        <Card className="col-span-4 md:col-span-2 lg:col-span-3 shadow-sm border-none hover:shadow-md transition-all">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-700">
                    <LayoutGrid className="h-5 w-5 text-slate-500" />
                    Room Market Share (%)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10">
                            <tr>
                                <th className="p-3 font-medium w-[100px]">Room</th>
                                {allCategories.map(cat => (
                                    <th key={cat} className="p-3 font-medium text-center text-xs">{cat}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.length > 0 ? (
                                data.map((room) => (
                                    <tr key={room.roomId} className="hover:bg-slate-50">
                                        <td className="p-3 font-medium text-xs text-slate-700">{room.roomId}</td>
                                        {allCategories.map(cat => {
                                            const val = room.serviceDistribution[cat] || 0
                                            // Heatmap color intensity
                                            const opacity = Math.min(val / 50, 1) // Cap at 50% for max opacity
                                            const bgStyle = val > 0 ? { backgroundColor: `rgba(99, 102, 241, ${Math.max(opacity, 0.1)})` } : {}

                                            return (
                                                <td key={cat} className="p-1 text-center">
                                                    <div
                                                        className="rounded-md py-1 px-2 text-xs transition-colors"
                                                        style={bgStyle}
                                                    >
                                                        {val > 0 ? `${val.toFixed(0)}%` : '-'}
                                                    </div>
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={allCategories.length + 1} className="h-24 text-center text-slate-400">
                                        No room data available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
            <div className="px-6 pb-4 pt-0">
                <p className="text-xs text-muted-foreground italic">
                    Percentage of total category volume performed in this room.
                </p>
            </div>
        </Card>
    )
}
