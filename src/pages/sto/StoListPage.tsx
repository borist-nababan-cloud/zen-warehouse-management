import { useNavigate } from 'react-router-dom'
import { Plus, Truck, ArrowRight, Calendar, Printer } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

import { useAuthUser } from '@/hooks/useAuth'
import { stoService } from '@/services/stoService'

// Helper for formatting IDR
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

export default function StoListPage() {
    const navigate = useNavigate()
    const { user } = useAuthUser()

    // Fetch STOs
    const { data: stoData, isLoading } = useQuery({
        queryKey: ['sto_orders', 'list', user?.kode_outlet],
        queryFn: () => stoService.getStoOrders(1, 100, {
            outlet_code: user?.kode_outlet || undefined
        }),
        enabled: !!user?.kode_outlet
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-100 text-gray-800'
            case 'ISSUED': return 'bg-blue-100 text-blue-800'
            case 'SHIPPED': return 'bg-purple-100 text-purple-800'
            case 'RECEIVED': return 'bg-orange-100 text-orange-800'
            case 'COMPLETED': return 'bg-green-100 text-green-800'
            case 'CANCELLED': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Stock Transfers</h1>
                        <p className="text-muted-foreground">Manage your incoming and outgoing stock transfers</p>
                    </div>
                    <Button onClick={() => navigate('/sto/create')} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="mr-2 h-4 w-4" />
                        New Transfer
                    </Button>
                </div>

                {/* Filters & Stats could go here */}

                <Card className="shadow-sm">
                    <CardHeader className="bg-slate-50 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-gray-500" />
                            <CardTitle className="text-lg">Transfer Orders</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Document No</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Route</TableHead>
                                    <TableHead>Sender Status</TableHead>
                                    <TableHead>Recipient Status</TableHead>
                                    <TableHead className="text-right">Total Amount</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                            Loading transfers...
                                        </TableCell>
                                    </TableRow>
                                ) : stoData?.data?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                            No stock transfers found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    stoData?.data?.map((sto) => (
                                        <TableRow key={sto.id} className="hover:bg-slate-50">
                                            <TableCell className="font-mono font-medium">
                                                {sto.document_number}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(sto.created_at), 'dd MMM yyyy')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className={sto.from_outlet === user?.kode_outlet ? 'font-bold text-gray-900' : 'text-gray-500'}>
                                                        {sto.from_master_outlet?.name_outlet || sto.from_outlet}
                                                    </span>
                                                    <ArrowRight className="h-4 w-4 text-gray-400" />
                                                    <span className={sto.to_outlet === user?.kode_outlet ? 'font-bold text-gray-900' : 'text-gray-500'}>
                                                        {sto.to_master_outlet?.name_outlet || sto.to_outlet}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(sto.sender_status)} variant="secondary">
                                                    {sto.sender_status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {sto.recipient_status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(sto.grand_total || sto.total_items_price)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => navigate(`/sto/${sto.id}`)}>
                                                        View
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => window.open(`/sto/${sto.id}/print`, '_blank')}>
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
