import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { useProductsPaginated } from '@/hooks/useMasterBarang'
import { createProductionRun, getRecipeByProduct, getIngredientsWithCost } from '@/services/productionService'
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
import { Calendar as CalendarIcon, Save, Loader2, Info } from 'lucide-react'
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

    const [ingredients, setIngredients] = useState<ProductionItem[]>([])

    // Data Fetching
    const { data: productsData } = useProductsPaginated(0, 200, false, user?.kode_outlet || undefined)
    const allProducts = productsData?.data || []

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

                    // If actual output is already set (e.g. user typed it before selecting product?), recalc
                    if (actualOutput > 0) {
                        const ratio = actualOutput / recipe.standard_qty_output
                        setIngredients(prev => prev.map(item => ({
                            ...item,
                            qty: parseFloat((item.standard_qty * ratio).toFixed(4))
                        })))
                    }
                }
            } else {
                toast.warning("No standard recipe found. Please define one first.")
                setIngredients([])
            }
        } catch (err) {
            console.error(err)
            toast.error("Failed to load recipe.")
        } finally {
            setIsLoadingRecipe(false)
        }
    }

    const updateIngredientQty = (barangId: number, newQty: number) => {
        setIngredients(prev => prev.map(item =>
            item.barang_id === barangId ? { ...item, qty: newQty } : item
        ))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProductId || actualOutput <= 0) {
            toast.error("Please select a product and enter actual output.")
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
                }))
            })

            if (result.isSuccess) {
                toast.success("Production Run recorded successfully!")
                // Reset form
                setActualOutput(0)
                setSelectedProductId('')
                setIngredients([])
            } else {
                toast.error(result.error || "Failed to submit production run.")
            }
        } catch (error) {
            console.error(error)
            toast.error("An unexpected error occurred.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-5xl mx-auto pb-20">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-indigo-950">Production Worksheet</h1>
                    <p className="text-muted-foreground text-indigo-600/70">
                        Record daily production and material usage.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Top Section: Header Info */}
                    <Card className="border-indigo-100 shadow-sm bg-white/70 backdrop-blur-sm">
                        <CardHeader className="bg-indigo-50/40 pb-4">
                            <CardTitle className="text-indigo-900 flex items-center gap-2">
                                <Info className="h-5 w-5 text-indigo-500" />
                                Run Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label>Production Date</Label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="pl-9 border-indigo-200 focus-visible:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Product (Finished Good)</Label>
                                <Select
                                    value={selectedProductId}
                                    onValueChange={setSelectedProductId}
                                >
                                    <SelectTrigger className="border-indigo-200 focus:ring-indigo-500">
                                        <SelectValue placeholder="Select Product..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allProducts.map(p => (
                                            <SelectItem key={p.id} value={p.id.toString()}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Actual Output Qty</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={actualOutput}
                                        onChange={(e) => setActualOutput(parseFloat(e.target.value))}
                                        className="font-mono text-lg font-semibold text-indigo-900 border-indigo-200 bg-indigo-50/30"
                                        placeholder="0.00"
                                    />
                                    <div className="absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none w-24 text-right truncate">
                                        {(() => {
                                            if (!selectedProductId) return `BASE: ${standardOutputBase}`
                                            const p = allProducts.find(x => x.id.toString() === selectedProductId)
                                            // Check purchase_uom or base_uom
                                            const unit = p?.barang_units?.[0]?.purchase_uom || p?.barang_units?.[0]?.base_uom || ''
                                            return unit ? `${unit} (Base: ${standardOutputBase})` : `BASE: ${standardOutputBase}`
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Middle Section: Ingredients Worksheet */}
                    <Card className="border-indigo-100 shadow-md overflow-hidden">
                        <CardHeader className="bg-indigo-100/50 border-b border-indigo-100 pb-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-indigo-900">Ingredients Usage</CardTitle>
                                    <CardDescription>
                                        Adjust actual quantities consumed if different from standard.
                                    </CardDescription>
                                </div>
                                {ingredients.length > 0 && (
                                    <div className="bg-white px-3 py-1 rounded-full text-xs font-medium text-indigo-600 shadow-sm border border-indigo-100">
                                        {ingredients.length} Items Loaded
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-indigo-50/30">
                                    <TableRow>
                                        <TableHead className="w-[40%]">Material</TableHead>
                                        <TableHead className="w-[15%] text-right">Standard Qty</TableHead>
                                        <TableHead className="w-[20%] text-right">Actual Usage</TableHead>
                                        <TableHead className="w-[10%] pl-4">Unit</TableHead>
                                        <TableHead className="w-[15%] text-right">Unit Cost (Est.)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingRecipe ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-400" />
                                                <span className="text-xs text-muted-foreground mt-2 block">Loading Recipe...</span>
                                            </TableCell>
                                        </TableRow>
                                    ) : ingredients.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                Select a product to load the recipe worksheet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        ingredients.map((item) => (
                                            <TableRow key={item.barang_id} className="hover:bg-indigo-50/20">
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{item.material_name}</div>
                                                        <div className="text-xs text-muted-foreground">{item.material_sku}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-muted-foreground">
                                                    {(item.standard_qty * (actualOutput / standardOutputBase)).toFixed(4)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        value={item.qty}
                                                        onChange={(e) => updateIngredientQty(item.barang_id, parseFloat(e.target.value))}
                                                        className="h-8 w-full text-right font-mono bg-white border-indigo-200 focus:border-indigo-500"
                                                    />
                                                </TableCell>
                                                <TableCell className="pl-4 text-xs font-medium text-muted-foreground">
                                                    {item.uom}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                    {item.cost.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Action Bar */}
                    <div className="fixed bottom-6 right-6 z-10">
                        <Button
                            type="submit"
                            size="lg"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-full px-8"
                            disabled={isSubmitting || ingredients.length === 0}
                        >
                            {isSubmitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Finalize Production Run
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    )
}
