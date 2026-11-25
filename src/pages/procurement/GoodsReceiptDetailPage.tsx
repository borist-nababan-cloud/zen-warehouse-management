
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
import { ArrowLeft, Eye, Image as ImageIcon } from 'lucide-react'
import {
    TransactionImageGalleryDialog,
    collectGrImages,
} from '@/components/common/TransactionImageGalleryDialog'

export function GoodsReceiptDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [gr, setGr] = useState<GoodsReceipt | null>(null)
    const [loading, setLoading] = useState(true)
    const [galleryIndex, setGalleryIndex] = useState<number | null>(null)

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

    const grImages = collectGrImages(gr)

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

                {/* Bukti Foto Penerimaan (Maks. 3 Foto) */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4 text-blue-600" />
                                Bukti Foto Penerimaan
                            </span>
                            <span className="text-xs font-normal text-muted-foreground">
                                {grImages.length} Foto Terlampir
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {grImages.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Tidak ada foto bukti penerimaan yang diunggah untuk dokumen GR ini.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {grImages.map((img, idx) => (
                                    <button
                                        key={`${img.url}-${idx}`}
                                        type="button"
                                        onClick={() => setGalleryIndex(idx)}
                                        className="group relative rounded-lg border overflow-hidden bg-slate-50 text-left hover:border-blue-400 transition-all"
                                    >
                                        <div className="aspect-video w-full overflow-hidden bg-slate-100">
                                            <img
                                                src={img.url}
                                                alt={img.label || `Foto ${idx + 1}`}
                                                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        </div>
                                        <div className="px-3 py-2 flex items-center justify-between text-xs bg-white">
                                            <span className="font-medium text-slate-700">
                                                {img.label || `Foto ${idx + 1}`}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                                                <Eye className="h-3.5 w-3.5" />
                                                Perbesar
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

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

            <TransactionImageGalleryDialog
                open={galleryIndex !== null}
                onOpenChange={(open) => !open && setGalleryIndex(null)}
                title={`Bukti Foto GR: ${gr.document_number}`}
                images={grImages}
                initialIndex={galleryIndex ?? 0}
            />
        </DashboardLayout>
    )
}
