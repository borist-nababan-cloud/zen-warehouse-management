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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
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
            toast.error("Failed to load recipe details")
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

    const updateIngredient = (tempId: number, field: keyof IngredientRow, value: any) => {
        // Prevent duplicate material selection
        if (field === 'materialId') {
            const exists = ingredients.some(i => i.materialId === value && i.tempId !== tempId)
            if (exists) {
                toast.error("This ingredient is already in the list.")
                return
            }
        }

        setIngredients(ingredients.map(row => {
            if (row.tempId === tempId) {
                const updated = { ...row, [field]: value }
                // Auto-update UOM if material changes
                if (field === 'materialId') {
                    const product = allProducts.find(p => p.id.toString() === value)
                    if (product) {
                        // Priority: purchase_uom in barang_units -> base_uom in barang_units -> 'PCS'
                        const unitInfo = product.barang_units?.[0]
                        updated.uom = unitInfo?.purchase_uom || unitInfo?.base_uom || 'PCS'
                    }
                }
                return updated
            }
            return row
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!targetProductId || !standardOutput || ingredients.length === 0) {
            toast.error("Please fill all required fields and add at least one ingredient.")
            return
        }

        // Validate rows
        for (const row of ingredients) {
            if (!row.materialId || row.qty <= 0) {
                toast.error("Invalid ingredient row. Check material and quantity.")
                return
            }
        }

        setIsSubmitting(true)
        try {
            let result

            const payload = {
                barang_id: parseInt(targetProductId),
                kode_outlet: user?.kode_outlet || '',
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
                toast.success(id ? "Recipe updated successfully!" : "Recipe created successfully!")
                navigate('/production/recipes')
            } else {
                toast.error(result.error || "Operation failed")
            }
        } catch (error) {
            console.error(error)
            toast.error("An unexpected error occurred.")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoadingData) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
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
                        <h1 className="text-2xl font-bold tracking-tight">{id ? 'Edit Recipe' : 'New Recipe'}</h1>
                        <p className="text-muted-foreground text-sm">
                            {id ? 'Modify existing formulation' : 'Define the formulation for a finished good.'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Header Card */}
                    <Card className="border-indigo-100 shadow-sm">
                        <CardHeader className="bg-indigo-50/30 pb-4">
                            <CardTitle className="text-lg">Header Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Target Product (Finished Good)</Label>
                                    <Select
                                        value={targetProductId}
                                        onValueChange={setTargetProductId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Product..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allProducts.map(p => (
                                                <SelectItem key={p.id} value={p.id.toString()}>
                                                    {p.name} ({p.sku})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Standard Output Qty</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={standardOutput}
                                            onChange={(e) => setStandardOutput(parseFloat(e.target.value))}
                                            className="font-mono"
                                        />
                                        <span className="text-sm font-medium text-muted-foreground w-20 truncate">
                                            {(() => {
                                                if (!targetProductId) return 'Unit(s)'
                                                const p = allProducts.find(x => x.id.toString() === targetProductId)
                                                // Check purchase_uom or base_uom
                                                return p?.barang_units?.[0]?.purchase_uom || p?.barang_units?.[0]?.base_uom || 'PCS'
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Description / Notes</Label>
                                <Input
                                    placeholder="e.g., Standard batch for daily production"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ingredients Card */}
                    <Card className="border-indigo-100 shadow-sm">
                        <CardHeader className="bg-indigo-50/30 pb-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Ingredients</CardTitle>
                            <Button type="button" size="sm" onClick={handleAddIngredient} variant="secondary">
                                <Plus className="h-4 w-4 mr-1" /> Add Ingredient
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Raw Material</TableHead>
                                        <TableHead className="w-[20%]">Qty Required</TableHead>
                                        <TableHead className="w-[20%]">Unit</TableHead>
                                        <TableHead className="w-[10%]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ingredients.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                No ingredients added yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        ingredients.map((row) => (
                                            <TableRow key={row.tempId}>
                                                <TableCell>
                                                    <Select
                                                        value={row.materialId}
                                                        onValueChange={(val) => updateIngredient(row.tempId, 'materialId', val)}
                                                    >
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select Material..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {allProducts.map(p => (
                                                                <SelectItem key={p.id} value={p.id.toString()}>
                                                                    {p.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0.0001"
                                                        step="any"
                                                        className="h-9 font-mono text-right"
                                                        value={row.qty}
                                                        onChange={(e) => updateIngredient(row.tempId, 'qty', parseFloat(e.target.value))}
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
                            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {id ? 'Update Recipe' : 'Save Recipe'}
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    )
}
