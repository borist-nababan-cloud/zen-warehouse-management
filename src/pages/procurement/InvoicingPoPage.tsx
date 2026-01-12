import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthUser } from '@/hooks/useAuth'
import { getCompletedPurchaseOrders, createPurchaseInvoice } from '@/services/purchaseInvoiceService'
import { getPoDetailsFromView } from '@/services/goodsReceiptService'
import { PurchaseOrder, ViewPoDetailsReceived } from '@/types/database'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/Sidebar'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// Simple Custom Modal Component to avoid missing dependency
function SimpleModal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    if (!isOpen) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-lg">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    )
}
import { FileText, Loader2, Calendar as CalendarIcon } from 'lucide-react'

// Helper to format date YYYY-MM-DD for input type="date"
function formatDateForInput(date: Date) {
    return date.toISOString().split('T')[0]
}

import { format } from 'date-fns'

export function InvoicingPoPage() {
    const { user } = useAuthUser()

    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Modal State
    const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null)
    const [poDetails, setPoDetails] = useState<ViewPoDetailsReceived[]>([])
    const [isDetailsLoading, setIsDetailsLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Form State
    const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('')
    const [dueDate, setDueDate] = useState<string>('')

    const fetchOrders = async () => {
        setIsLoading(true)
        try {
            const result = await getCompletedPurchaseOrders('111') // Hardcoded holding
            if (result.isSuccess && result.data) {
                setOrders(result.data)
            } else {
                toast.error(result.error || "Failed to load orders")
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchPoDetails = async (poId: string) => {
        setIsDetailsLoading(true)
        try {
            const result = await getPoDetailsFromView(poId)
            if (result.isSuccess && result.data) {
                setPoDetails(result.data)
            } else {
                toast.error(result.error || "Failed to load PO details")
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsDetailsLoading(false)
        }
    }

    useEffect(() => {
        fetchOrders()
    }, [])

    const handleOpenModal = (po: PurchaseOrder) => {
        setSelectedPo(po)
        setSupplierInvoiceNumber('')
        setDueDate('')
        setPoDetails([]) // Reset previous details
        setIsModalOpen(true)
        fetchPoDetails(po.id)
    }

    const handleSubmitInvoice = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPo || !supplierInvoiceNumber || !dueDate) {
            toast.error('Please fill all fields')
            return
        }

        if (!confirm('Are you sure you want to generate this Invoice? This action is irreversible.')) return

        setIsSubmitting(true)
        const result = await createPurchaseInvoice({
            target_po_id: selectedPo.id,
            supplier_inv_ref: supplierInvoiceNumber,
            payment_due_date: dueDate, // Already in YYYY-MM-DD from input type="date"
            user_id: user?.id || '' // Pass user_id from auth context
        })

        if (result.isSuccess) {
            toast.success(`Invoice created successfully! Total: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(result.data))}`)
            setIsModalOpen(false)
            // Refresh list
            if (user?.kode_outlet) fetchOrders()
        } else {
            toast.error(`Failed to create invoice: ${result.error}`)
        }
        setIsSubmitting(false)
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Purchase Invoicing</h1>
                        <p className="text-muted-foreground mt-1">
                            Process completed Purchase Orders into Invoices for payment.
                        </p>
                    </div>
                </div>

                <Card className="border-pastel-blue/20 shadow-sm bg-white/50 backdrop-blur-sm">
                    <CardHeader className="bg-pastel-blue/10">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Ready for Invoicing
                        </CardTitle>
                        <CardDescription>
                            These orders have been completed and are waiting for invoice generation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>PO Number</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead>Created Date</TableHead>
                                    <TableHead>Total (Est.)</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Loading orders...
                                        </TableCell>
                                    </TableRow>
                                ) : orders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No completed orders pending invoice found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    orders.map((po) => (
                                        <TableRow key={po.id}>
                                            <TableCell className="font-mono font-medium">{po.document_number}</TableCell>
                                            <TableCell>{po.master_supplier?.name || '-'}</TableCell>
                                            <TableCell>{po.created_at ? new Date(po.created_at).toLocaleDateString() : '-'}</TableCell>
                                            <TableCell>
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(po.total_amount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200 shadow-sm"
                                                    onClick={() => handleOpenModal(po)}
                                                >
                                                    Create Invoice
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Custom Modal for Invoice Creation */}
                <SimpleModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title="Generate Purchase Invoice"
                >
                    <div className="space-y-4">
                        <div className="rounded-md border p-4 bg-muted/20">
                            <h4 className="font-semibold mb-2 text-sm text-foreground">PO Summary: {selectedPo?.document_number}</h4>

                            {isDetailsLoading ? (
                                <div className="text-center py-4 text-sm text-muted-foreground">Loading details...</div>
                            ) : (
                                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead>Item</TableHead>
                                                <TableHead className="text-right">Qty PO</TableHead>
                                                <TableHead className="text-right">Qty Received</TableHead>
                                                <TableHead className="text-right">Price/Unit</TableHead>
                                                <TableHead className="text-right">Total (PO)</TableHead>
                                                <TableHead className="text-right">Total (Actual)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {poDetails.map((item) => (
                                                <TableRow key={item.po_item_id}>
                                                    <TableCell className="font-medium">
                                                        {item.item_name}
                                                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {item.qty_ordered} {item.uom_purchase}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-blue-600">
                                                        {item.qty_already_received} {item.uom_purchase}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.price_per_unit || 0)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.total_price_po || 0)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-green-700">
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.total_price_received || 0)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {/* Summary Row */}
                                            <TableRow className="bg-muted/30 font-bold border-t-2">
                                                <TableCell colSpan={4} className="text-right">Grand Total</TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                                                        poDetails.reduce((sum, item) => sum + (item.total_price_po || 0), 0)
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-green-700 text-lg">
                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                                                        poDetails.reduce((sum, item) => sum + (item.total_price_received || 0), 0)
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>

                        <span className="text-xs text-yellow-600 font-medium bg-yellow-50 px-2 py-1 rounded inline-block">
                            Warning: This will lock the PO and update Inventory values.

                        </span>
                    </div>

                    <form onSubmit={handleSubmitInvoice} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="supplier_inv">Supplier Invoice Number</Label>
                            <Input
                                id="supplier_inv"
                                placeholder="e.g. INV-2025-001"
                                value={supplierInvoiceNumber}
                                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="due_date">Payment Due Date</Label>
                            <div className="relative">
                                <Input
                                    id="due_date"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    required
                                    className="pl-10"
                                />
                                <CalendarIcon className="h-4 w-4 absolute left-3 top-3 text-gray-500" />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Generate Invoice
                            </Button>
                        </div>
                    </form>
                </SimpleModal>
            </div>
        </DashboardLayout>
    )
}
