import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Truck, ArrowRight, AlertCircle } from 'lucide-react'
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
import { StoOrder } from '@/types/database'
import { TransactionImageInput, uploadTransactionImage } from '@/components/common/TransactionImageInput'

import { DashboardLayout } from '@/components/layout/Sidebar'

export default function StoGoodsIssuePage() {
    const { user } = useAuthUser()
    const queryClient = useQueryClient()
    const [selectedSto, setSelectedSto] = useState<StoOrder | null>(null)
    const [shippingItems, setShippingItems] = useState<{ sto_item_id: string, barang_id: number, qty_shipped: number }[]>([])
    const [shipmentImageFile, setShipmentImageFile] = useState<File | null>(null)
    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const [isDetailOpen, setIsDetailOpen] = useState(false)

    // 1. Fetch STOs (Sender Logic)
    const { data: stos, isLoading } = useQuery({
        queryKey: ['sto_orders', 'sender', user?.kode_outlet],
        queryFn: () => stoService.getStoOrders(1, 100, {
            outlet_code: user?.kode_outlet || '',
            role: 'SENDER',
        }),
        enabled: !!user?.kode_outlet
    })

    // Filter for actionable items
    const actionableStos = stos?.data.filter(s => ['DRAFT', 'ISSUED'].includes(s.sender_status)) || []

    // 2. Load Details when clicking Ship
    const handleOpenShipModule = async (sto: StoOrder) => {
        try {
            const fullSto = await stoService.getStoDetail(sto.id)
            setSelectedSto(fullSto)
            // Initialize shipping items with requested qty
            setShippingItems(fullSto.sto_items?.map(item => ({
                sto_item_id: item.id,
                barang_id: item.barang_id,
                qty_shipped: item.qty_requested // Default to requested
            })) || [])
            setShipmentImageFile(null)
            setIsDetailOpen(true)
        } catch (error) {
            toast.error('Failed to load details')
        }
    }

    // 3. Mutation for Shipping
    const shipMutation = useMutation({
        mutationFn: stoService.createShipment.bind(stoService),
        onSuccess: () => {
            toast.success('STO Shipped Successfully!')
            setIsDetailOpen(false)
            setSelectedSto(null)
            setShipmentImageFile(null)
            queryClient.invalidateQueries({ queryKey: ['sto_orders'] })
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to ship STO')
        }
    })

    const handleSubmitShipment = async () => {
        if (!selectedSto || !user) return

        // Validate negative quantity
        if (shippingItems.some(i => i.qty_shipped < 0)) {
            toast.error('Kuantitas pengiriman tidak boleh bernilai negatif')
            return
        }

        // Validate exceeding requested quantity
        const exceededItem = selectedSto.sto_items?.find(item => {
            const ship = shippingItems.find(s => s.sto_item_id === item.id)
            return (ship?.qty_shipped || 0) > item.qty_requested
        })
        if (exceededItem) {
            toast.error(`Kuantitas kirim untuk "${exceededItem.master_barang?.name || 'barang'}" melebihi jumlah permintaan (${exceededItem.qty_requested})`)
            return
        }

        // Validate total shipped items (at least one item must be > 0)
        const totalShipped = shippingItems.reduce((sum, i) => sum + (Number(i.qty_shipped) || 0), 0)
        if (totalShipped <= 0) {
            toast.error('Setidaknya minimal 1 barang harus memiliki kuantitas pengiriman lebih dari 0')
            return
        }

        let uploadedImageUrl: string | null = null
        if (shipmentImageFile) {
            try {
                setIsUploadingImage(true)
                uploadedImageUrl = await uploadTransactionImage(
                    shipmentImageFile,
                    'sto-shipments',
                    user.kode_outlet || selectedSto.from_outlet
                )
            } catch (err: any) {
                toast.error(err.message || 'Gagal mengunggah foto pengiriman')
                setIsUploadingImage(false)
                return
            } finally {
                setIsUploadingImage(false)
            }
        }

        shipMutation.mutate({
            sto_id: selectedSto.id,
            items: shippingItems,
            shipped_by: user.id,
            image_url: uploadedImageUrl
        })
    }

    const updateQty = (stoItemId: string, qty: number) => {
        setShippingItems(prev => prev.map(item =>
            item.sto_item_id === stoItemId ? { ...item, qty_shipped: Math.max(0, qty) } : item
        ))
    }

    const isProcessing = shipMutation.isPending || isUploadingImage

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Goods Issue (Sender)</h1>
                    <p className="text-muted-foreground">Manage outbound stock transfers</p>
                </div>

                <div className="grid gap-4">
                    {isLoading ? (
                        <div>Loading...</div>
                    ) : actionableStos.length === 0 ? (
                        <Card className="bg-slate-50 border-dashed">
                            <CardContent className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                                <Truck className="h-10 w-10 mb-2 opacity-20" />
                                <p>No pending shipments found</p>
                            </CardContent>
                        </Card>
                    ) : (
                        actionableStos.map(sto => (
                            <Card key={sto.id} className="hover:bg-slate-50 transition-colors">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg">{sto.document_number}</span>
                                            <Badge variant="outline">{sto.sender_status}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <span>To: <span className="font-medium text-foreground">{sto.to_master_outlet?.name_outlet}</span></span>
                                            <span>•</span>
                                            <span>{format(new Date(sto.created_at), 'dd MMM yyyy')}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">Total Items</p>
                                            <p className="font-bold">{sto.sto_items?.length || 0} SKU</p>
                                        </div>
                                        <Button onClick={() => handleOpenShipModule(sto)}>
                                            Process Shipment <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* SHIPMENT DIALOG */}
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Process Shipment: {selectedSto?.document_number}</DialogTitle>
                            <DialogDescription>
                                Verify quantities before shipping. Stock will be deducted immediately for shipped items.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-100 text-sm text-blue-700 flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <p>
                                    Ensure physical goods match the quantities below. Barang yang kosong di gudang dapat diset bernilai <strong>0</strong>.
                                    Once shipped, the status will change to <strong>SHIPPED</strong>.
                                </p>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Ordered</TableHead>
                                        <TableHead className="text-right w-36">Shipped Qty</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedSto?.sto_items?.map(item => {
                                        const shipItem = shippingItems.find(i => i.sto_item_id === item.id)
                                        const isZero = shipItem?.qty_shipped === 0

                                        return (
                                            <TableRow key={item.id} className={isZero ? 'bg-amber-50/40' : ''}>
                                                <TableCell>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium">{item.master_barang?.name}</p>
                                                            {isZero && (
                                                                <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 text-[10px] px-1.5 py-0">
                                                                    Stok Kosong (0)
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">{item.master_barang?.sku}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{item.qty_requested}</TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={item.qty_requested}
                                                        className={`text-right h-8 ${isZero ? 'border-amber-300 text-amber-700 font-semibold' : ''}`}
                                                        value={shipItem?.qty_shipped ?? 0}
                                                        onChange={(e) => updateQty(item.id, Number(e.target.value))}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>

                            {/* Optional 1-Image Proof of Shipment (Camera or Device Storage) */}
                            <div className="pt-2 border-t border-slate-100">
                                <TransactionImageInput
                                    label="Foto Bukti Pengiriman STO"
                                    helperText="Ambil foto kondisi fisik barang / paket saat dikirim menggunakan kamera atau unggah dari galeri perangkat."
                                    file={shipmentImageFile}
                                    onChange={setShipmentImageFile}
                                    disabled={isProcessing}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDetailOpen(false)} disabled={isProcessing}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmitShipment} disabled={isProcessing}>
                                {isUploadingImage
                                    ? 'Mengunggah Foto...'
                                    : shipMutation.isPending
                                        ? 'Processing...'
                                        : 'Confirm Shipment'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
