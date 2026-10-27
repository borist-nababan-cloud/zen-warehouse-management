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
import { Plus, BookOpen, Pencil } from 'lucide-react'

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
                        <h1 className="text-3xl font-bold tracking-tight">Manajemen Resep</h1>
                        <p className="text-muted-foreground mt-1">
                            Kelola formula dan komposisi bahan baku (Bill of Materials) untuk produk jadi.
                        </p>
                    </div>
                    <Button onClick={() => navigate('/production/recipes/create')} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Resep Baru
                    </Button>
                </div>

                <Card className="border shadow-sm bg-card">
                    <CardHeader className="bg-muted/40 pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            Daftar Resep Aktif
                        </CardTitle>
                        <CardDescription>
                            Daftar seluruh formula resep produk dan jumlah output standar produksi.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead>Produk Target</TableHead>
                                    <TableHead>Output Standar</TableHead>
                                    <TableHead>Deskripsi</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                            Memuat data resep...
                                        </TableCell>
                                    </TableRow>
                                ) : recipes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                            Belum ada resep. Klik Tambah Resep Baru untuk membuat formulasi.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    recipes.map((recipe, index) => (
                                        <TableRow
                                            key={recipe.id}
                                            className="hover:bg-muted/50 transition-colors"
                                        >
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {index + 1}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {recipe.product_name || 'Produk Tidak Dikenal'}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
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
                                                        className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
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
