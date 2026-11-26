import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, PackageCheck, AlertCircle, Image as ImageIcon, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { stoService } from '@/services/stoService'
import { useAuthUser } from '@/hooks/useAuth'
import { StoOrder, StoShipment } from '@/types/database'
import { uploadTransactionImage } from '@/components/common/TransactionImageInput'
import { TransactionMultiImageInput } from '@/components/common/TransactionMultiImageInput'
import { TransactionImageGalleryDialog, type GalleryImageItem } from '@/components/common/TransactionImageGalleryDialog'

import { DashboardLayout } from '@/components/layout/Sidebar'

function collectShipmentImages(shipments: StoShipment[]): GalleryImageItem[] {
    const result: GalleryImageItem[] = []
    shipments.forEach((shipment) => {
        const slots: Array<{ slot: number; url?: string | null }> = [
            { slot: 1, url: shipment.image_url },
            { slot: 2, url: shipment.image_url_2 },
            { slot: 3, url: shipment.image_url_3 },
        ]
        slots.forEach((s) => {
            if (s.url && s.url.trim()) {
                result.push({
                    url: s.url.trim(),
                    label: `Foto ${s.slot}`,
                    grDoc: shipment.document_number,
                    receivedAt: shipment.shipped_at ?? null,
                })
            }
        })
    })
    return result
}

export default function StoGoodsReceiptPage() {
    const { user } = useAuthUser()
    const queryClient = useQueryClient()
    const [selectedSto, setSelectedSto] = useState<StoOrder | null>(null)
    const [receivingItems, setReceivingItems] = useState<{ sto_item_id: string, barang_id: number, qty_shipped: number, qty_received: number }[]>([])
    const [receiptImageFiles, setReceiptImageFiles] = useState<(File | null)[]>([null, null, null])
    const [senderImages, setSenderImages] = useState<GalleryImageItem[]>([])
    const [isSenderGalleryOpen, setIsSenderGalleryOpen] = useState(false)
    const [senderGalleryInitialIdx, setSenderGalleryInitialIdx] = useState(0)
    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const [isDetailOpen, setIsDetailOpen] = useState(false)

    // 1. Fetch STOs (Recipient)
    // Filter for 'ACCEPTED' meaning Admin approved it.
    const { data: stos, isLoading } = useQuery({
        queryKey: ['sto_orders', 'receipt', user?.kode_outlet],
        queryFn: () => stoService.getStoOrders(1, 100, {
            outlet_code: user?.kode_outlet || '',
            role: 'RECIPIENT',
            recipient_status: 'ACCEPTED'
        }),
        enabled: !!user?.kode_outlet
    })

    // 2. Load Details
    const handleOpenReceive = async (sto: StoOrder) => {
        try {
            const fullSto = await stoService.getStoDetail(sto.id)
            setSelectedSto(fullSto)

            const itemsToReceive: typeof receivingItems = []
            const shipments: StoShipment[] = (fullSto.sto_shipments || []) as StoShipment[]

            const collectedSenderPhotos = collectShipmentImages(shipments)

            shipments.forEach((shipment) => {
                shipment.sto_shipment_items?.forEach((shipItem) => {
                    itemsToReceive.push({
                        sto_item_id: shipItem.sto_item_id,
                        barang_id: shipItem.barang_id,
                        qty_shipped: shipItem.qty_shipped,
                        qty_received: shipItem.qty_shipped // Default pre-fill
                    })
                })
            })

            setSenderImages(collectedSenderPhotos)
            setReceiptImageFiles([null, null, null])
            setReceivingItems(itemsToReceive)
            setIsDetailOpen(true)
        } catch (error) {
            console.error(error)
            toast.error('Gagal memuat rincian dokumen STO')
        }
    }

    // 3. Receive Mutation
    const receiveMutation = useMutation({
        mutationFn: stoService.createReceipt.bind(stoService),
        onSuccess: () => {
            toast.success('Penerimaan barang STO berhasil dicatat!')
            setIsDetailOpen(false)
            setSelectedSto(null)
            setReceiptImageFiles([null, null, null])
            setSenderImages([])
            queryClient.invalidateQueries({ queryKey: ['sto_orders'] })
        },
        onError: (error: any) => {
            toast.error(error.message || 'Gagal mencatat penerimaan barang STO')
        }
    })

    const handleSubmitReceipt = async () => {
        if (!selectedSto || !user) return

        // Validation
        const errors = receivingItems.some(i => i.qty_received !== i.qty_shipped)
        if (errors) {
            toast.error('Kuantitas Diterima HARUS sama persis dengan Kuantitas Dikirim (tidak boleh parsial)')
            return
        }

        let uploadedUrls: (string | null)[] = [null, null, null]
        const hasAnyFile = receiptImageFiles.some(Boolean)
        if (hasAnyFile) {
            try {
                setIsUploadingImage(true)
                const outletCode = user.kode_outlet || selectedSto.to_outlet
                uploadedUrls = await Promise.all(
                    [0, 1, 2].map((slotIdx) => {
                        const fileItem = receiptImageFiles[slotIdx]
                        return fileItem
                            ? uploadTransactionImage(fileItem, 'sto-receipts', outletCode)
                            : Promise.resolve<string | null>(null)
                    })
                )
            } catch (err: any) {
                toast.error(err.message || 'Gagal mengunggah foto bukti penerimaan')
                setIsUploadingImage(false)
                return
            } finally {
                setIsUploadingImage(false)
            }
        }

        receiveMutation.mutate({
            sto_id: selectedSto.id,
            items: receivingItems,
            received_by: user.id,
            image_url: uploadedUrls[0],
            image_url_2: uploadedUrls[1],
            image_url_3: uploadedUrls[2],
        })
    }

    const updateQty = (stoItemId: string, qty: number) => {
        setReceivingItems(prev => prev.map(item =>
            item.sto_item_id === stoItemId ? { ...item, qty_received: qty } : item
        ))
    }

    // Helper to find product name from selectedSto
    const getProductInfo = (stoItemId: string) => {
        const item = selectedSto?.sto_items?.find(i => i.id === stoItemId)
        return item?.master_barang
    }

    const isProcessing = receiveMutation.isPending || isUploadingImage

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Penerimaan STO (Penerima)</h1>
                    <p className="text-muted-foreground">Terima barang kiriman transfer stok dari outlet lain yang telah disetujui</p>
                </div>

                <div className="grid gap-4">
                    {isLoading ? (
                        <div>Memuat daftar penerimaan...</div>
                    ) : stos?.data.length === 0 ? (
                        <Card className="bg-slate-50 border-dashed">
                            <CardContent className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                                <ClipboardCheck className="h-10 w-10 mb-2 opacity-20" />
                                <p>Tidak ada kiriman STO yang menunggu diterima</p>
                            </CardContent>
                        </Card>
                    ) : (
                        stos?.data.map(sto => (
                            <Card key={sto.id} className="hover:bg-slate-50 transition-colors">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg">{sto.document_number}</span>
                                            <Badge className="bg-green-600">ACCEPTED</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <span>Dari: <span className="font-medium text-foreground">{sto.from_master_outlet?.name_outlet}</span></span>
                                            <span>•</span>
                                            <span>Dibuat: {format(new Date(sto.created_at), 'dd MMM yyyy')}</span>
                                        </p>
                                    </div>
                                    <Button onClick={() => handleOpenReceive(sto)}>
                                        <PackageCheck className="mr-2 h-4 w-4" /> Terima Barang
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* RECEIVE DIALOG */}
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Penerimaan Kiriman STO: {selectedSto?.document_number}</DialogTitle>
                            <DialogDescription>
                                Verifikasi jumlah fisik barang yang diterima. Kuantitas harus sesuai dengan jumlah yang dikirim.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="bg-amber-50 p-3 rounded-md border border-amber-100 text-sm text-amber-700 flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <p>
                                    <strong>Kebijakan Ketat:</strong> Anda wajib menerima sesuai jumlah yang dikirim.
                                    Jika terdapat barang rusak atau kurang, terima penuh terlebih dahulu lalu catat melalui menu
                                    <strong> Penyusutan / Pemusnahan</strong> secara terpisah.
                                </p>
                            </div>

                            {/* Show Sender's Shipment Photos (1-3 photos) if available */}
                            {senderImages.length > 0 && (
                                <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-3 space-y-2.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                                                <ImageIcon className="h-4 w-4 text-blue-600" />
                                                Foto Bukti Pengiriman (Dari Outlet Pengirim — {senderImages.length} Foto)
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Periksa foto kondisi barang saat dikirim oleh {selectedSto?.from_master_outlet?.name_outlet || selectedSto?.from_outlet}.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSenderGalleryInitialIdx(0)
                                                setIsSenderGalleryOpen(true)
                                            }}
                                        >
                                            <Eye className="h-4 w-4 mr-1.5" />
                                            Lihat Foto Pengirim ({senderImages.length})
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                        {senderImages.map((img, idx) => (
                                            <button
                                                key={`${img.url}-${idx}`}
                                                type="button"
                                                onClick={() => {
                                                    setSenderGalleryInitialIdx(idx)
                                                    setIsSenderGalleryOpen(true)
                                                }}
                                                className="relative shrink-0 h-16 w-16 rounded-md overflow-hidden border border-blue-200 hover:ring-2 hover:ring-blue-400 transition-all"
                                                title={`Lihat ${img.label || `Foto ${idx + 1}`}`}
                                            >
                                                <img
                                                    src={img.url}
                                                    alt={img.label || `Foto Pengirim ${idx + 1}`}
                                                    className="h-full w-full object-cover"
                                                />
                                                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-medium px-1 text-center truncate">
                                                    {img.label || `#${idx + 1}`}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produk</TableHead>
                                        <TableHead className="text-right">Qty Dikirim</TableHead>
                                        <TableHead className="text-right w-32">Qty Diterima</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {receivingItems.map(item => {
                                        const product = getProductInfo(item.sto_item_id)
                                        const isMatch = item.qty_received === item.qty_shipped
                                        return (
                                            <TableRow key={item.sto_item_id}>
                                                <TableCell>
                                                    <p className="font-medium">{product?.name}</p>
                                                    <p className="text-xs text-muted-foreground">{product?.sku}</p>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{item.qty_shipped}</TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        className={`text-right h-8 ${!isMatch ? 'border-red-300 ring-red-200' : ''}`}
                                                        value={item.qty_received}
                                                        onChange={(e) => updateQty(item.sto_item_id, Number(e.target.value))}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>

                            {/* Optional Multi-Image Proof of Receipt (Max 3 Images: Camera or Device Storage) */}
                            <div className="pt-3 border-t border-slate-100">
                                <TransactionMultiImageInput
                                    label="Foto Bukti Penerimaan STO (Oleh Outlet Penerima — Maks. 3 Foto, Opsional)"
                                    helperText="Ambil foto kondisi paket saat tiba, isi barang setelah dibuka, atau bukti tambahan menggunakan kamera maupun galeri perangkat."
                                    files={receiptImageFiles}
                                    onChange={setReceiptImageFiles}
                                    maxImages={3}
                                    slotLabels={[
                                        'Foto 1 (Kondisi Paket Tiba)',
                                        'Foto 2 (Isi Barang / Cek Fisik)',
                                        'Foto 3 (Tambahan)',
                                    ]}
                                    disabled={isProcessing}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDetailOpen(false)} disabled={isProcessing}>
                                Batal
                            </Button>
                            <Button onClick={handleSubmitReceipt} disabled={isProcessing}>
                                {isUploadingImage
                                    ? 'Mengunggah Foto...'
                                    : receiveMutation.isPending
                                        ? 'Memproses...'
                                        : 'Konfirmasi Penerimaan'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Sender Multi-Photo Gallery Dialog */}
                <TransactionImageGalleryDialog
                    open={isSenderGalleryOpen}
                    onOpenChange={setIsSenderGalleryOpen}
                    title={`Foto Pengiriman STO: ${selectedSto?.document_number || ''}`}
                    images={senderImages}
                    initialIndex={senderGalleryInitialIdx}
                />
            </div>
        </DashboardLayout>
    )
}
