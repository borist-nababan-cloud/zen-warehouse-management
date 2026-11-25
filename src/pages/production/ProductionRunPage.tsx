import { useState, useEffect, useMemo } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import {
    createProductionRun,
    getRecipeByProduct,
    getIngredientsWithCost,
    getDraftStoOrdersForProduction,
    DraftStoOrderOption,
} from '@/services/productionService'
import { getRecipes, Recipe } from '@/services/recipeService'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Calendar as CalendarIcon, Save, Loader2, Info, Factory, Layers, Truck, X } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface ProductionItem {
    barang_id: number
    qty: number
    cost: number
    uom: string
    material_name: string
    material_sku: string
    standard_qty: number // Base qty per standard output
}

export function ProductionRunPage() {
    const { user } = useAuthUser()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoadingRecipe, setIsLoadingRecipe] = useState(false)

    // Form State
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [selectedProductId, setSelectedProductId] = useState<string>('')
    const [actualOutput, setActualOutput] = useState<number>(0)
    const [standardOutputBase, setStandardOutputBase] = useState<number>(1)
    const [selectedStoId, setSelectedStoId] = useState<string>('')

    const [ingredients, setIngredients] = useState<ProductionItem[]>([])

    // Data Fetching: load recipes & DRAFT STO orders for user's own outlet only
    const outletCode = user?.kode_outlet || '901'
    const [recipes, setRecipes] = useState<Recipe[]>([])
    const [isLoadingRecipes, setIsLoadingRecipes] = useState(false)
    const [draftStos, setDraftStos] = useState<DraftStoOrderOption[]>([])
    const [isLoadingStos, setIsLoadingStos] = useState(false)

    useEffect(() => {
        if (outletCode) {
            loadRecipesForOutlet(outletCode)
            loadDraftStosForOutlet(outletCode)
        }
    }, [outletCode])

    async function loadRecipesForOutlet(code: string) {
        setIsLoadingRecipes(true)
        const res = await getRecipes(code)
        if (res.data) {
            setRecipes(res.data)
        }
        setIsLoadingRecipes(false)
    }

    async function loadDraftStosForOutlet(code: string) {
        setIsLoadingStos(true)
        const res = await getDraftStoOrdersForProduction(code)
        if (res.isSuccess && res.data) {
            setDraftStos(res.data)
        } else if (res.error) {
            toast.error(`Gagal memuat daftar STO DRAFT: ${res.error}`)
        }
        setIsLoadingStos(false)
    }

    const selectedSto = useMemo(
        () => draftStos.find((s) => s.id === selectedStoId) || null,
        [draftStos, selectedStoId]
    )

    const stoSelectOptions = useMemo(() => {
        const formatStoDate = (iso: string) => {
            try {
                return format(new Date(iso), 'dd/MM/yyyy')
            } catch {
                return ''
            }
        }
        return [
            {
                value: '',
                label: '— Tanpa Referensi STO (Produksi Reguler) —',
                subLabel: 'Produksi untuk persediaan stok internal outlet',
            },
            ...draftStos.map((s) => ({
                value: s.id,
                label: `${s.document_number} — Tujuan: [${s.to_outlet}] ${s.to_outlet_name}`,
                subLabel: `Status: DRAFT • ${s.items.length} item • Dibuat: ${formatStoDate(s.created_at)}`,
            })),
        ]
    }, [draftStos])

    // Fetch Recipe when Product Changes
    useEffect(() => {
        if (selectedProductId && user?.kode_outlet) {
            fetchRecipe(user.kode_outlet, parseInt(selectedProductId))
        } else {
            setIngredients([])
            setStandardOutputBase(1)
        }
    }, [selectedProductId, user?.kode_outlet])

    // Auto-calculate ingredients when Actual Output changes
    useEffect(() => {
        if (actualOutput > 0 && standardOutputBase > 0 && ingredients.length > 0) {
            const ratio = actualOutput / standardOutputBase
            setIngredients(prev => prev.map(item => ({
                ...item,
                qty: parseFloat((item.standard_qty * ratio).toFixed(4))
            })))
        }
    }, [actualOutput])

    async function fetchRecipe(outletCode: string, barangId: number) {
        setIsLoadingRecipe(true)
        try {
            const recipeRes = await getRecipeByProduct(outletCode, barangId)

            if (recipeRes.data) {
                const recipe = recipeRes.data
                setStandardOutputBase(recipe.standard_qty_output)

                // Fetch costs for ingredients
                const ingredientsRes = await getIngredientsWithCost(outletCode, recipe.master_recipe_items)

                if (ingredientsRes.data) {
                    const mappedItems: ProductionItem[] = ingredientsRes.data.map((i: any) => ({
                        barang_id: i.material_barang_id,
                        qty: i.qty_required, // Initial load is standard qty
                        cost: i.cost,
                        uom: i.uom_usage,
                        material_name: i.material_name,
                        material_sku: i.material_sku,
                        standard_qty: i.qty_required
                    }))
                    setIngredients(mappedItems)

                    // If actual output is already set, recalculate
                    if (actualOutput > 0) {
                        const ratio = actualOutput / recipe.standard_qty_output
                        setIngredients(prev => prev.map(item => ({
                            ...item,
                            qty: parseFloat((item.standard_qty * ratio).toFixed(4))
                        })))
                    }
                }
            } else {
                toast.warning("Resep standar tidak ditemukan. Silakan atur terlebih dahulu di Manajemen Resep.")
                setIngredients([])
            }
        } catch (err) {
            console.error(err)
            toast.error("Gagal memuat resep produk.")
        } finally {
            setIsLoadingRecipe(false)
        }
    }

    const updateIngredientQty = (barangId: number, newQty: number) => {
        setIngredients(prev => prev.map(item =>
            item.barang_id === barangId ? { ...item, qty: isNaN(newQty) ? 0 : newQty } : item
        ))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProductId || actualOutput <= 0) {
            toast.error("Silakan pilih produk jadi dan masukkan jumlah output aktual yang valid (lebih dari 0).")
            return
        }

        setIsSubmitting(true)
        try {
            const result = await createProductionRun({
                outlet_id: user?.kode_outlet || '',
                date: date,
                fg_barang_id: parseInt(selectedProductId),
                qty_produced: actualOutput,
                ingredients: ingredients.map(i => ({
                    barang_id: i.barang_id,
                    qty: i.qty,
                    cost: i.cost
                })),
                sto_order_id: selectedSto?.id || null,
                sto_number: selectedSto?.document_number || null,
            })

            if (result.isSuccess) {
                toast.success(
                    selectedSto
                        ? `Proses produksi berhasil dicatat untuk referensi ${selectedSto.document_number}!`
                        : "Proses produksi berhasil dicatat dan diproses!"
                )
                // Reset form
                setActualOutput(0)
                setSelectedProductId('')
                setSelectedStoId('')
                setIngredients([])
                if (outletCode) {
                    loadDraftStosForOutlet(outletCode)
                }
            } else {
                toast.error(result.error || "Gagal memproses produksi.")
            }
        } catch (error) {
            console.error(error)
            toast.error("Terjadi kesalahan yang tidak terduga saat memproses produksi.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-5xl mx-auto pb-24">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Factory className="h-6 w-6 text-primary" />
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Proses Produksi</h1>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Pencatatan aktivitas produksi harian dan alokasi pemakaian bahan baku.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Top Section: Header Info */}
                    <Card className="border border-border/60 shadow-sm bg-card">
                        <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                <Info className="h-4 w-4 text-primary" />
                                Informasi Produksi
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Tanggal Produksi</Label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="pl-9 h-10 border-input bg-background focus-visible:ring-primary"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Produk (Barang Jadi)</Label>
                                <Select
                                    value={selectedProductId}
                                    onValueChange={setSelectedProductId}
                                    disabled={isLoadingRecipes || recipes.length === 0}
                                >
                                    <SelectTrigger className="h-10 border-input bg-background focus:ring-primary">
                                        <SelectValue placeholder={
                                            isLoadingRecipes
                                                ? "Memuat produk dari resep..."
                                                : recipes.length === 0
                                                    ? "Belum ada resep untuk gerai ini"
                                                    : "Pilih Produk Jadi (dari Master Resep)..."
                                        } />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {recipes.map(r => (
                                            <SelectItem key={r.barang_id} value={r.barang_id.toString()}>
                                                {r.product_name || `Barang #${r.barang_id}`} {r.product_sku ? `(${r.product_sku})` : ''} - Std: {r.standard_qty_output} {r.product_unit || 'PCS'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {recipes.length === 0 && !isLoadingRecipes && (
                                    <p className="text-[11px] text-amber-600 font-medium">
                                        Gerai ini belum memiliki resep aktif. Tambahkan resep terlebih dahulu di menu Resep.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Jumlah Output Aktual</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={actualOutput || ''}
                                        onChange={(e) => setActualOutput(parseFloat(e.target.value) || 0)}
                                        className="font-mono text-base font-semibold text-foreground border-input bg-background pr-28 h-10"
                                        placeholder="0.00"
                                    />
                                    <div className="absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none text-right truncate">
                                        {(() => {
                                            if (!selectedProductId) return `Standar: ${standardOutputBase}`
                                            const r = recipes.find(x => x.barang_id.toString() === selectedProductId)
                                            const unit = r?.product_unit || 'PCS'
                                            return unit ? `${unit} (Std: ${standardOutputBase})` : `Std: ${standardOutputBase}`
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Optional Reference STO (DRAFT) */}
                            <div className="md:col-span-3 space-y-2 pt-2 border-t border-border/50">
                                <div className="flex items-center justify-between gap-2">
                                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                        <Truck className="h-3.5 w-3.5 text-primary" />
                                        Referensi No. STO (Opsional — Status DRAFT / Belum Goods Issue)
                                    </Label>
                                    {selectedSto && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedStoId('')}
                                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-3.5 w-3.5 mr-1" />
                                            Hapus Referensi STO
                                        </Button>
                                    )}
                                </div>
                                <SearchableSelect
                                    value={selectedStoId}
                                    onChange={setSelectedStoId}
                                    options={stoSelectOptions}
                                    disabled={isLoadingStos || isSubmitting}
                                    placeholder={
                                        isLoadingStos
                                            ? "Memuat daftar STO berstatus DRAFT..."
                                            : draftStos.length === 0
                                                ? "Tidak ada STO berstatus DRAFT saat ini (Opsional)"
                                                : "Pilih No. STO (Opsional — kosongkan untuk produksi reguler)..."
                                    }
                                />

                                {/* Read-only STO Info Box when a Draft STO is selected */}
                                {selectedSto && (
                                    <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-3.5 space-y-2.5">
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                            <div className="flex items-center gap-2 font-semibold text-foreground">
                                                <Truck className="h-4 w-4 text-primary shrink-0" />
                                                <span>Info Panduan Item STO:</span>
                                                <span className="font-mono text-primary">{selectedSto.document_number}</span>
                                            </div>
                                            <span className="inline-flex items-center rounded-md bg-background/80 border border-border px-2 py-0.5 text-[11px] font-medium text-foreground">
                                                Tujuan: [{selectedSto.to_outlet}] {selectedSto.to_outlet_name}
                                            </span>
                                        </div>

                                        {selectedSto.items.length === 0 ? (
                                            <p className="text-xs text-muted-foreground italic">
                                                Belum ada daftar item pada dokumen STO ini.
                                            </p>
                                        ) : (
                                            <div className="rounded-md border border-border/60 bg-background overflow-hidden">
                                                <Table>
                                                    <TableHeader className="bg-muted/40">
                                                        <TableRow>
                                                            <TableHead className="h-8 text-[11px] font-semibold w-[22%]">SKU</TableHead>
                                                            <TableHead className="h-8 text-[11px] font-semibold">Nama Barang Diminta</TableHead>
                                                            <TableHead className="h-8 text-[11px] font-semibold text-right w-[20%]">Qty Order STO</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {selectedSto.items.map((stItem) => {
                                                            const isSelectedFg = selectedProductId === String(stItem.barang_id)
                                                            return (
                                                                <TableRow
                                                                    key={stItem.id}
                                                                    className={isSelectedFg ? 'bg-primary/10 font-semibold' : ''}
                                                                >
                                                                    <TableCell className="py-1.5 font-mono text-[11px] text-muted-foreground">
                                                                        {stItem.sku}
                                                                    </TableCell>
                                                                    <TableCell className="py-1.5 text-xs text-foreground">
                                                                        {stItem.item_name}
                                                                        {isSelectedFg && (
                                                                            <span className="ml-2 inline-flex items-center rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                                                                Produk Dipilih
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="py-1.5 text-right font-mono text-xs font-semibold text-foreground">
                                                                        {new Intl.NumberFormat('id-ID', {
                                                                            minimumFractionDigits: 0,
                                                                            maximumFractionDigits: 3,
                                                                        }).format(stItem.qty_ordered)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Middle Section: Ingredients Worksheet */}
                    <Card className="border border-border/60 shadow-sm overflow-hidden bg-card">
                        <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-primary" />
                                        Penggunaan Bahan Baku
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                        Sesuaikan kuantitas aktual bahan baku yang terpakai jika berbeda dari standar resep.
                                    </CardDescription>
                                </div>
                                {ingredients.length > 0 && (
                                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium border border-primary/20">
                                        {ingredients.length} Bahan Dimuat
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/40">
                                    <TableRow>
                                        <TableHead className="w-[35%] text-xs font-semibold">Bahan Baku</TableHead>
                                        <TableHead className="w-[15%] text-right text-xs font-semibold">Jumlah Standar</TableHead>
                                        <TableHead className="w-[20%] text-right text-xs font-semibold">Pemakaian Aktual</TableHead>
                                        <TableHead className="w-[12%] pl-4 text-xs font-semibold">Satuan</TableHead>
                                        <TableHead className="w-[18%] text-right text-xs font-semibold">Estimasi Biaya Satuan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingRecipe ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-28 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                                <span className="text-xs text-muted-foreground mt-2 block">Memuat Resep Produk...</span>
                                            </TableCell>
                                        </TableRow>
                                    ) : ingredients.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                                                Pilih produk jadi di atas untuk memuat lembar kerja bahan baku resep.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        ingredients.map((item) => (
                                            <TableRow key={item.barang_id} className="hover:bg-muted/30">
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium text-foreground">{item.material_name}</div>
                                                        <div className="text-xs text-muted-foreground">{item.material_sku}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                    {(item.standard_qty * (actualOutput / standardOutputBase)).toFixed(4)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        value={item.qty}
                                                        onChange={(e) => updateIngredientQty(item.barang_id, parseFloat(e.target.value))}
                                                        className="h-8 w-full text-right font-mono text-sm bg-background border-input focus:border-primary"
                                                    />
                                                </TableCell>
                                                <TableCell className="pl-4 text-xs font-medium text-muted-foreground">
                                                    {item.uom}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs text-foreground">
                                                    Rp {Number(item.cost || 0).toLocaleString('id-ID')}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Action Bar */}
                    <div className="flex justify-end pt-2">
                        <Button
                            type="submit"
                            size="lg"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md px-8 rounded-lg"
                            disabled={isSubmitting || ingredients.length === 0}
                        >
                            {isSubmitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Simpan & Proses Produksi
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    )
}
