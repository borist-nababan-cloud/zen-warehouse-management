
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PackageSearch, ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { stoService } from '@/services/stoService'
import { useAuthUser } from '@/hooks/useAuth'
import { StoOrder } from '@/types/database'

// Helper
const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

import { DashboardLayout } from '@/components/layout/Sidebar'

export default function StoApprovalPage() {
    const { user } = useAuthUser()
    const queryClient = useQueryClient()
    const [selectedSto, setSelectedSto] = useState<StoOrder | null>(null)
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
            setIsDetailOpen(true)
        } catch (error) {
            toast.error('Failed to load details')
        }
    }

    // 3. Actions
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: 'ACCEPTED' | 'REJECTED' }) =>
            stoService.updateRecipientStatus(id, status),
        onSuccess: (_, variables) => {
            toast.success(`STO ${variables.status === 'ACCEPTED' ? 'Accepted' : 'Rejected'} Successfully`)
            setIsDetailOpen(false)
            setSelectedSto(null)
            queryClient.invalidateQueries({ queryKey: ['sto_orders'] })
        },
        onError: (error: any) => {
            toast.error(error.message || 'Action failed')
        }
    })

    const handleAction = (status: 'ACCEPTED' | 'REJECTED') => {
        if (!selectedSto) return
        if (confirm(`Are you sure you want to ${status} this shipment?`)) {
            updateStatusMutation.mutate({ id: selectedSto.id, status })
        }
    }

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">STO Approval</h1>
                    <p className="text-muted-foreground">Review and accept incoming shipments</p>
                </div>

                <div className="grid gap-4">
                    {isLoading ? (
                        <div>Loading...</div>
                    ) : stos?.data.length === 0 ? (
                        <Card className="bg-slate-50 border-dashed">
                            <CardContent className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                                <PackageSearch className="h-10 w-10 mb-2 opacity-20" />
                                <p>No pending approvals found</p>
                            </CardContent>
                        </Card>
                    ) : (
                        stos?.data.map(sto => (
                            <Card key={sto.id} className="hover:bg-slate-50 transition-colors">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg">{sto.document_number}</span>
                                            <Badge className="bg-orange-500 hover:bg-orange-600">PENDING APPROVAL</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <span>From: <span className="font-medium text-foreground">{sto.from_master_outlet?.name_outlet}</span></span>
                                            <span>•</span>
                                            <span>Created: {format(new Date(sto.created_at), 'dd MMM yyyy')}</span>
                                            <span>•</span>
                                            <span>Value: {formatCurrency(sto.grand_total)}</span>
                                        </p>
                                    </div>
                                    <Button onClick={() => handleViewDetails(sto)} variant="outline">
                                        Review Details <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* DETAIL DIALOG */}
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Review STO: {selectedSto?.document_number}</DialogTitle>
                            <DialogDescription>
                                Check the items and accept the shipment to proceed to receiving.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg">
                                <div>
                                    <span className="text-muted-foreground">From Outlet:</span>
                                    <p className="font-medium">{selectedSto?.from_master_outlet?.name_outlet}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Shipping Cost:</span>
                                    <p className="font-medium">{formatCurrency(selectedSto?.shipping_cost || 0)}</p>
                                </div>
                            </div>

                            <p className="font-medium text-sm">Items List</p>
                            <div className="border rounded-md max-h-60 overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
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
                                <XCircle className="mr-2 h-4 w-4" /> Reject
                            </Button>
                            <Button
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleAction('ACCEPTED')}
                                disabled={updateStatusMutation.isPending}
                            >
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Accept Shipment
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
