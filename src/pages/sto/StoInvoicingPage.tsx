
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

import { stoService } from '@/services/stoService'
import { useAuthUser } from '@/hooks/useAuth'
import { StoOrder } from '@/types/database'

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)



import { DashboardLayout } from '@/components/layout/Sidebar'

export default function StoInvoicingPage() {
    const { user } = useAuthUser()
    const queryClient = useQueryClient()
    const [selectedSto, setSelectedSto] = useState<StoOrder | null>(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)

    // 1. Fetch Completed STOs
    const { data: stos, isLoading } = useQuery({
        queryKey: ['sto_orders', 'invoicing', user?.kode_outlet],
        queryFn: () => stoService.getStoOrders(1, 100, {
            outlet_code: user?.kode_outlet || '',
            role: 'RECIPIENT',
            recipient_status: 'COMPLETED' // Must be completed (received)
        }),
        enabled: !!user?.kode_outlet
    })

    // Filter out already invoiced items
    // @ts-ignore - Supabase join returns array for 1:M
    const uninvoicedStos = stos?.data.filter(s => !s.sto_invoices || s.sto_invoices.length === 0) || []

    // 2. Load Detail
    const handleOpenInvoice = async (sto: StoOrder) => {
        try {
            const fullSto = await stoService.getStoDetail(sto.id)
            setSelectedSto(fullSto)
            setIsDetailOpen(true)
        } catch (error) {
            toast.error('Failed to load details')
        }
    }

    // 3. Create Invoice Mutation
    const invoiceMutation = useMutation({
        mutationFn: ({ stoId, userId }: { stoId: string, userId: string }) =>
            stoService.createInvoice(stoId, userId),
        onSuccess: () => {
            toast.success('Invoice Generated Successfully')
            setIsDetailOpen(false)
            setSelectedSto(null)
            queryClient.invalidateQueries({ queryKey: ['sto_orders'] })
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to generate invoice')
        }
    })

    const handleSubmit = () => {
        if (!selectedSto || !user) return
        invoiceMutation.mutate({ stoId: selectedSto.id, userId: user.id })
    }

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">STO Invoicing</h1>
                    <p className="text-muted-foreground">Generate invoices for completed stock transfers</p>
                </div>

                <div className="grid gap-4">
                    {isLoading ? (
                        <div>Loading...</div>
                    ) : uninvoicedStos.length === 0 ? (
                        <Card className="bg-slate-50 border-dashed">
                            <CardContent className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                                <FileText className="h-10 w-10 mb-2 opacity-20" />
                                <p>No completed orders pending invoice</p>
                            </CardContent>
                        </Card>
                    ) : (
                        uninvoicedStos.map(sto => (
                            <Card key={sto.id} className="hover:bg-slate-50 transition-colors">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg">{sto.document_number}</span>
                                            <Badge className="bg-blue-600">COMPLETED</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <span>From: <span className="font-medium text-foreground">{sto.from_master_outlet?.name_outlet}</span></span>
                                            <span>•</span>
                                            <span>Created: {format(new Date(sto.created_at), 'dd MMM yyyy')}</span>
                                            <span>•</span>
                                            <span>Value: {formatCurrency(sto.grand_total)}</span>
                                        </p>
                                    </div>
                                    <Button onClick={() => handleOpenInvoice(sto)} variant="default">
                                        <FileText className="mr-2 h-4 w-4" /> Generate Invoice
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* INVOICE PREVIEW DIALOG */}
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Generate Invoice: {selectedSto?.document_number}</DialogTitle>
                            <DialogDescription>
                                Review the final invoice details before posting to Finance Ledger.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-8 p-6 bg-slate-50 rounded-lg border">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Bill To (Us)</p>
                                    <p className="font-medium">{selectedSto?.to_master_outlet?.name_outlet}</p>
                                    <p className="text-sm text-muted-foreground">{selectedSto?.to_master_outlet?.alamat || 'Address unknown'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Pay To (Sender)</p>
                                    <p className="font-medium">{selectedSto?.from_master_outlet?.name_outlet}</p>
                                    <p className="text-sm text-muted-foreground">{selectedSto?.from_master_outlet?.alamat || 'Address unknown'}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Total Items Cost ({selectedSto?.sto_items?.length || 0} items)</span>
                                    <span className="font-mono">{formatCurrency(selectedSto?.total_items_price || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Shipping Cost</span>
                                    <span className="font-mono">{formatCurrency(selectedSto?.shipping_cost || 0)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center pt-2">
                                    <span className="font-bold text-lg">Total Payable</span>
                                    <span className="font-bold text-xl text-blue-600">{formatCurrency(selectedSto?.grand_total || 0)}</span>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-3 rounded text-sm text-blue-700">
                                <p>Generating this invoice will create a Payable in the Finance Ledger.</p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={invoiceMutation.isPending}>
                                {invoiceMutation.isPending ? 'Generating...' : 'Confirm & Post Invoice'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
