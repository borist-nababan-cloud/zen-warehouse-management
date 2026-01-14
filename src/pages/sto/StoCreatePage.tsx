import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Truck, Package } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient, useMutation } from '@tanstack/react-query'

import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

import { useAuthUser } from '@/hooks/useAuth'
import { useMasterOutlet } from '@/hooks/useMasterOutlet'
import { useProductsByOutlet } from '@/hooks/useMasterBarang'
import { stoService } from '@/services/stoService'

// Helper for formatting IDR
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

interface StoItemRow {
    barang_id: number
    sku: string
    name: string
    price_unit: number
    qty_requested: number
    uom: string
}

export default function StoCreatePage() {
    const navigate = useNavigate()
    const { user, isLoading: isAuthLoading } = useAuthUser()
    const queryClient = useQueryClient()

    console.log('StoCreatePage render:', { user, isAuthLoading })

    // State
    const [toOutlet, setToOutlet] = useState<string>('')
    const [shippingCost, setShippingCost] = useState<number>(0)

    // Item Entry State
    const [selectedProductId, setSelectedProductId] = useState<string>('')
    const [qtyInput, setQtyInput] = useState<number>(0)

    // Items List
    const [items, setItems] = useState<StoItemRow[]>([])

    // Data Fetching
    const { data: outlets } = useMasterOutlet(true)
    // Fetch products from the SENDER outlet (current user)
    const { data: products } = useProductsByOutlet(user?.kode_outlet || '')

    // Computed
    const subtotal = items.reduce((sum, item) => sum + (item.price_unit * item.qty_requested), 0)
    const grandTotal = subtotal + shippingCost

    // Mutations
    const createStoMutation = useMutation({
        mutationFn: stoService.createSto.bind(stoService),
        onSuccess: () => {
            toast.success('STO Created Successfully')
            queryClient.invalidateQueries({ queryKey: ['sto_orders'] })
            navigate('/sto')
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to create STO')
        }
    })

    const isSubmitting = createStoMutation.isPending

    // Handlers
    const handleAddItem = () => {
        if (!selectedProductId || qtyInput <= 0) return

        const product = products?.data?.find(p => p.id.toString() === selectedProductId)
        if (!product) return

        // Check if item already exists
        const existingIndex = items.findIndex(i => i.barang_id === product.id)
        if (existingIndex >= 0) {
            // Update qty
            const newItems = [...items]
            newItems[existingIndex].qty_requested += qtyInput
            setItems(newItems)
        } else {
            // Add new
            setItems(prev => [...prev, {
                barang_id: product.id,
                sku: product.sku || '',
                name: product.name || 'Unknown',
                price_unit: product.barang_prices?.[0]?.sell_price || 0,
                qty_requested: qtyInput,
                uom: product.barang_units?.[0]?.purchase_uom || 'PCS'
            }])
        }

        // Reset inputs
        setSelectedProductId('')
        setQtyInput(0)
    }

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = () => {
        if (!user || !user.kode_outlet) {
            toast.error('User outlet not defined')
            return
        }
        if (!toOutlet) {
            toast.error('Please select destination outlet')
            return
        }
        if (items.length === 0) {
            toast.error('Please add at least one item')
            return
        }

        createStoMutation.mutate({
            from_outlet: user.kode_outlet,
            to_outlet: toOutlet,
            shipping_cost: shippingCost,
            items: items.map(item => ({
                barang_id: item.barang_id,
                qty_requested: item.qty_requested,
                price_unit: item.price_unit
            })),
            created_by: user.id
        })
    }

    if (isAuthLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <p>Loading user data...</p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6 max-w-5xl mx-auto pb-20">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/sto')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create Stock Transfer</h1>
                        <p className="text-muted-foreground">Request inventory shipment to another outlet</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* LEFT COLUMN - FORM */}
                    <div className="md:col-span-2 space-y-6">

                        {/* 1. ALLOCATION */}
                        <Card className="border-t-4 border-t-purple-500 shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <Truck className="h-5 w-5 text-purple-600" />
                                    <CardTitle className="text-base">Allocation Details</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>From Outlet (Sender)</Label>
                                        <Input value={user?.outlet?.name_outlet || user?.kode_outlet || '-'} disabled className="bg-muted" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>To Outlet (Recipient)</Label>
                                        <Select value={toOutlet} onValueChange={setToOutlet}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Outlet" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {outlets?.filter(o => o.kode_outlet !== user?.kode_outlet).map(outlet => (
                                                    <SelectItem key={outlet.kode_outlet} value={outlet.kode_outlet}>
                                                        {outlet.name_outlet}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Estimated Shipping Cost (IDR)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={shippingCost}
                                        onChange={(e) => setShippingCost(Number(e.target.value))}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. ITEMS */}
                        <Card className="border-t-4 border-t-blue-500 shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-blue-600" />
                                        <CardTitle className="text-base">Items to Ship</CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Add Item Row */}
                                <div className="flex items-end gap-3 p-3 bg-slate-50 rounded-lg border">
                                    <div className="flex-1 space-y-2">
                                        <Label>Product</Label>
                                        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Product..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products?.data?.map(p => (
                                                    <SelectItem key={p.id} value={p.id.toString()}>
                                                        {p.sku || 'No SKU'} - {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-24 space-y-2">
                                        <Label>Qty</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={qtyInput}
                                            onChange={(e) => setQtyInput(Number(e.target.value))}
                                        />
                                    </div>
                                    <Button onClick={handleAddItem} size="icon" className="shrink-0 bg-blue-600 hover:bg-blue-700">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Items Table */}
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50">
                                                <TableHead>SKU</TableHead>
                                                <TableHead>Product</TableHead>
                                                <TableHead className="text-right">Price</TableHead>
                                                <TableHead className="text-right">Qty</TableHead>
                                                <TableHead className="text-center">Unit</TableHead>
                                                <TableHead className="text-right">Subtotal</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                                        No items added yet.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                items.map((item, index) => (
                                                    <TableRow key={`${item.barang_id}-${index}`}>
                                                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                                        <TableCell className="font-medium">{item.name}</TableCell>
                                                        <TableCell className="text-right">{formatCurrency(item.price_unit)}</TableCell>
                                                        <TableCell className="text-right">{item.qty_requested}</TableCell>
                                                        <TableCell className="text-center text-muted-foreground font-mono text-xs">{item.uom}</TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {formatCurrency(item.price_unit * item.qty_requested)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                onClick={() => handleRemoveItem(index)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                    </div>

                    {/* RIGHT COLUMN - SUMMARY */}
                    <div className="space-y-6">
                        <Card className="shadow-sm sticky top-6">
                            <CardHeader className="bg-slate-50 border-b pb-4">
                                <CardTitle className="text-lg">Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Items Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Shipping Cost</span>
                                    <span>{formatCurrency(shippingCost)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-lg">Total</span>
                                    <span className="font-bold text-xl text-blue-600">{formatCurrency(grandTotal)}</span>
                                </div>

                                <Button
                                    className="w-full mt-6 bg-slate-900 hover:bg-slate-800"
                                    size="lg"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || items.length === 0}
                                >
                                    {isSubmitting ? 'Creating Order...' : 'Create STO'}
                                </Button>

                                <p className="text-xs text-center text-muted-foreground mt-2">
                                    Order will be saved as DRAFT and must be shipped by Warehouse.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
