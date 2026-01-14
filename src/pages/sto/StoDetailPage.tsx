
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { stoService } from '@/services/stoService'
import { StoOrder } from '@/types/database'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function StoDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [sto, setSto] = useState<StoOrder | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            loadSto(id)
        }
    }, [id])

    async function loadSto(stoId: string) {
        setLoading(true)
        try {
            const res = await stoService.getStoDetail(stoId)
            if (res) {
                setSto(res)
            }
        } catch (err) {
            console.error(err)
        }
        setLoading(false)
    }

    if (loading) return (
        <DashboardLayout>
            <div className="p-8 text-center">Loading STO Details...</div>
        </DashboardLayout>
    )

    if (!sto) return (
        <DashboardLayout>
            <div className="p-8 text-center text-red-500">Stock Transfer Order not found</div>
        </DashboardLayout>
    )

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => navigate('/sto')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">STO Details</h1>
                            <p className="text-muted-foreground">{sto.document_number}</p>
                        </div>
                    </div>
                    <Button onClick={() => window.open(`/sto/${sto.id}/print`, '_blank')}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print STO
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm uppercase text-muted-foreground">Sender (From)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-bold text-lg">{sto.from_master_outlet?.name_outlet}</p>
                            <p>{sto.from_master_outlet?.alamat}</p>
                            <div className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                                Status: <Badge>{sto.sender_status}</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm uppercase text-muted-foreground">Recipient (To)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-bold text-lg">{sto.to_master_outlet?.name_outlet}</p>
                            <p>{sto.to_master_outlet?.alamat}</p>
                            <div className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                                Status: <Badge variant="outline">{sto.recipient_status}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3">Item</th>
                                    <th className="text-center py-3">Qty</th>
                                    <th className="text-right py-3">Price</th>
                                    <th className="text-right py-3">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sto.sto_items?.map((item) => (
                                    <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50">
                                        <td className="py-3">
                                            <div className="font-medium">{item.master_barang?.name}</div>
                                            <div className="text-xs text-muted-foreground">{item.master_barang?.sku}</div>
                                        </td>
                                        <td className="text-center py-3">{item.qty_requested}</td>
                                        <td className="text-right py-3">
                                            {new Intl.NumberFormat('id-ID').format(item.price_unit)}
                                        </td>
                                        <td className="text-right py-3 font-medium">
                                            {new Intl.NumberFormat('id-ID').format((item.qty_requested || 0) * (item.price_unit || 0))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-end mt-6">
                            <div className="w-1/3 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal</span>
                                    <span>{new Intl.NumberFormat('id-ID').format(sto.total_items_price)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Shipping</span>
                                    <span>{new Intl.NumberFormat('id-ID').format(sto.shipping_cost)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg border-t pt-2">
                                    <span>Grand Total</span>
                                    <span>Rp {new Intl.NumberFormat('id-ID').format(sto.grand_total)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
