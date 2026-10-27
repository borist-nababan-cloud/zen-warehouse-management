import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthUser } from '@/hooks/useAuth'
import { useProductsPaginated } from '@/hooks/useMasterBarang'
import { createRecipe, getRecipeById, updateRecipe } from '@/services/recipeService'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Trash2, Plus, ArrowLeft, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface IngredientRow {
    tempId: number
    materialId: string
    qty: number
    uom: string
}

export function RecipeFormPage() {
    const navigate = useNavigate()
    const { id } = useParams() // Get ID for edit mode
    const { user } = useAuthUser()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoadingData, setIsLoadingData] = useState(false)

    // Form State
    const [targetProductId, setTargetProductId] = useState<string>('')
    const [standardOutput, setStandardOutput] = useState<number>(1)
    const [description, setDescription] = useState('')
    const [ingredients, setIngredients] = useState<IngredientRow[]>([])

    // Data Fetching
    const { data: productsData } = useProductsPaginated(0, 200, false, user?.kode_outlet || undefined)
    const allProducts = productsData?.data || []

    // Fetch existing recipe if editing
    useEffect(() => {
        if (id) {
            loadRecipe(id)
        }
    }, [id])

    async function loadRecipe(recipeId: string) {
        setIsLoadingData(true)
        const res = await getRecipeById(recipeId)
        if (res.isSuccess && res.data) {
            const r = res.data
            setTargetProductId(r.barang_id.toString())
            setStandardOutput(r.standard_qty_output)
            setDescription(r.description || '')

            // Map items
            if (r.items) {
                const mappedItems = r.items.map(item => ({
                    tempId: Date.now() + Math.random(), // Unique temp ID
                    materialId: item.material_barang_id.toString(),
                    qty: item.qty_required,
                    uom: item.uom_usage
                }))
                setIngredients(mappedItems)
            }
        } else {
            toast.error("Gagal memuat detail resep")
            navigate('/production/recipes')
        }
        setIsLoadingData(false)
    }

    const handleAddIngredient = () => {
        setIngredients([
            ...ingredients,
            { tempId: Date.now(), materialId: '', qty: 0, uom: 'PCS' } // Default UOM
        ])
    }

    const handleRemoveIngredient = (tempId: number) => {
        setIngredients(ingredients.filter(i => i.tempId !== tempId))
    }

    const getProductUom = (product?: typeof allProducts[0]) => {
        if (!product || !product.barang_units || product.barang_units.length === 0) return 'PCS'
        const unit = product.barang_units.find(u => u.kode_outlet === (user?.kode_outlet || '111'))
            || product.barang_units.find(u => u.kode_outlet === product.kode_outlet)
            || product.barang_units[0]
        return unit?.purchase_uom || unit?.base_uom || 'PCS'
    }

    const updateIngredient = (tempId: number, field: keyof IngredientRow, value: any) => {
        // Prevent duplicate material selection
        if (field === 'materialId') {
            const exists = ingredients.some(i => i.materialId === value && i.tempId !== tempId)
            if (exists) {
                toast.error("Bahan baku ini sudah ada dalam daftar.")
                return
            }
        }

        setIngredients(ingredients.map(row => {
            if (row.tempId === tempId) {
                const updated = { ...row, [field]: value }
                // Auto-update UOM if material changes
                if (field === 'materialId') {
                    const product = allProducts.find(p => p.id.toString() === value)
                    updated.uom = getProductUom(product)
                }
                return updated
            }
            return row
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!targetProductId || !standardOutput || ingredients.length === 0) {
            toast.error("Mohon lengkapi semua kolom wajib dan tambahkan minimal satu bahan baku.")
            return
        }

        // Validate rows
        for (const row of ingredients) {
            if (!row.materialId || row.qty <= 0) {
                toast.error("Data bahan baku tidak valid. Periksa pilihan bahan dan jumlah yang dibutuhkan.")
                return
            }
        }

        setIsSubmitting(true)
        try {
            let result

            // Determine accurate outlet from target product or logged in user
            const targetProduct = allProducts.find(p => p.id.toString() === targetProductId)
            const targetOutlet = targetProduct?.kode_outlet || user?.kode_outlet || '111'

            const payload = {
                barang_id: parseInt(targetProductId),
                kode_outlet: targetOutlet,
                description,
                standard_qty_output: standardOutput,
                items: ingredients.map(i => ({
                    material_barang_id: parseInt(i.materialId),
                    qty_required: i.qty,
                    uom_usage: i.uom
                }))
            }

            if (id) {
                // UPDATE
                result = await updateRecipe({ ...payload, id })
            } else {
                // CREATE
                result = await createRecipe(payload)
            }

            if (result.isSuccess) {
                toast.success(id ? "Resep berhasil diperbarui!" : "Resep berhasil dibuat!")
                navigate('/production/recipes')
            } else {
                toast.error(result.error || "Operasi gagal")
            }
        } catch (error: any) {
            console.error(error)
            toast.error(error?.message || "Terjadi kesalahan yang tidak terduga.")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoadingData) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-4xl mx-auto pb-10">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/production/recipes')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{id ? 'Ubah Resep' : 'Tambah Resep Baru'}</h1>
                        <p className="text-muted-foreground text-sm">
                            {id ? 'Perbarui formulasi dan komposisi resep' : 'Tentukan formula dan bahan baku untuk menghasilkan produk barang jadi.'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Header Card */}
                    <Card className="border shadow-sm">
                        <CardHeader className="bg-muted/40 pb-4">
                            <CardTitle className="text-lg">Informasi Resep</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Produk Target (Barang Jadi)</Label>
                                    <SearchableSelect
                                        value={targetProductId}
                                        onChange={setTargetProductId}
                                        placeholder="Pilih Produk..."
                                        options={allProducts.map(p => ({
                                            value: p.id.toString(),
                                            label: p.name || 'Unknown',
                                            subLabel: p.sku || ''
                                        }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Jumlah Output Standar</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={standardOutput}
                                            onChange={(e) => setStandardOutput(parseFloat(e.target.value) || 0)}
                                            className="font-mono"
                                        />
                                        <span className="text-sm font-medium text-muted-foreground w-20 truncate">
                                            {(() => {
                                                if (!targetProductId) return 'Satuan'
                                                const p = allProducts.find(x => x.id.toString() === targetProductId)
                                                return getProductUom(p)
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Deskripsi / Catatan</Label>
                                <Input
                                    placeholder="Contoh: Batch standar untuk produksi harian"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ingredients Card */}
                    <Card className="border shadow-sm">
                        <CardHeader className="bg-muted/40 pb-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Daftar Bahan Baku</CardTitle>
                            <Button type="button" size="sm" onClick={handleAddIngredient} variant="secondary">
                                <Plus className="h-4 w-4 mr-1" /> Tambah Bahan
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Bahan Baku</TableHead>
                                        <TableHead className="w-[20%]">Jumlah Dibutuhkan</TableHead>
                                        <TableHead className="w-[20%]">Satuan</TableHead>
                                        <TableHead className="w-[10%]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ingredients.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                Belum ada bahan baku yang ditambahkan.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        ingredients.map((row) => (
                                            <TableRow key={row.tempId}>
                                                <TableCell>
                                                    <SearchableSelect
                                                        value={row.materialId}
                                                        onChange={(val) => updateIngredient(row.tempId, 'materialId', val)}
                                                        placeholder="Pilih Bahan Baku..."
                                                        options={allProducts.map(p => ({
                                                            value: p.id.toString(),
                                                            label: p.name || 'Unknown',
                                                            subLabel: p.sku || ''
                                                        }))}
                                                        className="w-full"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0.0001"
                                                        step="any"
                                                        className="h-9 font-mono text-right"
                                                        value={row.qty}
                                                        onChange={(e) => updateIngredient(row.tempId, 'qty', parseFloat(e.target.value) || 0)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={row.uom}
                                                        readOnly
                                                        className="h-9 bg-muted text-muted-foreground"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveIngredient(row.tempId)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end pt-4">
                        <Button
                            type="submit"
                            size="lg"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[150px]"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {id ? 'Perbarui Resep' : 'Simpan Resep'}
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    )
}
