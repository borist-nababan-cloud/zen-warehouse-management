
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getGoodsReceiptById } from '@/services/goodsReceiptService'
import { GoodsReceipt } from '@/types/database'
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
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'

export function GoodsReceiptDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [gr, setGr] = useState<GoodsReceipt | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            loadReceipt(id)
        }
    }, [id])

    async function loadReceipt(grId: string) {
        setLoading(true)
        const res = await getGoodsReceiptById(grId)
        if (res.data) {
            setGr(res.data)
        }
        setLoading(false)
    }

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>
    if (!gr) return <DashboardLayout><div>Receipt not found</div></DashboardLayout>

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-5xl mx-auto">
                {/* Header Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/procurement/goods-receipts')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{gr.document_number}</h1>
                            <p className="text-muted-foreground">
                                Received on {gr.received_at ? format(new Date(gr.received_at), 'dd MMM yyyy, HH:mm') : '-'}
                            </p>
                        </div>
                    </div>
                    {/* Placeholder for Print if needed later */}
                    {/* <Button variant="outline"><Printer className="w-4 h-4 mr-2" />Print GR</Button> */}
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Supplier Info</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-semibold">{gr.purchase_orders?.master_supplier?.name || 'Unknown Supplier'}</div>
                            <div className="text-sm text-muted-foreground mt-1">Delivery Note: {gr.supplier_delivery_note}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Order Reference</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-semibold">{gr.purchase_orders?.document_number}</div>
                            <div className="text-sm text-muted-foreground mt-1">Outlet: {gr.master_outlet?.name_outlet}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Items Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Received Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead className="text-right">Qty Received</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {gr.goods_receipt_items?.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            {item.purchase_order_items?.master_barang?.name || 'Unknown Product'}
                                        </TableCell>
                                        <TableCell>{item.purchase_order_items?.master_barang?.sku}</TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 bg-muted rounded text-xs font-semibold">
                                                {item.purchase_order_items?.uom_purchase || 'PCS'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {item.qty_received}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
