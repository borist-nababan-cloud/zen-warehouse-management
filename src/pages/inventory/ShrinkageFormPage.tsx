
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthUser } from '@/hooks/useAuth'
import { useProductsPaginated } from '@/hooks/useMasterBarang'
import { getShrinkageCategories, createShrinkageLog } from '@/services/inventoryService'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, AlertTriangle, Save } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { MasterShrinkageCategory } from '@/types/database'

export function ShrinkageFormPage() {
    const navigate = useNavigate()
    const { user } = useAuthUser()
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form State
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [selectedProduct, setSelectedProduct] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')
    const [qtyLost, setQtyLost] = useState<number>(0)
    const [description, setDescription] = useState('')

    // Data State
    const [categories, setCategories] = useState<MasterShrinkageCategory[]>([])

    // Fetch Products (Paginated hook is enough for search dropdown if we implemented search, 
    // but for now standard select with limited list or assuming small catalog. 
    // Ideally we should use a command palette/combobox for large product lists, 
    // but preserving simplicity as per request first)
    const { data: productsData } = useProductsPaginated(0, 1000, false, user?.kode_outlet || undefined)
    const allProducts = productsData?.data || []

    useEffect(() => {
        if (user?.kode_outlet) {
            loadCategories(user.kode_outlet)
        }
    }, [user?.kode_outlet])

    async function loadCategories(outletId: string) {
        const res = await getShrinkageCategories(outletId)
        if (res.isSuccess && res.data) {
            setCategories(res.data)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!date || !selectedProduct || !selectedCategory || qtyLost <= 0) {
            toast.error("Please fill all fields correctly.")
            return
        }

        setIsSubmitting(true)
        try {
            const product = allProducts.find(p => p.id.toString() === selectedProduct)
            if (!product) throw new Error("Product not found")

            const result = await createShrinkageLog({
                barang_id: parseInt(selectedProduct),
                kode_outlet: user?.kode_outlet || '111',
                shrinkage_category_id: selectedCategory,
                qty_lost: qtyLost,
                notes: description,
                transaction_date: format(date, 'yyyy-MM-dd')
            })

            if (result.isSuccess) {
                toast.success("Shrinkage recorded successfully.")
                // Reset form
                setQtyLost(0)
                setDescription('')
                setSelectedProduct('')
                setSelectedCategory('')
            } else {
                toast.error(result.error || "Failed to save record.")
            }
        } catch (err: any) {
            toast.error("Error: " + err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-2xl mx-auto pb-10">
                <div className="flex items-center gap-3 text-red-600">
                    <AlertTriangle className="h-8 w-8" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Inventory Shrinkage</h1>
                        <p className="text-muted-foreground text-sm">Record stock write-offs (spoilage, damage, etc).</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <Card className="border-red-100 shadow-sm border-t-4 border-t-red-500">
                        <CardHeader className="bg-red-50/10 pb-4">
                            <CardTitle className="text-lg text-red-900">Write-off Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">

                            {/* Outlet (Read Only) */}
                            <div className="space-y-2">
                                <Label>Outlet</Label>
                                <Input disabled value={user?.outlet?.name_outlet || user?.kode_outlet || ''} />
                            </div>

                            {/* Date */}
                            <div className="space-y-2">
                                <Label>Transaction Date</Label>
                                <Input
                                    type="date"
                                    value={date ? format(date, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => setDate(e.target.value ? new Date(e.target.value) : undefined)}
                                />
                            </div>

                            {/* Product */}
                            <div className="space-y-2">
                                <Label>Item Name</Label>
                                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
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

                            {/* Category */}
                            <div className="space-y-2">
                                <Label>Shrinkage Category</Label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Reason..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Qty */}
                            <div className="space-y-2">
                                <Label>Quantity Lost</Label>
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={qtyLost || ''}
                                    onChange={e => setQtyLost(parseFloat(e.target.value))}
                                    className="border-red-200 focus-visible:ring-red-500"
                                />
                                <p className="text-xs text-muted-foreground">This amount will be deducted from inventory.</p>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label>Description / Notes</Label>
                                <Textarea
                                    placeholder="Explain why this happened..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-red-600 hover:bg-red-700 text-white mt-4"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Submit Write-off
                            </Button>

                        </CardContent>
                    </Card>
                </form>
            </div>
        </DashboardLayout>
    )
}
