import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { useAuthUser } from '@/hooks/useAuth'
import { internalReturnService } from '@/services/internalReturnService'
import * as inventoryService from '@/services/inventoryService'
import { MasterIssueCategory } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { SearchableSelect } from '@/components/ui/searchable-select'


interface ReturnCartItem {
    id: number // barang_id
    sku: string
    name: string
    uom: string | null
    qty_returned: number
    condition_notes: string
}

export default function InternalReturnFormPage() {
    const navigate = useNavigate()
    const { user } = useAuthUser()

    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState<MasterIssueCategory[]>([])

    // Product Data
    const [productOptions, setProductOptions] = useState<any[]>([])
    const [rawProducts, setRawProducts] = useState<any[]>([])

    // Form State
    const [categoryId, setCategoryId] = useState<string>('')
    const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [returnedBy, setReturnedBy] = useState('')
    const [headerNotes, setHeaderNotes] = useState('')
    const [cart, setCart] = useState<ReturnCartItem[]>([])

    const [selectedProductId, setSelectedProductId] = useState<string>('')

    useEffect(() => {
        loadInitialData()
    }, [user])

    const loadInitialData = async () => {
        // 1. Load Categories
        const catRes = await internalReturnService.getCategories()
        if (catRes.data) setCategories(catRes.data)

        // 2. Load Products for search (using opname balance for full list)
        if (user?.kode_outlet) {
            const prodRes = await inventoryService.getInventoryBalanceForOpname(user.kode_outlet)
            if (prodRes.data) {
                setRawProducts(prodRes.data)
                const options = prodRes.data.map((p: any) => ({
                    value: p.barang_id.toString(),
                    label: p.master_barang?.name || 'Unknown Item',
                    subLabel: `SKU: ${p.master_barang?.sku}`
                }))
                setProductOptions(options)
            }
        }
    }

    useEffect(() => {
        if (selectedProductId) {
            const prod = rawProducts.find(p => p.barang_id.toString() === selectedProductId)
            if (prod) {
                addToCart(prod)
                setTimeout(() => setSelectedProductId(''), 100)
            }
        }
    }, [selectedProductId])

    const addToCart = (product: any) => {
        if (cart.find(c => c.id === product.barang_id)) {
            toast.error("Item already in list")
            return
        }

        setCart([...cart, {
            id: product.barang_id,
            sku: product.master_barang?.sku || '',
            name: product.master_barang?.name || '',
            uom: 'PCS', // Default
            qty_returned: 1, // Default 1
            condition_notes: 'Good' // Default condition
        }])
    }

    const updateCartItem = (index: number, field: keyof ReturnCartItem, value: any) => {
        const newCart = [...cart]
        newCart[index] = { ...newCart[index], [field]: value }
        setCart(newCart)
    }

    const removeCartItem = (index: number) => {
        const newCart = [...cart]
        newCart.splice(index, 1)
        setCart(newCart)
    }

    const handleSubmit = async () => {
        if (!categoryId) return toast.error("Please select a category")
        if (!returnedBy) return toast.error("Please enter who returned the items")
        if (cart.length === 0) return toast.error("Please add at least one item")

        // Validate
        for (const item of cart) {
            if (item.qty_returned <= 0) {
                return toast.error(`Invalid quantity for ${item.name}`)
            }
        }

        setLoading(true)
        try {
            const header = {
                kode_outlet: user!.kode_outlet!,
                category_id: parseInt(categoryId),
                transaction_date: transactionDate,
                returned_by: returnedBy,
                notes: headerNotes
            }

            const items = cart.map(c => ({
                barang_id: c.id,
                qty_returned: c.qty_returned,
                uom: c.uom,
                condition_notes: c.condition_notes
            }))

            const res = await internalReturnService.createReturn(header, items, user!.id)

            if (res.isSuccess) {
                toast.success("Internal Return Created!")
                navigate('/inventory/internal-return')
            } else {
                toast.error(res.error || "Failed to create return")
            }
        } catch (err) {
            toast.error("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate('/inventory/internal-return')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Internal Return</h1>
                        <p className="text-slate-500">Return items to warehouse inventory.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Header Information */}
                    <Card className="md:col-span-1 border-slate-200 h-fit">
                        <CardHeader>
                            <CardTitle className="text-base text-teal-700">Transaction Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Category (Reused) <span className="text-red-500">*</span></Label>
                                <Select value={categoryId} onValueChange={setCategoryId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.category_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Returned By <span className="text-red-500">*</span></Label>
                                <Input placeholder="e.g. John Doe" value={returnedBy} onChange={e => setReturnedBy(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea placeholder="Additional notes..." value={headerNotes} onChange={e => setHeaderNotes(e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Items & Cart */}
                    <Card className="md:col-span-2 border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Returned Items</CardTitle>

                            <div className="w-[300px]">
                                <SearchableSelect
                                    options={productOptions}
                                    value={selectedProductId}
                                    onChange={setSelectedProductId}
                                    placeholder="Search Product to Return..."
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="w-[120px]">Condition</TableHead>
                                        <TableHead className="w-[100px]">Qty Return</TableHead>
                                        <TableHead className="w-[60px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cart.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                                No items added yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        cart.map((item, index) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="font-medium text-slate-700">{item.name}</div>
                                                    <div className="text-xs text-slate-500">{item.sku}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        placeholder="Condition..."
                                                        className="h-8 text-xs"
                                                        value={item.condition_notes}
                                                        onChange={(e) => updateCartItem(index, 'condition_notes', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        value={item.qty_returned}
                                                        onChange={(e) => updateCartItem(index, 'qty_returned', parseFloat(e.target.value))}
                                                        className="h-8 text-right font-medium text-teal-700 bg-teal-50 border-teal-200"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => removeCartItem(index)} className="text-slate-400 hover:text-red-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>

                            <div className="flex justify-end mt-6 pt-4 border-t">
                                <Button
                                    onClick={handleSubmit}
                                    disabled={loading || cart.length === 0}
                                    className="bg-teal-600 hover:bg-teal-700 text-white min-w-[150px]"
                                >
                                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    <Save className="h-4 w-4 mr-2" />
                                    Submit Return
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    )
}
