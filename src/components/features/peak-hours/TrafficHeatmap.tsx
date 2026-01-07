import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface TrafficHeatmapProps {
    data: Record<number, Record<number, number>>
    maxValue: number
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const HOURS = Array.from({ length: 14 }, (_, i) => i + 9) // 09:00 to 22:00

export function TrafficHeatmap({ data, maxValue }: TrafficHeatmapProps) {
    return (
        <Card className="col-span-full shadow-sm hover:shadow-md transition-all">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Traffic Density Heatmap</CardTitle>
                <CardDescription>Darker cells indicate higher traffic volume</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                        {/* Header Row (Hours) */}
                        <div className="grid grid-cols-[100px_repeat(14,1fr)] gap-1 mb-2 text-xs text-muted-foreground text-center">
                            <div></div>
                            {HOURS.map(h => (
                                <div key={h}>{h}:00</div>
                            ))}
                        </div>

                        {/* Grid Body */}
                        <div className="space-y-1">
                            {DAYS.map((day, dIndex) => (
                                <div key={day} className="grid grid-cols-[100px_repeat(14,1fr)] gap-1">
                                    {/* Row Label (Day) */}
                                    <div className="flex items-center text-sm font-medium text-slate-600">
                                        {day}
                                    </div>

                                    {/* Cells */}
                                    {HOURS.map(hour => {
                                        const value = data[dIndex]?.[hour] || 0
                                        const intensity = maxValue > 0 ? value / maxValue : 0

                                        // Calculate exact opacity class or style
                                        // Using inline style for precise control, or could map to classes
                                        return (
                                            <TooltipProvider key={`${day}-${hour}`}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            className={cn(
                                                                "h-10 rounded-sm transition-all hover:ring-2 hover:ring-indigo-400 cursor-pointer flex items-center justify-center text-[10px] text-white font-medium",
                                                                value === 0 ? "bg-slate-100 dark:bg-slate-800" : "bg-indigo-500"
                                                            )}
                                                            style={{ opacity: value === 0 ? 1 : Math.max(0.1, intensity) }}
                                                        >
                                                            {value > 0 && maxValue < 50 && value}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="font-semibold">{day} at {hour}:00</p>
                                                        <p>{value} transactions</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
