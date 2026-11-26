import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { stoService } from '@/services/stoService'
import { StoOrder, StoReceipt, StoShipment } from '@/types/database'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft, Image as ImageIcon, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TransactionImageGalleryDialog, type GalleryImageItem } from '@/components/common/TransactionImageGalleryDialog'

function collectStoImages(
    docs: Array<Pick<StoShipment, 'document_number' | 'image_url' | 'image_url_2' | 'image_url_3'> & { shipped_at?: string; received_at?: string }>
): GalleryImageItem[] {
    const result: GalleryImageItem[] = []
    docs.forEach((doc) => {
        const slots: Array<{ slot: number; url?: string | null }> = [
            { slot: 1, url: doc.image_url },
            { slot: 2, url: doc.image_url_2 },
            { slot: 3, url: doc.image_url_3 },
        ]
        slots.forEach((s) => {
            if (s.url && s.url.trim()) {
                result.push({
                    url: s.url.trim(),
                    label: `Foto ${s.slot}`,
                    grDoc: doc.document_number,
                    receivedAt: doc.received_at ?? doc.shipped_at ?? null,
                })
            }
        })
    })
    return result
}

export function StoDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [sto, setSto] = useState<StoOrder | null>(null)
    const [loading, setLoading] = useState(true)
    const [galleryModal, setGalleryModal] = useState<{ title: string; images: GalleryImageItem[]; initialIndex: number } | null>(null)

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
            <div className="p-8 text-center">Memuat rincian STO...</div>
        </DashboardLayout>
    )

    if (!sto) return (
        <DashboardLayout>
            <div className="p-8 text-center text-red-500">Dokumen Transfer Stok (STO) tidak ditemukan</div>
        </DashboardLayout>
    )

    const senderImages = collectStoImages((sto.sto_shipments || []) as StoShipment[])
    const receiverImages = collectStoImages((sto.sto_receipts || []) as StoReceipt[])

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => navigate('/sto')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Detail Transfer Stok (STO)</h1>
                            <div className="flex items-center gap-2">
                                <p className="text-muted-foreground font-mono">{sto.document_number}</p>
                                {sto.request_number && (
                                    <Badge variant="outline" className="text-xs font-mono">
                                        Ref Request: {sto.request_number}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button onClick={() => window.open(`/sto/${sto.id}/print`, '_blank')}>
                        <Printer className="mr-2 h-4 w-4" />
                        Cetak STO
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm uppercase text-muted-foreground">Pengirim (Dari Outlet)</CardTitle>
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
                            <CardTitle className="text-sm uppercase text-muted-foreground">Penerima (Ke Outlet)</CardTitle>
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
                        <CardTitle>Daftar Barang</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3">Barang</th>
                                    <th className="text-center py-3">Qty</th>
                                    <th className="text-right py-3">Harga</th>
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
                                    <span>Ongkos Kirim</span>
                                    <span>{new Intl.NumberFormat('id-ID').format(sto.shipping_cost)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg border-t pt-2">
                                    <span>Total Keseluruhan</span>
                                    <span>Rp {new Intl.NumberFormat('id-ID').format(sto.grand_total)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bukti Foto Pengiriman & Penerimaan STO */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ImageIcon className="h-4 w-4 text-blue-600" />
                            Bukti Foto Pengiriman &amp; Penerimaan STO
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Sender Photos */}
                            <div className="rounded-lg border p-3 space-y-2.5 bg-slate-50/50">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            1. Foto Pengiriman ({senderImages.length})
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Oleh: {sto.from_master_outlet?.name_outlet || sto.from_outlet}
                                        </p>
                                    </div>
                                    {senderImages.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() =>
                                                setGalleryModal({
                                                    title: `Foto Pengiriman STO: ${sto.document_number}`,
                                                    images: senderImages,
                                                    initialIndex: 0,
                                                })
                                            }
                                        >
                                            <Eye className="h-3.5 w-3.5 mr-1" />
                                            Lihat Semua
                                        </Button>
                                    )}
                                </div>
                                {senderImages.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {senderImages.map((img, idx) => (
                                            <button
                                                key={`${img.url}-${idx}`}
                                                type="button"
                                                onClick={() =>
                                                    setGalleryModal({
                                                        title: `Foto Pengiriman STO: ${sto.document_number}`,
                                                        images: senderImages,
                                                        initialIndex: idx,
                                                    })
                                                }
                                                className="relative aspect-square rounded-md overflow-hidden border border-slate-200 bg-white hover:ring-2 hover:ring-blue-400 transition-all group"
                                            >
                                                <img
                                                    src={img.url}
                                                    alt={img.label || `Foto Pengiriman ${idx + 1}`}
                                                    className="h-full w-full object-cover"
                                                />
                                                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] py-0.5 text-center truncate">
                                                    {img.label || `Foto ${idx + 1}`}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-md">
                                        Belum ada foto bukti pengiriman
                                    </div>
                                )}
                            </div>

                            {/* Receiver Photos */}
                            <div className="rounded-lg border p-3 space-y-2.5 bg-slate-50/50">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            2. Foto Penerimaan ({receiverImages.length})
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Oleh: {sto.to_master_outlet?.name_outlet || sto.to_outlet}
                                        </p>
                                    </div>
                                    {receiverImages.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() =>
                                                setGalleryModal({
                                                    title: `Foto Penerimaan STO: ${sto.document_number}`,
                                                    images: receiverImages,
                                                    initialIndex: 0,
                                                })
                                            }
                                        >
                                            <Eye className="h-3.5 w-3.5 mr-1" />
                                            Lihat Semua
                                        </Button>
                                    )}
                                </div>
                                {receiverImages.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {receiverImages.map((img, idx) => (
                                            <button
                                                key={`${img.url}-${idx}`}
                                                type="button"
                                                onClick={() =>
                                                    setGalleryModal({
                                                        title: `Foto Penerimaan STO: ${sto.document_number}`,
                                                        images: receiverImages,
                                                        initialIndex: idx,
                                                    })
                                                }
                                                className="relative aspect-square rounded-md overflow-hidden border border-slate-200 bg-white hover:ring-2 hover:ring-blue-400 transition-all group"
                                            >
                                                <img
                                                    src={img.url}
                                                    alt={img.label || `Foto Penerimaan ${idx + 1}`}
                                                    className="h-full w-full object-cover"
                                                />
                                                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] py-0.5 text-center truncate">
                                                    {img.label || `Foto ${idx + 1}`}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-md">
                                        Belum ada foto bukti penerimaan
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <TransactionImageGalleryDialog
                    open={!!galleryModal}
                    onOpenChange={(open) => !open && setGalleryModal(null)}
                    title={galleryModal?.title || 'Bukti Foto STO'}
                    images={galleryModal?.images || []}
                    initialIndex={galleryModal?.initialIndex ?? 0}
                />
            </div>
        </DashboardLayout>
    )
}
