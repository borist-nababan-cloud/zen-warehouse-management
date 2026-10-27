import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
    Plus,
    Edit2,
    Search,
    ArrowDownCircle,
    ArrowUpCircle,
    Loader2,
    CheckCircle2,
    Layers,
    Filter
} from 'lucide-react'

// Services & Types
import {
    getAllTransactionCategories,
    createTransactionCategory,
    updateTransactionCategory
} from '@/services/financeService'
import { FinanceTransactionCategory } from '@/types/database'

export function TransactionCategoriesPage() {
    const [categories, setCategories] = useState<FinanceTransactionCategory[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL')
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

    // Modal state for Create / Edit
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [editingCategory, setEditingCategory] = useState<FinanceTransactionCategory | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        type: 'IN' as 'IN' | 'OUT',
        description: '',
        is_active: true
    })

    const fetchCategories = async () => {
        setIsLoading(true)
        const res = await getAllTransactionCategories()
        if (res.isSuccess && res.data) {
            setCategories(res.data)
        } else {
            toast.error(res.error || 'Gagal memuat kategori transaksi')
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchCategories()
    }, [])

    const handleOpenCreateModal = () => {
        setEditingCategory(null)
        setFormData({
            name: '',
            type: 'IN',
            description: '',
            is_active: true
        })
        setIsDialogOpen(true)
    }

    const handleOpenEditModal = (cat: FinanceTransactionCategory) => {
        setEditingCategory(cat)
        setFormData({
            name: cat.name,
            type: cat.type,
            description: cat.description || '',
            is_active: cat.is_active
        })
        setIsDialogOpen(true)
    }

    const handleToggleActive = async (cat: FinanceTransactionCategory) => {
        const nextState = !cat.is_active
        // Optimistic UI update
        setCategories(prev =>
            prev.map(c => c.id === cat.id ? { ...c, is_active: nextState } : c)
        )

        const res = await updateTransactionCategory(cat.id, { is_active: nextState })
        if (res.isSuccess) {
            toast.success(`Kategori "${cat.name}" berhasil di${nextState ? 'aktifkan' : 'nonaktifkan'}`)
        } else {
            toast.error(res.error || 'Gagal mengubah status kategori')
            // Revert
            setCategories(prev =>
                prev.map(c => c.id === cat.id ? { ...c, is_active: cat.is_active } : c)
            )
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim()) {
            toast.error('Nama kategori tidak boleh kosong')
            return
        }

        setIsSaving(true)
        if (editingCategory) {
            // Update
            const res = await updateTransactionCategory(editingCategory.id, {
                name: formData.name.trim(),
                type: formData.type,
                description: formData.description.trim() || undefined,
                is_active: formData.is_active
            })
            if (res.isSuccess) {
                toast.success('Kategori transaksi berhasil diperbarui')
                setIsDialogOpen(false)
                fetchCategories()
            } else {
                toast.error(res.error || 'Gagal memperbarui kategori')
            }
        } else {
            // Create
            const res = await createTransactionCategory({
                name: formData.name.trim(),
                type: formData.type,
                description: formData.description.trim() || undefined,
                is_active: formData.is_active
            })
            if (res.isSuccess) {
                toast.success('Kategori transaksi baru berhasil ditambahkan')
                setIsDialogOpen(false)
                fetchCategories()
            } else {
                toast.error(res.error || 'Gagal menambahkan kategori transaksi')
            }
        }
        setIsSaving(false)
    }

    // Filtered data
    const filteredCategories = useMemo(() => {
        return categories.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
            const matchesType = typeFilter === 'ALL' || c.type === typeFilter
            const matchesStatus = statusFilter === 'ALL' ||
                (statusFilter === 'ACTIVE' && c.is_active) ||
                (statusFilter === 'INACTIVE' && !c.is_active)

            return matchesSearch && matchesType && matchesStatus
        })
    }, [categories, searchQuery, typeFilter, statusFilter])

    // Counters
    const totalCount = categories.length
    const inCount = categories.filter(c => c.type === 'IN').length
    const outCount = categories.filter(c => c.type === 'OUT').length
    const activeCount = categories.filter(c => c.is_active).length

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            Master Kategori Transaksi
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Kelola kategori penerimaan kas masuk (IN) dan pengeluaran kas keluar (OUT) untuk keuangan cabang.
                        </p>
                    </div>
                    <Button
                        onClick={handleOpenCreateModal}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Kategori
                    </Button>
                </div>

                {/* Summary Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-border/60 shadow-sm bg-card">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Kategori</p>
                                <p className="text-2xl font-bold mt-1 text-foreground">{totalCount}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                <Layers className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm bg-card">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kas Masuk (IN)</p>
                                <p className="text-2xl font-bold mt-1 text-emerald-600">{inCount}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                                <ArrowDownCircle className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm bg-card">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kas Keluar (OUT)</p>
                                <p className="text-2xl font-bold mt-1 text-rose-600">{outCount}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                                <ArrowUpCircle className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm bg-card">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status Aktif</p>
                                <p className="text-2xl font-bold mt-1 text-primary">{activeCount}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter and Search Bar */}
                <Card className="border-border/60 shadow-sm bg-card">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="relative w-full md:w-80">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                                <Input
                                    placeholder="Cari nama atau keterangan kategori..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 h-10"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-muted-foreground" />
                                    <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
                                        <SelectTrigger className="w-[150px] h-10">
                                            <SelectValue placeholder="Tipe Arah" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">Semua Tipe</SelectItem>
                                            <SelectItem value="IN">Kas Masuk (IN)</SelectItem>
                                            <SelectItem value="OUT">Kas Keluar (OUT)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                                    <SelectTrigger className="w-[140px] h-10">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Semua Status</SelectItem>
                                        <SelectItem value="ACTIVE">Aktif</SelectItem>
                                        <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Table Card */}
                <Card className="border-border/60 shadow-sm overflow-hidden bg-card">
                    <CardHeader className="bg-primary/5 pb-4 border-b border-border/40">
                        <CardTitle className="text-base font-semibold text-primary">
                            Daftar Kategori Transaksi ({filteredCategories.length})
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Kategori yang aktif akan otomatis muncul pada dropdown Transaksi Kas & Bank. Penghapusan data dibatasi; ubah status menjadi Nonaktif jika tidak lagi digunakan.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-[15%] font-medium">Tipe Arah</TableHead>
                                    <TableHead className="w-[30%] font-medium">Nama Kategori</TableHead>
                                    <TableHead className="w-[35%] font-medium">Keterangan</TableHead>
                                    <TableHead className="w-[10%] font-medium text-center">Status</TableHead>
                                    <TableHead className="w-[10%] font-medium text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                                <span>Memuat data kategori transaksi...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredCategories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                                            Tidak ada data kategori yang sesuai dengan filter.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCategories.map(cat => (
                                        <TableRow key={cat.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell>
                                                {cat.type === 'IN' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                        Kas Masuk (IN)
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                        <ArrowUpCircle className="w-3.5 h-3.5 text-rose-600" />
                                                        Kas Keluar (OUT)
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-semibold text-foreground">
                                                {cat.name}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {cat.description || <span className="italic text-muted-foreground/60">-</span>}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Switch
                                                        checked={cat.is_active}
                                                        onCheckedChange={() => handleToggleActive(cat)}
                                                        className="data-[state=checked]:bg-primary"
                                                    />
                                                    <span className={`text-xs font-medium ${cat.is_active ? 'text-primary' : 'text-muted-foreground'}`}>
                                                        {cat.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleOpenEditModal(cat)}
                                                    className="h-8 px-2 text-primary hover:bg-primary/10"
                                                    title="Ubah Kategori"
                                                >
                                                    <Edit2 className="w-4 h-4 mr-1" />
                                                    Ubah
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Dialog Create / Edit */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-[480px]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingCategory ? 'Ubah Kategori Transaksi' : 'Tambah Kategori Transaksi Baru'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingCategory
                                    ? 'Perbarui rincian nama, tipe, keterangan, atau status kategori.'
                                    : 'Tambahkan kategori baru untuk transaksi kas masuk atau keluar.'}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="cat_type" className="text-sm font-medium">
                                    Tipe Arah Transaksi <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val: 'IN' | 'OUT') => setFormData({ ...formData, type: val })}
                                >
                                    <SelectTrigger id="cat_type">
                                        <SelectValue placeholder="Pilih Tipe Arah" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="IN">Kas Masuk (IN) - Penerimaan / Modal</SelectItem>
                                        <SelectItem value="OUT">Kas Keluar (OUT) - Biaya / Pengeluaran</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cat_name" className="text-sm font-medium">
                                    Nama Kategori <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="cat_name"
                                    placeholder="misal: Setoran Modal, Biaya Listrik, dll."
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cat_desc" className="text-sm font-medium">
                                    Keterangan / Deskripsi
                                </Label>
                                <Textarea
                                    id="cat_desc"
                                    placeholder="Deskripsi singkat jenis pengeluaran/penerimaan ini..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                                <div>
                                    <Label htmlFor="cat_status" className="text-sm font-medium">Status Aktif</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Kategori aktif dapat dipilih pada form transaksi kas
                                    </p>
                                </div>
                                <Switch
                                    id="cat_status"
                                    checked={formData.is_active}
                                    onCheckedChange={(val: boolean) => setFormData({ ...formData, is_active: val })}
                                    className="data-[state=checked]:bg-primary"
                                />
                            </div>

                            <DialogFooter className="pt-4 gap-2 sm:gap-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsDialogOpen(false)}
                                    disabled={isSaving}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        'Simpan Kategori'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
