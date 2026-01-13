import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthUser } from '@/hooks/useAuth'
import { getRecipes, Recipe } from '@/services/recipeService'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Plus, BookOpen, ChevronRight, Pencil } from 'lucide-react'

export function RecipeListPage() {
    const navigate = useNavigate()
    const { user } = useAuthUser()
    const [recipes, setRecipes] = useState<Recipe[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user?.kode_outlet) {
            loadRecipes()
        }
    }, [user?.kode_outlet])

    async function loadRecipes() {
        setLoading(true)
        const res = await getRecipes(user?.kode_outlet || '')
        if (res.data) {
            setRecipes(res.data)
        }
        setLoading(false)
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Recipe Manager</h1>
                        <p className="text-muted-foreground mt-1">
                            Define standard recipes (Bill of Materials) for your products.
                        </p>
                    </div>
                    <Button onClick={() => navigate('/production/recipes/create')} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Recipe
                    </Button>
                </div>

                <Card className="border-indigo-100 shadow-sm bg-white/50 backdrop-blur-sm">
                    <CardHeader className="bg-indigo-50/50 pb-4">
                        <CardTitle className="flex items-center gap-2 text-indigo-900">
                            <BookOpen className="h-5 w-5 text-indigo-600" />
                            Active Recipes
                        </CardTitle>
                        <CardDescription>
                            List of all defined product recipes and their standard outputs.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead>Target Product</TableHead>
                                    <TableHead>Standard Output</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                            Loading recipes...
                                        </TableCell>
                                    </TableRow>
                                ) : recipes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                            No recipes found. Create one to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    recipes.map((recipe, index) => (
                                        <TableRow
                                            key={recipe.id}
                                            className="cursor-pointer hover:bg-indigo-50/30 transition-colors"
                                        // onClick={() => navigate(`/production/recipes/${recipe.id}`)} // Future feature: view detailed
                                        >
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {index + 1}
                                            </TableCell>
                                            <TableCell className="font-medium text-gray-900">
                                                {recipe.product_name || 'Unknown Product'}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                    {recipe.standard_qty_output}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {recipe.description || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            navigate(`/production/recipes/edit/${recipe.id}`)
                                                        }}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
