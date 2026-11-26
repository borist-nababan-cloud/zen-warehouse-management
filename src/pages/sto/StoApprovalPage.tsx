import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PackageSearch, ArrowRight, CheckCircle2, XCircle, Image as ImageIcon, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { stoService } from '@/services/stoService'
import { useAuthUser } from '@/hooks/useAuth'
import { StoOrder, StoShipment } from '@/types/database'
import { TransactionImageGalleryDialog, type GalleryImageItem } from '@/components/common/TransactionImageGalleryDialog'
import { DashboardLayout } from '@/components/layout/Sidebar'

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

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

export default function StoApprovalPage() {
    const { user } = useAuthUser()
    const queryClient = useQueryClient()
    const [selectedSto, setSelectedSto] = useState<StoOrder | null>(null)
    const [senderImages, setSenderImages] = useState<GalleryImageItem[]>([])
    const [isGalleryOpen, setIsGalleryOpen] = useState(false)
    const [galleryInitialIdx, setGalleryInitialIdx] = useState(0)
    const [isDetailOpen, setIsDetailOpen] = useState(false)

    // 1. Fetch Incoming Approvals
    const { data: stos, isLoading } = useQuery({
        queryKey: ['sto_orders', 'approval', user?.kode_outlet],
        queryFn: () => stoService.getStoOrders(1, 100, {
            outlet_code: user?.kode_outlet || '',
            role: 'RECIPIENT',
            status: 'SHIPPED', // Must be shipped by sender
            recipient_status: 'PENDING'
        }),
        enabled: !!user?.kode_outlet
    })

    // 2. Load Details
    const handleViewDetails = async (sto: StoOrder) => {
        try {
            const fullSto = await stoService.getStoDetail(sto.id)
            setSelectedSto(fullSto)
            const shipments: StoShipment[] = (fullSto.sto_shipments || []) as StoShipment[]
            setSenderImages(collectShipmentImages(shipments))
            setIsDetailOpen(true)
        } catch (error) {
            toast.error('Gagal memuat rincian dokumen STO')
        }
    }

    // 3. Actions
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: 'ACCEPTED' | 'REJECTED' }) =>
            stoService.updateRecipientStatus(id, status),
        onSuccess: (_, variables) => {
            toast.success(
                variables.status === 'ACCEPTED'
                    ? 'Pengiriman STO berhasil disetujui'
                    : 'Pengiriman STO berhasil ditolak'
            )
            setIsDetailOpen(false)
            setSelectedSto(null)
            setSenderImages([])
            queryClient.invalidateQueries({ queryKey: ['sto_orders'] })
        },
        onError: (error: any) => {
            toast.error(error.message || 'Gagal memperbarui status persetujuan STO')
        }
    })

    const handleAction = (status: 'ACCEPTED' | 'REJECTED') => {
        if (!selectedSto) return
        const actionLabel = status === 'ACCEPTED' ? 'menyetujui' : 'menolak'
        if (confirm(`Apakah Anda yakin ingin ${actionLabel} pengiriman STO ini?`)) {
            updateStatusMutation.mutate({ id: selectedSto.id, status })
        }
    }

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Kotak Persetujuan STO</h1>
                    <p className="text-muted-foreground">Tinjau rincian barang serta foto bukti pengiriman sebelum menyetujui kiriman masuk</p>
                </div>

                <div className="grid gap-4">
                    {isLoading ? (
                        <div>Memuat daftar persetujuan...</div>
                    ) : stos?.data.length === 0 ? (
                        <Card className="bg-slate-50 border-dashed">
                            <CardContent className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                                <PackageSearch className="h-10 w-10 mb-2 opacity-20" />
                                <p>Tidak ada kiriman STO yang menunggu persetujuan</p>
                            </CardContent>
                        </Card>
                    ) : (
                        stos?.data.map(sto => (
                            <Card key={sto.id} className="hover:bg-slate-50 transition-colors">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg">{sto.document_number}</span>
                                            <Badge className="bg-orange-500 hover:bg-orange-600">MENUNGGU PERSETUJUAN</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <span>Dari: <span className="font-medium text-foreground">{sto.from_master_outlet?.name_outlet}</span></span>
                                            <span>•</span>
                                            <span>Dibuat: {format(new Date(sto.created_at), 'dd MMM yyyy')}</span>
                                            <span>•</span>
                                            <span>Nilai: {formatCurrency(sto.grand_total)}</span>
                                        </p>
                                    </div>
                                    <Button onClick={() => handleViewDetails(sto)} variant="outline">
                                        Tinjau Rincian <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* DETAIL DIALOG */}
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Tinjau Persetujuan STO: {selectedSto?.document_number}</DialogTitle>
                            <DialogDescription>
                                Periksa daftar barang dan foto bukti pengiriman dari outlet pengirim sebelum melanjutkan ke tahap penerimaan gudang.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg">
                                <div>
                                    <span className="text-muted-foreground">Outlet Pengirim:</span>
                                    <p className="font-medium">{selectedSto?.from_master_outlet?.name_outlet}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Ongkos Kirim:</span>
                                    <p className="font-medium">{formatCurrency(selectedSto?.shipping_cost || 0)}</p>
                                </div>
                            </div>

                            {/* Sender Shipment Photos Preview (1-3 photos) */}
                            {senderImages.length > 0 && (
                                <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-3 space-y-2.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                                                <ImageIcon className="h-4 w-4 text-blue-600" />
                                                Foto Bukti Pengiriman ({senderImages.length} Foto)
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Klik foto di bawah untuk memeriksa kondisi fisik kiriman dari {selectedSto?.from_master_outlet?.name_outlet || selectedSto?.from_outlet}.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setGalleryInitialIdx(0)
                                                setIsGalleryOpen(true)
                                            }}
                                        >
                                            <Eye className="h-4 w-4 mr-1.5" />
                                            Lihat Galeri ({senderImages.length})
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                        {senderImages.map((img, idx) => (
                                            <button
                                                key={`${img.url}-${idx}`}
                                                type="button"
                                                onClick={() => {
                                                    setGalleryInitialIdx(idx)
                                                    setIsGalleryOpen(true)
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

                            <p className="font-medium text-sm">Daftar Barang</p>
                            <div className="border rounded-md max-h-60 overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Produk</TableHead>
                                            <TableHead className="text-right">Harga</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedSto?.sto_items?.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <p className="font-medium">{item.master_barang?.name || `Item #${item.barang_id}`}</p>
                                                    <span className="text-xs text-muted-foreground">{item.master_barang?.sku || '-'}</span>
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.price_unit)}</TableCell>
                                                <TableCell className="text-right font-mono">{item.qty_requested}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency((item.qty_requested || 0) * (item.price_unit || 0))}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-end pt-2">
                                <p className="text-lg font-bold">
                                    Total: {formatCurrency((selectedSto?.total_items_price || 0) + (selectedSto?.shipping_cost || 0))}
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="destructive"
                                onClick={() => handleAction('REJECTED')}
                                disabled={updateStatusMutation.isPending}
                            >
                                <XCircle className="mr-2 h-4 w-4" /> Tolak Kiriman
                            </Button>
                            <Button
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleAction('ACCEPTED')}
                                disabled={updateStatusMutation.isPending}
                            >
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Setujui Kiriman
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Multi-Photo Gallery Dialog */}
                <TransactionImageGalleryDialog
                    open={isGalleryOpen}
                    onOpenChange={setIsGalleryOpen}
                    title={`Foto Pengiriman STO: ${selectedSto?.document_number || ''}`}
                    images={senderImages}
                    initialIndex={galleryInitialIdx}
                />
            </div>
        </DashboardLayout>
    )
}
