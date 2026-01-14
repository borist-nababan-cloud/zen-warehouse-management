
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Truck, AlertCircle, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

import { stoService } from '@/services/stoService'
import { useAuthUser } from '@/hooks/useAuth'
import { StoOrder } from '@/types/database'



import { DashboardLayout } from '@/components/layout/Sidebar'

export default function StoGoodsIssuePage() {
    const { user } = useAuthUser()
    const queryClient = useQueryClient()
    const [selectedSto, setSelectedSto] = useState<StoOrder | null>(null)
    const [shippingItems, setShippingItems] = useState<{ sto_item_id: string, barang_id: number, qty_shipped: number }[]>([])
    const [isDetailOpen, setIsDetailOpen] = useState(false)

    // 1. Fetch STOs (Sender Logic)
    // Showing DRAFT (to process initially) and ISSUED (if waiting shipment).
    // Ideally, Admin creates DRAFT -> Approves to ISSUED -> Warehouse Ships.
    // But purely based on task flow, Warehouse might pick up DRAFT too if no strict separation.
    // I will filter for DRAFT and ISSUED.
    const { data: stos, isLoading } = useQuery({
        queryKey: ['sto_orders', 'sender', user?.kode_outlet],
        queryFn: () => stoService.getStoOrders(1, 100, {
            outlet_code: user?.kode_outlet || '',
            role: 'SENDER',
            // We manually act on the client side filtering or API side. Service supports single status.
            // Let's modify service or just fetch all for sender and filter here.
            // Service `getStoOrders` filters by single status if provided.
            // I'll fetch ALL for sender and filter in UI for now to see everything.
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
            queryClient.invalidateQueries({ queryKey: ['sto_orders'] })
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to ship STO')
        }
    })

    const handleSubmitShipment = () => {
        if (!selectedSto || !user) return

        // Validate
        if (shippingItems.some(i => i.qty_shipped <= 0)) {
            toast.error('Quantity shipped must be greater than 0')
            return
        }

        shipMutation.mutate({
            sto_id: selectedSto.id,
            items: shippingItems,
            shipped_by: user.id
        })
    }

    const updateQty = (stoItemId: string, qty: number) => {
        setShippingItems(prev => prev.map(item =>
            item.sto_item_id === stoItemId ? { ...item, qty_shipped: qty } : item
        ))
    }

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
                                            {/* <p className="font-bold">{formatCurrency(sto.total_items_price)}</p> */}
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
                                Verify quantities before shipping. Stock will be deducted immediately.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-100 text-sm text-blue-700 flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <p>
                                    Ensure physical goods match the quantities below.
                                    Once shipped, the status will change to <strong>SHIPPED</strong>.
                                </p>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Ordered</TableHead>
                                        <TableHead className="text-right w-32">Shipped Qty</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedSto?.sto_items?.map(item => {
                                        const shipItem = shippingItems.find(i => i.sto_item_id === item.id)
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{item.master_barang?.name}</p>
                                                        <p className="text-xs text-muted-foreground">{item.master_barang?.sku}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{item.qty_requested}</TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        className="text-right h-8"
                                                        value={shipItem?.qty_shipped || 0}
                                                        onChange={(e) => updateQty(item.id, Number(e.target.value))}
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
                            <Button onClick={handleSubmitShipment} disabled={shipMutation.isPending}>
                                {shipMutation.isPending ? 'Processing...' : 'Confirm Shipment'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
