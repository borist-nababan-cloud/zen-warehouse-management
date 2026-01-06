import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OperationalDashboardState } from '@/types/dashboard'
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TherapistLeaderboardProps {
    data: OperationalDashboardState['therapistStats']
    loading: boolean
}

export function TherapistLeaderboard({ data, loading }: TherapistLeaderboardProps) {
    const [viewMode, setViewMode] = useState<'TOP' | 'BOTTOM'>('TOP')

    if (loading) {
        return (
            <Card className="col-span-1 lg:col-span-3 shadow-sm h-full">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-500">Therapist Leaderboard</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                </CardContent>
            </Card>
        )
    }

    const sortedData = [...data].sort((a, b) => {
        if (viewMode === 'TOP') return b.totalDuration - a.totalDuration
        return a.totalDuration - b.totalDuration
    }).slice(0, 10)

    return (
        <Card className="col-span-1 lg:col-span-3 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Therapist Leaderboard (by Duration)
                </CardTitle>
                <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                    <Button
                        variant={viewMode === 'TOP' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('TOP')}
                        className="h-7 text-xs"
                    >
                        <TrendingUp className="h-3 w-3 mr-1" /> Top 10
                    </Button>
                    <Button
                        variant={viewMode === 'BOTTOM' ? 'destructive' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('BOTTOM')}
                        className="h-7 text-xs"
                    >
                        <TrendingDown className="h-3 w-3 mr-1" /> Bottom 10
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full pr-4 overflow-y-auto">
                    <div className="space-y-4">
                        {sortedData.length > 0 ? (
                            sortedData.map((therapist, index) => (
                                <div key={therapist.therapistId} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 transition-colors hover:bg-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`
                                                flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold
                                                ${index === 0 ? 'bg-yellow-100 text-yellow-600' :
                                                index === 1 ? 'bg-slate-200 text-slate-600' :
                                                    index === 2 ? 'bg-orange-100 text-orange-600' :
                                                        'bg-white border border-slate-200 text-slate-500'}
                                            `}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm text-slate-700">{therapist.therapistName}</div>
                                            <div className="text-xs text-muted-foreground">{therapist.therapistId}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-sm text-slate-700">{therapist.totalDuration} <span className="text-xs font-normal text-slate-500">mins</span></div>
                                        <div className="text-xs text-slate-400">{therapist.transactionCount} Trans</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center p-8 text-slate-400 text-sm">
                                No therapist data available
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
            <div className="px-6 pb-4 pt-0">
                <p className="text-xs text-muted-foreground italic">
                    Values based on total service duration (minutes) delivered by each therapist.
                </p>
            </div>
        </Card >
    )
}
