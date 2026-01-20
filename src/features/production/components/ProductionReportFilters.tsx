import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

interface ProductionReportFiltersProps {
    startDate: string
    endDate: string
    onDateChange: (start: string, end: string) => void
    searchQuery: string
    onSearchChange: (query: string) => void
}

export const ProductionReportFilters: React.FC<ProductionReportFiltersProps> = ({
    startDate,
    endDate,
    onDateChange,
    searchQuery,
    onSearchChange,
}) => {
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-end p-4 bg-white rounded-lg border shadow-sm">
            <div className="grid grid-cols-2 gap-4 flex-1">
                <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => onDateChange(e.target.value, endDate)}
                        className="w-full"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => onDateChange(startDate, e.target.value)}
                        className="w-full"
                    />
                </div>
            </div>

            <div className="flex-1 space-y-2">
                <Label htmlFor="search">Search Product</Label>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="search"
                        placeholder="Search finished goods..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-8 w-full"
                    />
                </div>
            </div>
        </div>
    )
}
