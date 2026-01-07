import { useState, useMemo } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Search, ArrowUp, ArrowDown } from "lucide-react"
import { ProductMixData } from '@/types/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LiveProductTableProps {
    data: ProductMixData[]
    userRole?: number
}

type SortKey = 'outlet' | 'menu' | 'value'
type SortOrder = 'asc' | 'desc'

export function LiveProductTable({ data, userRole }: LiveProductTableProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [sortKey, setSortKey] = useState<SortKey>('value')
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

    // 1. Process Data: Aggregate by Outlet + Menu
    const processedData = useMemo(() => {
        const aggregated = data.reduce((acc, item) => {
            // Key depends on role logic. 
            // If user can see multiple outlets (Role 1, 5, 8), we group by Outlet + Menu to show breakdown.
            // If user is single outlet, we theoretically just group by Menu, but since their data 
            // is already filtered to one outlet, grouping by Outlet + Menu has the same effect 
            // (just one outlet group). Use composite key for safety.

            const key = `${item.name_outlet}-${item.produk_jasa_nama}`

            if (!acc[key]) {
                acc[key] = {
                    outlet: item.name_outlet || 'Unknown Outlet',
                    menu: item.produk_jasa_nama,
                    value: 0
                }
            }

            // "Value" = Total Quantity
            acc[key].value += item.quantity
            return acc
        }, {} as Record<string, { outlet: string; menu: string; value: number }>)

        return Object.values(aggregated)
    }, [data])

    // 2. Filter & Sort
    const filteredAndSortedData = useMemo(() => {
        let result = processedData

        // Filter
        if (searchTerm) {
            const lowerInfo = searchTerm.toLowerCase()
            result = result.filter(item =>
                item.menu.toLowerCase().includes(lowerInfo) ||
                item.outlet.toLowerCase().includes(lowerInfo)
            )
        }

        // Sort
        result.sort((a, b) => {
            let valA: string | number = ''
            let valB: string | number = ''

            switch (sortKey) {
                case 'outlet':
                    valA = a.outlet
                    valB = b.outlet
                    break
                case 'menu':
                    valA = a.menu
                    valB = b.menu
                    break
                case 'value':
                    valA = a.value
                    valB = b.value
                    break
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1
            return 0
        })

        return result
    }, [processedData, searchTerm, sortKey, sortOrder])

    // Handler for Sort Headers
    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortOrder('desc') // Default to desc for new metrics usually
        }
    }

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortKey !== column) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
        return sortOrder === 'asc'
            ? <ArrowUp className="ml-2 h-4 w-4 text-foreground" />
            : <ArrowDown className="ml-2 h-4 w-4 text-foreground" />
    }

    // Determine visibility of Outlet column based on Role
    // Roles 1 (Holding), 5 (Finance), 8 (Superuser) can see multiple outlets
    const showOutletColumn = userRole === 1 || userRole === 5 || userRole === 8

    return (
        <Card className="col-span-full shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base font-semibold">
                    Live Sales Breakdown
                </CardTitle>
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search menu..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border h-[400px] overflow-auto">
                    {/* Using native div scroll for now as ScrollArea might have height issues in dynamic resizing */}
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                            <TableRow>
                                {showOutletColumn && (
                                    <TableHead className="w-[200px]">
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('outlet')}
                                            className="hover:bg-transparent pl-0 font-semibold text-foreground"
                                        >
                                            Outlet
                                            <SortIcon column="outlet" />
                                        </Button>
                                    </TableHead>
                                )}
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleSort('menu')}
                                        className="hover:bg-transparent pl-0 font-semibold text-foreground"
                                    >
                                        Menu
                                        <SortIcon column="menu" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleSort('value')}
                                        className="hover:bg-transparent pr-0 font-semibold text-foreground ml-auto"
                                    >
                                        Value (Qty)
                                        <SortIcon column="value" />
                                    </Button>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAndSortedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={showOutletColumn ? 3 : 2} className="h-24 text-center">
                                        No results found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAndSortedData.map((row, index) => (
                                    <TableRow key={`${row.outlet}-${row.menu}-${index}`} className="hover:bg-muted/50">
                                        {showOutletColumn && (
                                            <TableCell className="font-medium">{row.outlet}</TableCell>
                                        )}
                                        <TableCell>{row.menu}</TableCell>
                                        <TableCell className="text-right font-mono font-medium">
                                            {row.value}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
