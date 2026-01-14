
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, PackageCheck, AlertCircle } from 'lucide-react'
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

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)



import { DashboardLayout } from '@/components/layout/Sidebar'

export default function StoGoodsReceiptPage() {
    const { user } = useAuthUser()
    const queryClient = useQueryClient()
    const [selectedSto, setSelectedSto] = useState<StoOrder | null>(null)
    const [receivingItems, setReceivingItems] = useState<{ sto_item_id: string, barang_id: number, qty_shipped: number, qty_received: number }[]>([])
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

            // Map based on SHIPMENTS to get 'qty_shipped'
            // We aggregate if multiple shipments, but for now assuming 1-1 map as per flow
            // Simplification: We look at sto_shipments inside fullSto.
            // If no shipments found (edge case), we fallback to sto_items (but this shouldn't happen if flow correct)

            const itemsToReceive: typeof receivingItems = []

            // Iterate over shipments (added in service update)
            // @ts-ignore - Supabase types might not perfectly reflect mapping yet without full codegen update, leveraging 'any' if needed or updated type
            const shipments = (fullSto as any).sto_shipments || []

            shipments.forEach((shipment: any) => {
                shipment.sto_shipment_items.forEach((shipItem: any) => {
                    // Find if already in list (if multiple shipments send same item? Shouldn't happen in simple 1-batch flow)
                    // Just push for now
                    // Need to match with master_barang info from sto_items
                    const stoItem = fullSto.sto_items?.find(i => i.id === shipItem.sto_item_id)

                    itemsToReceive.push({
                        sto_item_id: shipItem.sto_item_id,
                        barang_id: shipItem.barang_id,
                        qty_shipped: shipItem.qty_shipped,
                        qty_received: shipItem.qty_shipped // Default pre-fill
                    })
                })
            })

            setReceivingItems(itemsToReceive)
            setIsDetailOpen(true)
        } catch (error) {
            console.error(error)
            toast.error('Failed to load details')
        }
    }

    // 3. Receive Mutation
    const receiveMutation = useMutation({
        mutationFn: stoService.createReceipt.bind(stoService),
        onSuccess: () => {
            toast.success('Goods Received Successfully')
            setIsDetailOpen(false)
            setSelectedSto(null)
            queryClient.invalidateQueries({ queryKey: ['sto_orders'] })
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to receive goods')
        }
    })

    const handleSubmitReceipt = () => {
        if (!selectedSto || !user) return

        // Validation
        const errors = receivingItems.some(i => i.qty_received !== i.qty_shipped)
        if (errors) {
            toast.error('Quantity Received MUST match Quantity Shipped (No Partials)')
            return
        }

        receiveMutation.mutate({
            sto_id: selectedSto.id,
            items: receivingItems,
            received_by: user.id
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

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Goods Receipt (Recipient)</h1>
                    <p className="text-muted-foreground">Receive incoming stock from other outlets</p>
                </div>

                <div className="grid gap-4">
                    {isLoading ? (
                        <div>Loading...</div>
                    ) : stos?.data.length === 0 ? (
                        <Card className="bg-slate-50 border-dashed">
                            <CardContent className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                                <ClipboardCheck className="h-10 w-10 mb-2 opacity-20" />
                                <p>No accepted shipments pending receipt</p>
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
                                            <span>From: <span className="font-medium text-foreground">{sto.from_master_outlet?.name_outlet}</span></span>
                                            <span>•</span>
                                            <span>Created: {format(new Date(sto.created_at), 'dd MMM yyyy')}</span>
                                        </p>
                                    </div>
                                    <Button onClick={() => handleOpenReceive(sto)}>
                                        <PackageCheck className="mr-2 h-4 w-4" /> Receive Goods
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
                            <DialogTitle>Receive Shipment: {selectedSto?.document_number}</DialogTitle>
                            <DialogDescription>
                                Verify physical counts. Quantities must match exactly.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="bg-amber-50 p-3 rounded-md border border-amber-100 text-sm text-amber-700 flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <p>
                                    <strong>Strict Policy:</strong> You must receive exactly what was shipped.
                                    If items are damaged or missing, receive full amount here and then perform
                                    <strong> Inventory Shrinkage/Adjustment</strong> separately.
                                </p>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Qty Shipped</TableHead>
                                        <TableHead className="text-right w-32">Qty Received</TableHead>
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
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmitReceipt} disabled={receiveMutation.isPending}>
                                {receiveMutation.isPending ? 'Processing...' : 'Confirm Receipt'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
