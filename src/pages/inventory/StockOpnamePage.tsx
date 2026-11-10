import { useState, useEffect, useMemo } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { useProductsByOutlet } from '@/hooks/useMasterBarang'
import { getInventoryBalanceForOpname, createStockOpname } from '@/services/inventoryService'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Loader2, FileCheck, Send } from 'lucide-react'
import { toast } from 'sonner'
import { InventoryBalance } from '@/types/database'

export function StockOpnamePage() {
    const { user } = useAuthUser()
    const [activeTab, setActiveTab] = useState('batch')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [inventory, setInventory] = useState<InventoryBalance[]>([])

    // Load master products for selection (includes user's outlet, Zen Produk 901, and STO items)
    const { data: productsData } = useProductsByOutlet(user?.kode_outlet || '901')
    const allProducts = productsData?.data || []

    // Build consolidated list for spot check (inventory balance + master products)
    const spotProductList = useMemo(() => {
        const map = new Map<number, {
            id: number
            name: string
            sku: string
            typeName: string
            systemQty: number
        }>()

        // 1. Add all items physically in inventory balance (guarantees STO-received items are present)
        inventory.forEach(inv => {
            if (inv.barang_id) {
                map.set(inv.barang_id, {
                    id: inv.barang_id,
                    name: inv.master_barang?.name || 'Produk Tanpa Nama',
                    sku: inv.master_barang?.sku || '-',
                    typeName: (inv.master_barang as any)?.master_type?.nama_type || '',
                    systemQty: inv.qty_on_hand ?? 0
                })
            }
        })

        // 2. Add master products for this outlet / Zen Produk
        allProducts.forEach(prod => {
            if (!map.has(prod.id)) {
                map.set(prod.id, {
                    id: prod.id,
                    name: prod.name || 'Produk Tanpa Nama',
                    sku: prod.sku || '-',
                    typeName: (prod.master_type as any)?.nama_type || '',
                    systemQty: 0
                })
            }
        })

        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
    }, [inventory, allProducts])

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

            if (field === 'outOfStock' && value === true) {
                newItem.actual = '0'
            }

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
                }

                return {
                    barang_id: model.barang_id,
                    system_qty: model.qty_on_hand,
                    actual_qty: actualQty,
                    notes: input?.notes
                }
            })

            const res = await createStockOpname({
                kode_outlet: user?.kode_outlet || '',
                items: itemsToSubmit,
                notes: 'Batch Opname via Web'
            })

            if (res.isSuccess) {
                toast.success("Pengajuan Batch Opname berhasil disimpan! Menunggu persetujuan Manager / Finance.")
                setOpnameRows({})
            } else {
                toast.error(res.error || "Gagal menyimpan pengajuan stock opname")
            }
        } catch (e: any) {
            console.error(e)
            toast.error(e?.message || "Terjadi kesalahan")
        } finally {
            setIsSubmitting(false)
        }
    }

    // ========================
    // SPOT CHECK OPERATION
    // ========================

    const handleSpotSubmit = async () => {
        if (!spotItemId) {
            toast.error("Silakan pilih produk terlebih dahulu")
            return
        }

        setIsSubmitting(true)
        try {
            const selectedProduct = spotProductList.find(p => p.id.toString() === spotItemId)
            const currentSystemQty = selectedProduct ? selectedProduct.systemQty : 0

            // Determine actual quantity
            let finalActual = currentSystemQty
            if (spotOutOfStock) {
                finalActual = 0
            } else if (spotActual !== '') {
                finalActual = parseFloat(spotActual)
            }

            const res = await createStockOpname({
                kode_outlet: user?.kode_outlet || '',
                items: [{
                    barang_id: parseInt(spotItemId),
                    system_qty: currentSystemQty,
                    actual_qty: finalActual,
                    notes: spotNotes
                }],
                notes: 'Pemeriksaan Satuan (Spot Check)'
            })

            if (res.isSuccess) {
                toast.success(`Pengajuan pemeriksaan stok untuk ${selectedProduct?.name || 'produk'} berhasil disimpan! Menunggu persetujuan Manager / Finance.`)
                // Reset spot form
                setSpotItemId('')
                setSpotActual('')
                setSpotOutOfStock(false)
                setSpotNotes('')
            } else {
                toast.error(res.error || "Gagal menyimpan pengajuan pemeriksaan stok")
            }

        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Find selected product from consolidated spot list
    const selectedProduct = spotProductList.find(p => p.id.toString() === spotItemId)
    const currentSystemQty = selectedProduct ? selectedProduct.systemQty : 0

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-20">
                <div className="flex items-center gap-3 text-primary">
                    <FileCheck className="h-8 w-8" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Stock Opname</h1>
                        <p className="text-muted-foreground text-sm">Penyesuaian jumlah stok fisik dengan catatan sistem inventaris.</p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="batch">Opname Massal (Batch)</TabsTrigger>
                        <TabsTrigger value="spot">Pemeriksaan Satuan</TabsTrigger>
                    </TabsList>

                    {/* BATCH MODE */}
                    <TabsContent value="batch" className="mt-6">
                        <Card className="border shadow-sm">
                            <CardHeader className="bg-muted/40 pb-4">
                                <CardTitle className="text-lg">Opname Stok Keseluruhan</CardTitle>
                                <CardDescription>
                                    Verifikasi seluruh barang inventaris. Biarkan kolom "Jumlah Fisik" kosong jika sesuai stok sistem. Klik "Kirim Pengajuan Batch" untuk menyimpan batch tanpa langsung mengubah stok sampai disetujui Manager/Finance.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {isLoading ? (
                                    <div className="h-64 flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <div className="relative overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead className="w-[100px]">SKU</TableHead>
                                                    <TableHead className="w-[300px]">Nama Produk</TableHead>
                                                    <TableHead className="w-[120px] text-right">Stok Sistem</TableHead>
                                                    <TableHead className="w-[150px]">Jumlah Fisik</TableHead>
                                                    <TableHead className="w-[80px] text-center">Habis?</TableHead>
                                                    <TableHead className="w-[200px]">Catatan</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {inventory.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                            Belum ada data inventaris untuk gerai ini.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    inventory.map((item) => {
                                                        const row = opnameRows[item.barang_id] || { actual: '', outOfStock: false, notes: '' }
                                                        const systemQty = item.qty_on_hand

                                                        // Calculate difference for visual feedback
                                                        let diff = 0
                                                        if (row.outOfStock) diff = 0 - systemQty
                                                        else if (row.actual !== '') diff = parseFloat(row.actual) - systemQty

                                                        return (
                                                            <TableRow key={item.barang_id} className={cn(diff !== 0 && "bg-amber-50/50")}>
                                                                <TableCell className="font-mono text-xs">{item.master_barang?.sku || '-'}</TableCell>
                                                                <TableCell className="font-medium">
                                                                    {item.master_barang?.name}
                                                                    <div className="text-xs text-muted-foreground">{(item.master_barang as any)?.master_type?.nama_type}</div>
                                                                </TableCell>
                                                                <TableCell className="text-right font-mono font-medium">{systemQty}</TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        type="number"
                                                                        className="h-8 w-full text-right font-bold font-mono"
                                                                        placeholder={systemQty.toString()}
                                                                        value={row.actual}
                                                                        onChange={(e) => handleBatchChange(item.barang_id, 'actual', e.target.value)}
                                                                        disabled={row.outOfStock}
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
                                                                        placeholder="Keterangan selisih..."
                                                                        value={row.notes}
                                                                        onChange={(e) => handleBatchChange(item.barang_id, 'notes', e.target.value)}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                <div className="p-4 border-t bg-muted/20 flex justify-end sticky bottom-0 z-10">
                                    <Button
                                        size="lg"
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[200px]"
                                        onClick={handleBatchSubmit}
                                        disabled={isSubmitting || isLoading || inventory.length === 0}
                                    >
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Kirim Pengajuan Batch Opname
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* SPOT MODE */}
                    <TabsContent value="spot" className="mt-6">
                        <Card className="max-w-xl mx-auto border shadow-sm">
                            <CardHeader className="bg-muted/40 pb-4">
                                <CardTitle className="text-lg">Pemeriksaan Satuan Produk</CardTitle>
                                <CardDescription>
                                    Pilih produk untuk mengajukan penyesuaian stok satuan. Saldo inventaris akan diperbarui setelah pengajuan disetujui oleh Manager/Finance.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="space-y-2">
                                    <Label>Pilih Produk</Label>
                                    <SearchableSelect
                                        value={spotItemId}
                                        onChange={setSpotItemId}
                                        placeholder="Cari atau pilih nama / SKU produk..."
                                        options={spotProductList.map(p => ({
                                            value: p.id.toString(),
                                            label: p.name || 'Produk Tanpa Nama',
                                            subLabel: `${p.sku || '-'} • ${p.typeName ? p.typeName + ' • ' : ''}Stok: ${p.systemQty}`
                                        }))}
                                        className="w-full"
                                    />
                                </div>

                                {selectedProduct && (
                                    <div className="p-4 bg-muted/50 rounded-lg space-y-4 border">
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <div>
                                                <div className="font-semibold text-foreground">{selectedProduct.name}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{selectedProduct.sku}</div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs text-muted-foreground block">Stok Sistem Saat Ini</span>
                                                <span className="text-xl font-mono font-bold text-primary">{currentSystemQty}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Jumlah Fisik Sebenarnya</Label>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id="spot-oos"
                                                        checked={spotOutOfStock}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpotOutOfStock(e.target.checked)}
                                                    />
                                                    <Label htmlFor="spot-oos" className="cursor-pointer text-sm font-normal">Tandai Habis (0)</Label>
                                                </div>
                                            </div>

                                            <Input
                                                type="number"
                                                className="text-lg h-12 font-bold font-mono text-center"
                                                placeholder={currentSystemQty.toString()}
                                                value={spotOutOfStock ? '0' : spotActual}
                                                onChange={e => setSpotActual(e.target.value)}
                                                disabled={spotOutOfStock}
                                                autoFocus
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Catatan / Keterangan</Label>
                                            <Input
                                                value={spotNotes}
                                                onChange={e => setSpotNotes(e.target.value)}
                                                placeholder="Contoh: Selisih pemakaian harian atau barang rusak..."
                                            />
                                        </div>
                                    </div>
                                )}

                                <Button
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                    onClick={handleSpotSubmit}
                                    disabled={!spotItemId || isSubmitting}
                                >
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    Kirim Pengajuan Pemeriksaan
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    )
}

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ')
}
