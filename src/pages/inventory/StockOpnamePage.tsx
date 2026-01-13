
import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { getInventoryBalanceForOpname, createStockOpname } from '@/services/inventoryService'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Loader2, Save, FileCheck } from 'lucide-react'
import { toast } from 'sonner'
import { InventoryBalance } from '@/types/database'

export function StockOpnamePage() {
    const { user } = useAuthUser()
    const [activeTab, setActiveTab] = useState('batch')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [inventory, setInventory] = useState<InventoryBalance[]>([])

    // Batch Mode State
    const [opnameRows, setOpnameRows] = useState<{ [key: number]: { actual: string, outOfStock: boolean, notes: string } }>({})

    // Spot Mode State
    const [spotItemId, setSpotItemId] = useState<string>('')
    const [spotActual, setSpotActual] = useState<string>('')
    const [spotOutOfStock, setSpotOutOfStock] = useState(false)
    const [spotNotes, setSpotNotes] = useState('')

    useEffect(() => {
        if (user?.kode_outlet) {
            loadInventory(user.kode_outlet)
        }
    }, [user?.kode_outlet])

    async function loadInventory(outletId: string) {
        setIsLoading(true)
        const res = await getInventoryBalanceForOpname(outletId)
        if (res.isSuccess && res.data) {
            setInventory(res.data)
        }
        setIsLoading(false)
    }

    // ========================
    // BATCH OPERATION
    // ========================

    const handleBatchChange = (barangId: number, field: 'actual' | 'outOfStock' | 'notes', value: any) => {
        setOpnameRows(prev => {
            const current = prev[barangId] || { actual: '', outOfStock: false, notes: '' }

            let newItem = { ...current, [field]: value }

            // Logic: If Out of Stock checked, actual must be 0 (visually) or handled at submission
            if (field === 'outOfStock' && value === true) {
                newItem.actual = '0'
            }
            // Logic: If user types in actual, uncheck outOfStock if it was checked? Optional UX.
            // Keeping it simple: Checkbox overrides input.

            return { ...prev, [barangId]: newItem }
        })
    }

    const handleBatchSubmit = async () => {
        setIsSubmitting(true)
        try {
            const itemsToSubmit = inventory.map(model => {
                const input = opnameRows[model.barang_id]

                let actualQty = model.qty_on_hand // Default to System Qty (No Change)

                if (input) {
                    if (input.outOfStock) {
                        actualQty = 0
                    } else if (input.actual !== '' && input.actual !== null) {
                        actualQty = parseFloat(input.actual)
                    }
                    // If input.actual is empty/null AND !outOfStock -> Remains System Qty
                }

                return {
                    barang_id: model.barang_id,
                    system_qty: model.qty_on_hand,
                    actual_qty: actualQty,
                    notes: input?.notes
                }
            })

            const res = await createStockOpname({
                kode_outlet: user?.kode_outlet || '111',
                items: itemsToSubmit,
                notes: 'Batch Opname via Web'
            })

            if (res.isSuccess) {
                toast.success("Stock Opname finalized successfully!")
                // Refresh inventory to reflect changes
                if (user?.kode_outlet) loadInventory(user.kode_outlet)
                setOpnameRows({})
            } else {
                toast.error(res.error || "Failed to submit opname")
            }
        } catch (e) {
            console.error(e)
            toast.error("An error occurred")
        } finally {
            setIsSubmitting(false)
        }
    }

    // ========================
    // SPOT CHECK OPERATION
    // ========================

    const handleSpotSubmit = async () => {
        if (!spotItemId) {
            toast.error("Please select an item")
            return
        }

        setIsSubmitting(true)
        try {
            const itemModel = inventory.find(i => i.barang_id.toString() === spotItemId)
            if (!itemModel) throw new Error("Item not found")

            // Determine actual quantity
            let finalActual = itemModel.qty_on_hand
            if (spotOutOfStock) {
                finalActual = 0
            } else if (spotActual !== '') {
                finalActual = parseFloat(spotActual)
            }

            const res = await createStockOpname({
                kode_outlet: user?.kode_outlet || '111',
                items: [{
                    barang_id: itemModel.barang_id,
                    system_qty: itemModel.qty_on_hand,
                    actual_qty: finalActual,
                    notes: spotNotes
                }],
                notes: 'Spot Check via Web'
            })

            if (res.isSuccess) {
                toast.success(`Spot check for ${itemModel.master_barang?.name} saved!`)
                if (user?.kode_outlet) loadInventory(user.kode_outlet)
                // Reset spot form
                setSpotItemId('')
                setSpotActual('')
                setSpotOutOfStock(false)
                setSpotNotes('')
            } else {
                toast.error(res.error || "Failed to submit spot check")
            }

        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const selectedSpotItem = inventory.find(i => i.barang_id.toString() === spotItemId)

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-20">
                <div className="flex items-center gap-3 text-blue-700">
                    <FileCheck className="h-8 w-8" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Stock Opname</h1>
                        <p className="text-muted-foreground text-sm">Adjust inventory counts to match physical stock.</p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="batch">Batch Opname</TabsTrigger>
                        <TabsTrigger value="spot">Single Item Check</TabsTrigger>
                    </TabsList>

                    {/* BATCH MODE */}
                    <TabsContent value="batch" className="mt-6">
                        <Card className="border-blue-100 shadow-md">
                            <CardHeader className="bg-blue-50/30 pb-4">
                                <CardTitle className="text-lg">Full Stock Take</CardTitle>
                                <CardDescription>
                                    Verify all items. Leave "Actual Qty" blank to accept System Qty. Check "Out of Stock" for 0 counts.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {isLoading ? (
                                    <div className="h-64 flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                    </div>
                                ) : (
                                    <div className="relative overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead className="w-[100px]">SKU</TableHead>
                                                    <TableHead className="w-[300px]">Product Name</TableHead>
                                                    <TableHead className="w-[120px] text-right">System Qty</TableHead>
                                                    <TableHead className="w-[150px]">Physical Count</TableHead>
                                                    <TableHead className="w-[80px]">Empty?</TableHead>
                                                    <TableHead className="w-[200px]">Notes</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {inventory.map((item) => {
                                                    const row = opnameRows[item.barang_id] || { actual: '', outOfStock: false, notes: '' }
                                                    const systemQty = item.qty_on_hand

                                                    // Calculate difference for visual feedback
                                                    let diff = 0
                                                    if (row.outOfStock) diff = 0 - systemQty
                                                    else if (row.actual !== '') diff = parseFloat(row.actual) - systemQty

                                                    return (
                                                        <TableRow key={item.barang_id} className={cn(diff !== 0 && "bg-blue-50/30")}>
                                                            <TableCell className="font-mono text-xs">{item.master_barang?.sku || '-'}</TableCell>
                                                            <TableCell className="font-medium">
                                                                {item.master_barang?.name}
                                                                <div className="text-xs text-muted-foreground">{(item.master_barang as any)?.master_type?.nama_type}</div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono">{systemQty}</TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    className="h-8 w-full text-right font-bold"
                                                                    placeholder={systemQty.toString()}
                                                                    value={row.actual}
                                                                    onChange={(e) => handleBatchChange(item.barang_id, 'actual', e.target.value)}
                                                                    disabled={row.outOfStock}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            // Rough logic to focus next input could go here, 
                                                                            // but standard Tab works well.
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Checkbox
                                                                    checked={row.outOfStock}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleBatchChange(item.barang_id, 'outOfStock', e.target.checked)}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    className="h-8 text-xs"
                                                                    placeholder="Reason..."
                                                                    value={row.notes}
                                                                    onChange={(e) => handleBatchChange(item.barang_id, 'notes', e.target.value)}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                <div className="p-4 border-t bg-muted/20 flex justify-end sticky bottom-0 z-10">
                                    <Button
                                        size="lg"
                                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]"
                                        onClick={handleBatchSubmit}
                                        disabled={isSubmitting || isLoading}
                                    >
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Finalize Batch Opname
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* SPOT MODE */}
                    <TabsContent value="spot" className="mt-6">
                        <Card className="max-w-xl mx-auto border-blue-100 shadow-md">
                            <CardHeader className="bg-blue-50/10">
                                <CardTitle>Single Item Check</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="space-y-2">
                                    <Label>Select Item</Label>
                                    <Select value={spotItemId} onValueChange={setSpotItemId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Search product..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {inventory.map(item => (
                                                <SelectItem key={item.barang_id} value={item.barang_id.toString()}>
                                                    {item.master_barang?.name} ({item.master_barang?.sku})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedSpotItem && (
                                    <div className="p-4 bg-muted rounded-lg space-y-4">
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <span className="text-sm font-medium">System Quantity</span>
                                            <span className="text-xl font-mono font-bold">{selectedSpotItem.qty_on_hand}</span>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Physical Count</Label>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id="spot-oos"
                                                        checked={spotOutOfStock}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpotOutOfStock(e.target.checked)}
                                                    />
                                                    <Label htmlFor="spot-oos" className="cursor-pointer text-sm font-normal">Mark as Empty (0)</Label>
                                                </div>
                                            </div>

                                            <Input
                                                type="number"
                                                className="text-lg h-12 font-bold text-center"
                                                placeholder={selectedSpotItem.qty_on_hand.toString()}
                                                value={spotOutOfStock ? '0' : spotActual}
                                                onChange={e => setSpotActual(e.target.value)}
                                                disabled={spotOutOfStock}
                                                autoFocus
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Notes</Label>
                                            <Input
                                                value={spotNotes}
                                                onChange={e => setSpotNotes(e.target.value)}
                                                placeholder="Discrepancy reason..."
                                            />
                                        </div>
                                    </div>
                                )}

                                <Button
                                    className="w-full"
                                    onClick={handleSpotSubmit}
                                    disabled={!spotItemId || isSubmitting}
                                >
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Update Stock
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    )
}

// Helper for conditional classes
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ')
}
