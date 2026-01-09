import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthUser } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { PackageCheck, ArrowLeft } from 'lucide-react'

// Services & Hooks
import { createGoodsReceipt } from '@/services/goodsReceiptService'
import { getPurchaseOrders, getPurchaseOrderById } from '@/services/purchaseOrderService'
import { PurchaseOrder, PurchaseOrderItem } from '@/types/database'

interface GRItemRow extends PurchaseOrderItem {
    productName: string
    sku: string
    receivingQty: number // The input field
}

export function GoodsReceiptCreatePage() {
    const { user } = useAuthUser()
    const navigate = useNavigate()

    // -- State --
    const [step, setStep] = useState<1 | 2>(1)
    const [pos, setPos] = useState<PurchaseOrder[]>([])
    const [selectedPoId, setSelectedPoId] = useState<string>('')
    const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null)

    const [documentNumber, setDocumentNumber] = useState('')
    const [deliveryNote, setDeliveryNote] = useState('')
    const [items, setItems] = useState<GRItemRow[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    // -- Load POs --
    useEffect(() => {
        if (user?.kode_outlet) {
            loadPOs(user.kode_outlet)
        }

        // Auto-generate Doc No
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        setDocumentNumber(`GR-${yyyy}${mm}-${random}`)

    }, [user?.kode_outlet])

    async function loadPOs(outletCode: string) {
        const response = await getPurchaseOrders(outletCode)
        if (response.data) {
            // Filter for ISSUED or PARTIAL only (NOT DRAFT)
            const validPos = response.data.filter(p => p.status === 'ISSUED' || p.status === 'PARTIAL')
            setPos(validPos)
        }
    }

    // -- Step 1 -> Step 2 --
    const handleLoadPO = async () => {
        if (!selectedPoId) return

        const result = await getPurchaseOrderById(selectedPoId)
        if (result.data) {
            setSelectedPo(result.data)

            // Transform items
            const poItems: GRItemRow[] = (result.data.purchase_order_items || []).map(item => ({
                ...item,
                productName: item.master_barang?.name || 'Unknown',
                sku: item.master_barang?.sku || 'UNKNOWN',
                receivingQty: 0 // Start at 0? Or remaining? Let's start at 0 so they count manually.
            }))

            setItems(poItems)
            setStep(2)
        } else {
            toast.error('Failed to load PO details')
        }
    }

    // -- Handlers --
    const handleQtyChange = (itemId: string, val: number) => {
        if (val < 0) return
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, receivingQty: val } : i))
    }

    const handleReceiveAll = () => {
        // Helper to set receiving = ordered - received
        setItems(prev => prev.map(i => {
            const remaining = Math.max(0, i.qty_ordered - (i.qty_received || 0))
            return { ...i, receivingQty: remaining }
        }))
    }

    const handleSubmit = async () => {
        if (!user?.kode_outlet || !user?.id) {
            toast.error('User context invalid')
            return
        }
        if (!selectedPo) return

        // Validate
        const receivingSomething = items.some(i => i.receivingQty > 0)
        if (!receivingSomething) {
            toast.error('You must receive at least one item quantity > 0')
            return
        }

        setIsSubmitting(true)
        try {
            // 1. Header
            const headerData = {
                document_number: documentNumber,
                po_id: selectedPo.id,
                kode_outlet: user.kode_outlet,
                supplier_delivery_note: deliveryNote || '-',
                received_by: user.id // Using profile ID logic from auth hook which maps to user.id usually
            }

            // 2. Items
            // Filter only items with qty > 0 to save space? Or save all 0s? 
            // Usually save only what's received.
            const itemsToSave = items
                .filter(i => i.receivingQty > 0)
                .map(i => ({
                    po_item_id: i.id,
                    barang_id: i.barang_id,
                    qty_received: i.receivingQty,
                    conversion_rate: i.conversion_rate
                }))

            const result = await createGoodsReceipt(headerData, itemsToSave)

            if (result.isSuccess) {
                toast.success('Goods Receipt Saved Successfully')
                // Reset or Navigate
                setStep(1)
                setSelectedPo(null)
                setSelectedPoId('')
                setItems([])
                loadPOs(user.kode_outlet) // Refresh PO list
            } else {
                toast.error(result.error || 'Failed to save GR')
            }

        } catch (err) {
            console.error(err)
            toast.error('Unexpected error')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/procurement/goods-receipts')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Goods Receipt</h1>
                            <p className="text-muted-foreground mt-1">
                                Receive goods from Suppliers against Purchase Orders.
                            </p>
                        </div>
                    </div>
                </div>

                {step === 1 && (
                    <Card className="border-pastel-blue/20 shadow-sm max-w-xl mx-auto mt-10">
                        <CardHeader className="bg-pastel-blue/10">
                            <CardTitle>Select Purchase Order</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                <Label>Pending POs</Label>
                                <Select value={selectedPoId} onValueChange={setSelectedPoId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a PO to Receive..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pos.length === 0 ? (
                                            <div className="p-2 text-sm text-center text-muted-foreground">No Pending POs found</div>
                                        ) : (
                                            pos.map(po => (
                                                <SelectItem key={po.id} value={po.id}>
                                                    {po.document_number} — {po.master_supplier?.name || 'Unknown Supplier'} ({po.status})
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                className="w-full mt-4"
                                disabled={!selectedPoId}
                                onClick={handleLoadPO}
                            >
                                Continue to Receive
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {step === 2 && selectedPo && (
                    <div className="space-y-4">

                        {/* Receiving Header Info */}
                        <Card className="border-pastel-blue/20 shadow-sm">
                            <CardHeader className="bg-pastel-blue/10 pb-3">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-lg">Receiving: {selectedPo.document_number}</CardTitle>
                                    <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                                        Change PO
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 grid grid-cols-2 gap-6">
                                <div>
                                    <Label>Supplier</Label>
                                    <div className="font-medium">{selectedPo.master_supplier?.name}</div>
                                </div>
                                <div>
                                    <Label>GR Document No</Label>
                                    <Input
                                        value={documentNumber}
                                        onChange={e => setDocumentNumber(e.target.value)}
                                        className="font-mono mt-1"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label>Delivery Note / Ref No (Surat Jalan)</Label>
                                    <Input
                                        value={deliveryNote}
                                        onChange={e => setDeliveryNote(e.target.value)}
                                        placeholder="e.g. SJ-12345"
                                        className="mt-1"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Items Table */}
                        <Card className="border-pastel-blue/20 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <CardTitle className="text-lg">Items to Receive</CardTitle>
                                <Button size="sm" variant="outline" onClick={handleReceiveAll}>
                                    Receive Remaining
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="w-24 text-center">Unit</TableHead>
                                            <TableHead className="w-32 text-center">Ordered</TableHead>
                                            <TableHead className="w-32 text-center">Prev. Rcvd</TableHead>
                                            <TableHead className="w-32 text-center">Total Rcvd</TableHead>
                                            <TableHead className="w-40 text-center bg-blue-50/50">Receive Now</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map(item => {
                                            const prev = item.qty_received || 0
                                            const current = item.receivingQty || 0
                                            const total = prev + current
                                            const isOver = total > item.qty_ordered

                                            return (
                                                <TableRow key={item.id} className={isOver ? 'bg-red-50' : ''}>
                                                    <TableCell>
                                                        <div className="font-medium">{item.productName}</div>
                                                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                                                        {isOver && <div className="text-xs text-red-600 font-bold mt-1">Over Limit! Max: {item.qty_ordered}</div>}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                                            {item.uom_purchase}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium">{item.qty_ordered}</TableCell>
                                                    <TableCell className="text-center text-muted-foreground">{prev}</TableCell>
                                                    <TableCell className={`text-center font-bold ${isOver ? 'text-red-600' : 'text-gray-900'}`}>{total}</TableCell>
                                                    <TableCell className="text-center bg-blue-50/30">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            className={`h-9 w-28 mx-auto text-center font-bold ${isOver ? 'border-red-500 text-red-600 focus-visible:ring-red-500' : 'text-blue-800'}`}
                                                            value={item.receivingQty}
                                                            onChange={(e) => handleQtyChange(item.id, Number(e.target.value))}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end pt-4">
                            <Button
                                size="lg"
                                className="bg-green-600 hover:bg-green-700 text-white min-w-[200px]"
                                onClick={handleSubmit}
                                disabled={isSubmitting || items.some(i => ((i.qty_received || 0) + (i.receivingQty || 0)) > i.qty_ordered)}
                            >
                                <PackageCheck className="w-5 h-5 mr-2" />
                                {isSubmitting ? 'Saving...' : 'Confirm Receipt'}
                            </Button>
                        </div>

                    </div>
                )}

            </div>
        </DashboardLayout>
    )
}
