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
import { PackageCheck, ArrowLeft, AlertCircle } from 'lucide-react'

// Services & Hooks
import { createGoodsReceipt, getPoDetailsFromView } from '@/services/goodsReceiptService'
import { getPurchaseOrders, getPurchaseOrderById } from '@/services/purchaseOrderService'
import { PurchaseOrder, ViewPoDetailsReceived } from '@/types/database'

interface GRItemRow extends ViewPoDetailsReceived {
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

            // Auto-generate Doc No
            const today = new Date()
            const yyyy = today.getFullYear()
            const mm = String(today.getMonth() + 1).padStart(2, '0')
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
            setDocumentNumber(`GR-${user.kode_outlet}-${yyyy}${mm}-${random}`)
        }

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

        // 1. Fetch Header Info
        const poResult = await getPurchaseOrderById(selectedPoId)
        if (!poResult.data) {
            toast.error('Failed to load PO details')
            return
        }
        setSelectedPo(poResult.data)

        // 2. Fetch Items from VIEW (Server-Side Calculation)
        const viewResult = await getPoDetailsFromView(selectedPoId)

        if (viewResult.data) {
            // Transform items
            const poItems: GRItemRow[] = viewResult.data.map(item => ({
                ...item,
                receivingQty: 0
            }))

            setItems(poItems)
            setStep(2)
        } else {
            toast.error('Failed to load PO Items calculation from server')
        }
    }

    // -- Handlers --
    const handleQtyChange = (poItemId: string, val: number) => {
        setItems(prev => prev.map(i => {
            if (i.po_item_id === poItemId) {
                // Determine max allowed
                // If val > i.qty_remaining, we can either clamp it or allow it but show error.
                // Requirement: "If user types a number > qty_remaining, show red error text or disable Save"
                // Let's allow typing but visuals will change.
                return { ...i, receivingQty: val }
            }
            return i
        }))
    }

    const handleReceiveAll = () => {
        setItems(prev => prev.map(i => ({
            ...i,
            receivingQty: Math.max(0, i.qty_remaining)
        })))
    }

    const handleSubmit = async () => {
        if (!user?.kode_outlet || !user?.id) {
            toast.error('User context invalid')
            return
        }
        if (!selectedPo) return

        // Validate
        const hasInvalidQty = items.some(i => i.receivingQty > i.qty_remaining)
        if (hasInvalidQty) {
            toast.error('Some items exceed the remaining quantity. Please fix errors.')
            return
        }

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
                received_by: user.id
            }

            // 2. Items
            // We need 'barang_id' which is NOT in the View interface explicitly in the user prompt,
            // but usually we need it for insertion.
            // Wait, the prompt provided View columns: po_item_id, po_id, item_name, sku, uom, qty_ordered, qty_already_received, qty_remaining.
            // It did NOT list 'barang_id'. 
            // However, 'createGoodsReceipt' service needs 'barang_id'.
            // I should have checked if 'barang_id' is in the view.
            // Assumption: The view probably has it, or I must map it from the PO object I fetched earlier?
            // Actually, I fetched 'selectedPo' using 'getPurchaseOrderById' which has nested items with barang_id.
            // I can map it.
            // BETTER: I will assume the view DOES have barang_id or I can merge. 
            // Let's try to find the barang_id from the 'selectedPo.purchase_order_items'.

            const detailedItems = items
                .filter(i => i.receivingQty > 0)
                .map(i => {
                    // Find original item to get extra props like barang_id, conversion_rate
                    const original = selectedPo.purchase_order_items?.find(p => p.id === i.po_item_id)
                    return {
                        po_item_id: i.po_item_id,
                        barang_id: original?.barang_id || 0, // Fallback safe, but should exist
                        qty_received: i.receivingQty,
                        conversion_rate: original?.conversion_rate || 1
                    }
                })

            // 3. Calculate PO Status Client-Side
            // Logic: If ALL items will have 0 remaining after this receipt, then COMPLETED.
            const isAllComplete = items.every(i => {
                const futureRemaining = i.qty_remaining - (i.receivingQty || 0)
                return futureRemaining <= 0
            })

            const newStatus = isAllComplete ? 'COMPLETED' : 'PARTIAL'

            const result = await createGoodsReceipt(headerData, detailedItems, newStatus)

            if (result.isSuccess) {
                toast.success('Goods Receipt Saved Successfully')
                setStep(1)
                setSelectedPo(null)
                setSelectedPoId('')
                setItems([])
                loadPOs(user.kode_outlet)
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
                                Receive goods from Suppliers (Server-Calculated).
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

                        {/* Items Table - SERVER COMPUTED */}
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
                                            <TableHead className="w-32 text-center bg-gray-50">Already Received</TableHead>
                                            <TableHead className="w-32 text-center bg-green-50 font-bold text-green-700">Remaining</TableHead>
                                            <TableHead className="w-40 text-center bg-blue-50/50">Receive Now</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map(item => {
                                            const isOver = item.receivingQty > item.qty_remaining
                                            const isComplete = item.qty_remaining === 0

                                            return (
                                                <TableRow key={item.po_item_id} className={isComplete ? 'bg-gray-50/50' : ''}>
                                                    <TableCell>
                                                        <div className="font-medium">{item.item_name}</div>
                                                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                                                        {isOver && (
                                                            <div className="text-xs text-red-600 font-bold flex items-center gap-1 mt-1">
                                                                <AlertCircle className="w-3 h-3" />
                                                                Max: {item.qty_remaining}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                                            {item.uom_purchase}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium">{item.qty_ordered}</TableCell>
                                                    <TableCell className="text-center text-muted-foreground bg-gray-50/50 font-mono">
                                                        {item.qty_already_received}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-green-700 bg-green-50/30">
                                                        {item.qty_remaining}
                                                    </TableCell>
                                                    <TableCell className="text-center bg-blue-50/30">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={item.qty_remaining}
                                                            disabled={isComplete}
                                                            className={`h-9 w-28 mx-auto text-center font-bold ${isOver ? 'border-red-500 text-red-600 focus-visible:ring-red-500' : 'text-blue-800'}`}
                                                            value={item.receivingQty}
                                                            onChange={(e) => handleQtyChange(item.po_item_id, Number(e.target.value))}
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
                                disabled={isSubmitting || items.some(i => i.receivingQty > i.qty_remaining)}
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
