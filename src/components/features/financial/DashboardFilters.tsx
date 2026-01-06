import { Store, Calendar as CalendarIcon } from 'lucide-react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { DashboardFilter } from '@/types/dashboard'
import { RoleId } from '@/types/database'
import { Button } from '@/components/ui/button'

interface DashboardFiltersProps {
    filters: DashboardFilter
    onFilterChange: (newFilters: DashboardFilter) => void
    userRole: RoleId | undefined
    userOutlet: string | undefined
    availableOutlets?: { kode_outlet: string; name_outlet: string }[]
    showPresets?: boolean
}

export function DashboardFilters({
    filters,
    onFilterChange,
    userRole,
    userOutlet,
    availableOutlets = [],
    showPresets = false
}: DashboardFiltersProps) {
    const canSelectOutlet = userRole === 1 || userRole === 5 || userRole === 8

    const handlePreset = (type: 'week' | 'month' | 'year') => {
        const now = new Date()
        let start, end

        switch (type) {
            case 'week':
                // "This Week": Monday to Monday (or current date) - interpreting as Start of Week (Mon) to End of Week (Sun)
                // "backward date if today not monday" is handled by startOfWeek looking back to previous Monday
                start = startOfWeek(now, { weekStartsOn: 1 })
                end = endOfWeek(now, { weekStartsOn: 1 })
                break
            case 'month':
                start = startOfMonth(now)
                end = endOfMonth(now)
                break
            case 'year':
                start = startOfYear(now)
                end = endOfYear(now)
                break
        }
        onFilterChange({ ...filters, startDate: start, endDate: end })
    }

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
                {/* Outlet Selector */}
                {canSelectOutlet ? (
                    <div className="w-[240px]">
                        <div className="relative">
                            <Store className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                value={filters.outletId}
                                onChange={(e) => onFilterChange({ ...filters, outletId: e.target.value })}
                            >
                                <option value="ALL">All Outlets</option>
                                {availableOutlets.map((outlet) => (
                                    <option key={outlet.kode_outlet} value={outlet.kode_outlet}>
                                        {outlet.name_outlet}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium">
                        <Store className="h-4 w-4" />
                        <span>Outlet: {userOutlet || 'Assigned Outlet'}</span>
                    </div>
                )}

                {/* Date Presets */}
                {showPresets && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePreset('week')}>This Week</Button>
                        <Button variant="outline" size="sm" onClick={() => handlePreset('month')}>This Month</Button>
                        <Button variant="outline" size="sm" onClick={() => handlePreset('year')}>This Year</Button>
                    </div>
                )}
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-2">
                <div className="relative">
                    <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="date"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : undefined
                            onFilterChange({ ...filters, startDate: date })
                        }}
                    />
                </div>
                <span className="text-sm text-muted-foreground">to</span>
                <div className="relative">
                    <input
                        type="date"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : undefined
                            onFilterChange({ ...filters, endDate: date })
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
