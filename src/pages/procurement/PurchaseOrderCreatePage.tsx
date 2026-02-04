import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Trash2, Save, Send, Lock, ArrowLeft, FileText } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog'

// Services & Hooks
import { createPurchaseOrder, getPurchaseOrderById, updatePurchaseOrderItems, createInvoice } from '@/services/purchaseOrderService'
import { useSuppliers } from '@/hooks/useSupplier'
import { MasterBarang, PurchaseOrder } from '@/types/database'
import { supabase } from '@/lib/supabase'

interface POItemRow {
    id: number // local temp id for React key (time based) OR real DB ID for edit
    db_id?: string // Real DB UUID if editing
    barang_id: number | null
    productName: string // for display/search
    sku: string
    qty: number
    unit: string // uom_purchase
    price: number
    conversion_rate: number
    subtotal: number
}

export function PurchaseOrderCreatePage() {
    const navigate = useNavigate()
    const { id } = useParams() // Check for Edit Mode
    const { user } = useAuthUser()

    const isEditMode = Boolean(id)

    // -- State --
    const [docNumber, setDocNumber] = useState('')
    const [isGeneratingNo, setIsGeneratingNo] = useState(true)
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
    const [expectedDate, setExpectedDate] = useState('')
    const [roNumber, setRoNumber] = useState('')  // [NEW] RO Number
    const [notes, setNotes] = useState('')        // [NEW] Notes
    const [items, setItems] = useState<POItemRow[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [existingPo, setExistingPo] = useState<PurchaseOrder | null>(null)

    const isReadOnly = existingPo?.status === 'PARTIAL' || existingPo?.status === 'COMPLETED' || existingPo?.status === 'CANCELLED' || existingPo?.status === 'INVOICED'

    // Invoice Specific State
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)
    const [invNumber, setInvNumber] = useState('')
    const [invDueDate, setInvDueDate] = useState('')
    const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)

    // -- Data Fetching --
    const { data: suppliersData } = useSuppliers(user?.kode_outlet || '')
    const suppliers = suppliersData?.data || []

    const [products, setProducts] = useState<MasterBarang[]>([])

    // Load Products
    useEffect(() => {
        if (user?.kode_outlet) {
            loadProducts(user.kode_outlet)
        }
    }, [user?.kode_outlet])

    // Load Existing PO (Edit Mode)
    useEffect(() => {
        if (isEditMode && id) {
            loadPoForEdit(id)
            setIsGeneratingNo(false) // Don't generate
        }
    }, [isEditMode, id])

    // Load Next PO Number (RPC) - ONLY if Not Edit Mode
    useEffect(() => {
        if (!isEditMode && user?.kode_outlet) {
            fetchNextPoNumber(user.kode_outlet)
        }
    }, [isEditMode, user?.kode_outlet])

    async function loadPoForEdit(poId: string) {
        setIsSubmitting(true)
        const res = await getPurchaseOrderById(poId)
        if (res.data) {
            const po = res.data
            setExistingPo(po)
            setDocNumber(po.document_number)
            setSelectedSupplierId(po.kode_supplier)
            setExpectedDate(po.expected_delivery_date || '')
            setRoNumber(po.ro_number || '') // [NEW] Bind RO
            setNotes(po.notes || '')        // [NEW] Bind Notes

            // Map items
            if (po.purchase_order_items) {
                const mappedItems: POItemRow[] = po.purchase_order_items.map(i => ({
                    id: Date.now() + Math.random(), // Temp unique key for react
                    db_id: i.id, // Keep Track of real ID
                    barang_id: i.barang_id,
                    productName: i.master_barang?.name || 'Unknown',
                    sku: i.master_barang?.sku || '',
                    qty: i.qty_ordered,
                    unit: i.uom_purchase,
                    price: i.price_per_unit,
                    conversion_rate: i.conversion_rate,
                    subtotal: i.qty_ordered * i.price_per_unit
                }))
                setItems(mappedItems)
            }

            // Check Status Restriction
            if (po.status !== 'DRAFT' && po.status !== 'ISSUED') {
                toast.warning(`This PO is ${po.status}. You can view it but cannot edit items.`)
            }
        } else {
            toast.error('Failed to load PO')
            navigate('/procurement/purchase-orders')
        }
        setIsSubmitting(false)
    }

    async function fetchNextPoNumber(outletCode: string) {
        setIsGeneratingNo(true)
        try {
            const { data, error } = await supabase.rpc('get_next_po_number', { outlet_code: outletCode })
            if (error) throw error
            if (data) setDocNumber(data)
        } catch (err) {
            console.error('Failed to generate PO Number:', err)
            toast.error('Failed to generate PO Number')
        } finally {
            setIsGeneratingNo(false)
        }
    }

    async function loadProducts(outletCode: string) {
        const { data } = await supabase
            .from('master_barang')
            .select('*')
            .eq('kode_outlet', outletCode)
            .eq('deleted', false)
            .order('name')

        if (data) setProducts(data)
    }

    // -- Handlers --
    const handleAddItem = () => {
        setItems([
            ...items,
            {
                id: Date.now(),
                barang_id: null,
                productName: '',
                sku: '',
                qty: 1,
                unit: 'PCS',
                price: 0,
                conversion_rate: 1,
                subtotal: 0,
            },
        ])
    }

    const handleRemoveItem = (id: number) => {
        setItems(items.filter((i) => i.id !== id))
    }

    const handleProductChange = async (rowId: number, productIdStr: string) => {
        const productId = Number(productIdStr)
        const product = products.find((p) => p.id === productId)
        if (!product) return

        // Fetch Unit Info for this product (conversion rate)
        let convRate = 1
        let purchaseUom = 'PCS'

        // Check barang_units
        const { data: unitData } = await supabase
            .from('barang_units')
            .select('conversion_rate, purchase_uom')
            .eq('barang_id', productId)
            .eq('kode_outlet', user?.kode_outlet)
            .maybeSingle()

        // Check barang_prices for buy_price
        const { data: priceData } = await supabase
            .from('barang_prices')
            .select('buy_price')
            .eq('barang_id', productId)
            .eq('kode_outlet', user?.kode_outlet)
            .maybeSingle()

        if (unitData) {
            convRate = unitData.conversion_rate || 1
            purchaseUom = unitData.purchase_uom || 'PCS'
        }

        let buyPrice = 0
        if (priceData) {
            buyPrice = priceData.buy_price || 0
        }

        setItems((prev) =>
            prev.map((item) =>
                item.id === rowId
                    ? {
                        ...item,
                        barang_id: productId,
                        productName: product.name || '',
                        sku: product.sku || '',
                        unit: purchaseUom,
                        conversion_rate: convRate,
                        price: buyPrice, // Auto-fill price
                        subtotal: item.qty * buyPrice, // recalculate
                    }
                    : item
            )
        )
    }

    const handleItemChange = (rowId: number, field: keyof POItemRow, value: any) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== rowId) return item

                const updated = { ...item, [field]: value }

                // Auto-calc subtotal
                if (field === 'qty' || field === 'price') {
                    updated.subtotal = updated.qty * updated.price
                }
                return updated
            })
        )
    }

    const calculateGrandTotal = () => {
        return items.reduce((sum, item) => sum + item.subtotal, 0)
    }

    const handleSubmit = async (status: 'DRAFT' | 'ISSUED') => {
        if (!user?.kode_outlet) {
            toast.error('User outlet not found')
            return
        }
        if (!selectedSupplierId) {
            toast.error('Please select a supplier')
            return
        }
        if (items.length === 0) {
            toast.error('Please add at least one item')
            return
        }

        const isReadOnly = existingPo && (existingPo.status !== 'DRAFT' && existingPo.status !== 'ISSUED')
        if (isReadOnly) {
            toast.error('Cannot edit this PO (Status restrictions)')
            return
        }

        // Validate items
        const invalidItems = items.filter(i => !i.barang_id || i.qty <= 0)
        if (invalidItems.length > 0) {
            toast.error('Please fix invalid items (check product selection or quantity)')
            return
        }

        setIsSubmitting(true)
        try {
            // 2. Prepare Items Data
            const itemsData = items.map(item => ({
                id: item.db_id, // Pass DB ID if exists (for Update)
                barang_id: item.barang_id!,
                qty_ordered: item.qty,
                uom_purchase: item.unit,
                conversion_rate: item.conversion_rate,
                price_per_unit: item.price,
            }))

            if (isEditMode && id) {
                // --- UPDATE MODE ---
                const result = await updatePurchaseOrderItems(id, {
                    total_amount: calculateGrandTotal(),
                    status: status,
                    ro_number: roNumber, // [NEW]
                    notes: notes         // [NEW]
                }, itemsData)

                if (result.isSuccess) {
                    toast.success(`Purchase Order Updated Successfully!`)
                    navigate('/procurement/purchase-orders')
                } else {
                    toast.error(result.error || 'Failed to update PO')
                }

            } else {
                // --- CREATE MODE ---
                const headerData = {
                    document_number: docNumber,
                    kode_supplier: selectedSupplierId,
                    kode_outlet: user.kode_outlet,
                    total_amount: calculateGrandTotal(),
                    expected_delivery_date: expectedDate || new Date().toISOString().split('T')[0],
                    status: status,
                    created_by: user.id, // Track user creation
                    ro_number: roNumber, // [NEW]
                    notes: notes         // [NEW]
                }

                const payloadItems = items.map(item => ({
                    barang_id: item.barang_id!,
                    qty_ordered: item.qty,
                    uom_purchase: item.unit,
                    conversion_rate: item.conversion_rate,
                    price_per_unit: item.price,
                }))

                const result = await createPurchaseOrder(headerData, payloadItems)

                if (result.isSuccess) {
                    toast.success(`Purchase Order ${status === 'DRAFT' ? 'Saved' : 'Issued'} Successfully!`)
                    fetchNextPoNumber(user.kode_outlet)
                    setItems([])
                    setSelectedSupplierId('')
                } else {
                    if (result.error && (result.error.includes('duplicate key') || result.error.includes('23505'))) {
                        toast.warning('Document Number was taken. Generating a new one...')
                        await fetchNextPoNumber(user.kode_outlet)
                    } else {
                        toast.error(result.error || 'Failed to create PO')
                    }
                }
            }

        } catch (err) {
            console.error(err)
            toast.error('An unexpected error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCreateInvoice = async () => {
        if (!invNumber || !invDueDate) {
            toast.error('Please fill in all invoice fields')
            return
        }
        if (!id) return

        setIsCreatingInvoice(true)
        const result = await createInvoice(id, invNumber, invDueDate)
        setIsCreatingInvoice(false)

        if (result.isSuccess) {
            toast.success('Invoice created successfully!')
            setIsInvoiceDialogOpen(false)
            // Reload PO to update status
            loadPoForEdit(id)
        } else {
            toast.error(result.error || 'Failed to create Invoice')
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-6xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/procurement/purchase-orders')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}</h1>
                            <p className="text-muted-foreground mt-1">
                                {isEditMode ? 'Modify existing order details.' : 'Create a new order for suppliers.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Header Form */}
                <Card className="border-pastel-blue/20 shadow-sm">
                    <CardHeader className="bg-pastel-blue/10 pb-4">
                        <CardTitle className="text-lg">Order Details</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Document Number */}
                            <div>
                                <Label htmlFor="doc_number">Document Number</Label>
                                <Input
                                    id="doc_number"
                                    value={isGeneratingNo ? 'Generating...' : docNumber}
                                    readOnly={true} // Always read only for Doc Number as it is auto-gen or locked on edit
                                    className="mt-2 font-mono bg-muted"
                                />
                            </div>

                            {/* [NEW] RO Number */}
                            <div>
                                <Label htmlFor="ro_number">RO Number</Label>
                                <Input
                                    id="ro_number"
                                    value={roNumber}
                                    onChange={(e) => setRoNumber(e.target.value)}
                                    placeholder="Optional"
                                    className="mt-2"
                                    disabled={isReadOnly}
                                />
                            </div>

                            {/* Supplier */}
                            <div className="md:col-span-1">
                                <Label>Supplier</Label>
                                <Select
                                    value={selectedSupplierId}
                                    onValueChange={setSelectedSupplierId}
                                    disabled={isEditMode} // Lock supplier on edit
                                >
                                    <SelectTrigger className={`mt-2 ${isEditMode ? 'bg-muted opacity-100' : ''}`}>
                                        <SelectValue placeholder="Select Supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map(s => (
                                            <SelectItem key={s.kode_supplier} value={s.kode_supplier}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Delivery Date */}
                            <div>
                                <Label htmlFor="date">Expected Delivery</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={expectedDate}
                                    onChange={e => setExpectedDate(e.target.value)}
                                    className="mt-2"
                                />
                            </div>

                        </div>
                    </CardContent>
                </Card>

                {/* Items Table */}
                <Card className="border-pastel-blue/20 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between bg-pastel-blue/10 pb-4">
                        <CardTitle className="text-lg">Order Items</CardTitle>
                        {!isReadOnly && (
                            <Button size="sm" onClick={handleAddItem} variant="outline" className="border-blue-200 hover:bg-blue-50 text-blue-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Item
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[30%]">Product</TableHead>
                                    <TableHead className="w-[10%]">Qty</TableHead>
                                    <TableHead className="w-[10%]">Unit</TableHead>
                                    <TableHead className="w-[20%]">Price / Unit</TableHead>
                                    <TableHead className="w-[20%] text-right">Subtotal</TableHead>
                                    <TableHead className="w-[10%]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No items added yet. Click "Add Item" to start.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <TableCell>
                                                <SearchableSelect
                                                    value={item.barang_id ? String(item.barang_id) : ''}
                                                    onChange={(val: string) => handleProductChange(item.id, val)}
                                                    disabled={isReadOnly}
                                                    placeholder="Select Product"
                                                    options={products.map(p => ({
                                                        value: String(p.id),
                                                        label: p.name || 'Unknown',
                                                        subLabel: p.sku || ''
                                                    }))}
                                                />
                                            </TableCell>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.qty}
                                                onChange={(e) => handleItemChange(item.id, 'qty', Number(e.target.value))}
                                                className="h-9"
                                                disabled={isReadOnly}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center h-9 px-3 bg-muted/50 rounded-md text-sm border">
                                                {item.unit}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={item.price}
                                                onChange={(e) => handleItemChange(item.id, 'price', Number(e.target.value))}
                                                className="h-9"
                                                disabled={isReadOnly}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.subtotal)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleRemoveItem(item.id)}
                                                disabled={isReadOnly}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Footer Totals */}
                        <div className="flex justify-end p-6 bg-slate-50 border-t">
                            <div className="text-right">
                                <span className="text-muted-foreground mr-4">Grand Total:</span>
                                <span className="text-2xl font-bold text-blue-900">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(calculateGrandTotal())}
                                </span>
                            </div>
                        </div>

                        {/* [NEW] Notes Section */}
                        <div className="mt-6 px-6 pb-6">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Add notes here..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="mt-2"
                                rows={3}
                                disabled={isReadOnly}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4">
                    {!isReadOnly ? (
                        <>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => handleSubmit('DRAFT')}
                                disabled={isSubmitting}
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save as Draft
                            </Button>
                            <Button
                                size="lg"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => handleSubmit('ISSUED')}
                                disabled={isSubmitting}
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Issue PO (Final)
                            </Button>
                        </>
                    ) : (
                        <div className="text-muted-foreground italic flex items-center">
                            <Lock className="w-4 h-4 mr-2" />
                            This Order is {existingPo?.status} and cannot be edited.
                        </div>
                    )}

                    {/* Invoice Link / Create Button */}
                    {isEditMode && existingPo?.status !== 'DRAFT' && existingPo?.status !== 'INVOICED' && (
                        <div className="ml-2 pl-2 border-l border-gray-300">
                            <Button
                                variant="secondary"
                                className="bg-purple-100 text-purple-700 hover:bg-purple-200"
                                onClick={() => setIsInvoiceDialogOpen(true)}
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Create Invoice
                            </Button>
                        </div>
                    )}

                    {existingPo?.status === 'INVOICED' && (
                        <div className="ml-2 pl-2 border-l border-gray-300">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <FileText className="w-3 h-3 mr-1" />
                                Invoiced
                            </span>
                        </div>
                    )}
                </div>

                {/* Create Invoice Dialog */}
                <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Purchase Invoice</DialogTitle>
                            <DialogDescription>
                                Enter the supplier's invoice details to process this PO.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="inv-no">Supplier Invoice Number</Label>
                                <Input
                                    id="inv-no"
                                    value={invNumber}
                                    onChange={(e) => setInvNumber(e.target.value)}
                                    placeholder="e.g. INV-2023-001"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="inv-due">Payment Due Date</Label>
                                <Input
                                    id="inv-due"
                                    type="date"
                                    value={invDueDate}
                                    onChange={(e) => setInvDueDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateInvoice} disabled={isCreatingInvoice}>
                                {isCreatingInvoice ? 'Creating...' : 'Create Invoice'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </DashboardLayout >
    )
}
