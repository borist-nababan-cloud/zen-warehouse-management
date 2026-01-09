
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthUser } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Plus, Printer } from 'lucide-react'
import { getPurchaseOrders } from '@/services/purchaseOrderService'
import { PurchaseOrder } from '@/types/database'
import { toast } from 'sonner'

export function PurchaseOrderListPage() {
    const navigate = useNavigate()
    const { user } = useAuthUser()
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (user?.kode_outlet) {
            loadOrders(user.kode_outlet)
        }
    }, [user?.kode_outlet])

    async function loadOrders(outletCode: string) {
        setIsLoading(true)
        const response = await getPurchaseOrders(outletCode)
        if (response.data) {
            setOrders(response.data)
        } else {
            toast.error('Failed to load purchase orders')
        }
        setIsLoading(false)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-100 text-gray-800'
            case 'ISSUED': return 'bg-blue-100 text-blue-800'
            case 'PARTIAL': return 'bg-yellow-100 text-yellow-800'
            case 'COMPLETED': return 'bg-green-100 text-green-800'
            case 'CANCELLED': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage your procurement orders.
                        </p>
                    </div>
                    <Button onClick={() => navigate('/procurement/purchase-orders/create')} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Create New PO
                    </Button>
                </div>

                <Card className="border-pastel-blue/20 shadow-sm">
                    <CardHeader className="bg-pastel-blue/10">
                        <CardTitle>History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Document No</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead>Created Date</TableHead>
                                    <TableHead>Exp. Delivery</TableHead>
                                    <TableHead>Total Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[100px]">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            Loading orders...
                                        </TableCell>
                                    </TableRow>
                                ) : orders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No purchase orders found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    orders.map((po) => (
                                        <TableRow key={po.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { }}>
                                            {/* Future: Navigate to Detail View */}
                                            <TableCell className="font-mono font-medium">{po.document_number}</TableCell>
                                            <TableCell>{po.master_supplier?.name || '-'}</TableCell>
                                            <TableCell>{new Date(po.created_at || '').toLocaleDateString()}</TableCell>
                                            <TableCell>{po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '-'}</TableCell>
                                            <TableCell>
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(po.total_amount)}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(po.status)}`}>
                                                    {po.status}
                                                </span>
                                            </TableCell>
                                            {/* New TableCell for Actions */}
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    {(po.status === 'DRAFT' || po.status === 'ISSUED') && (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    navigate(`/procurement/purchase-orders/${po.id}/edit`)
                                                                }}
                                                            >
                                                                Edit
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="px-2"
                                                        title="Print A5"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            window.open(`/procurement/purchase-orders/${po.id}/print`, '_blank')
                                                        }}
                                                    >
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
