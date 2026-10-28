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
    Loader2,
    CheckCircle2,
    XCircle,
    Layers,
    Filter,
    ShieldAlert,
    AlertTriangle
} from 'lucide-react'
import { useAuthUser } from '@/hooks/useAuth'
import {
    getAllShrinkageCategories,
    createShrinkageCategory,
    updateShrinkageCategory,
    toggleShrinkageCategoryStatus
} from '@/services/inventoryService'
import { MasterShrinkageCategory } from '@/types/database'

export function ShrinkageCategoriesPage() {
    const { user } = useAuthUser()
    const [categories, setCategories] = useState<MasterShrinkageCategory[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

    // Modal state for Create / Edit
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [editingCategory, setEditingCategory] = useState<MasterShrinkageCategory | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        is_active: true
    })

    const fetchCategories = async () => {
        setIsLoading(true)
        const res = await getAllShrinkageCategories()
        if (res.isSuccess && res.data) {
            setCategories(res.data)
        } else {
            toast.error(res.error || 'Gagal memuat kategori penyusutan')
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
            description: '',
            is_active: true
        })
        setIsDialogOpen(true)
    }

    const handleOpenEditModal = (cat: MasterShrinkageCategory) => {
        setEditingCategory(cat)
        setFormData({
            name: cat.name,
            description: cat.description || '',
            is_active: cat.is_active ?? true
        })
        setIsDialogOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim()) {
            toast.error('Nama kategori penyusutan wajib diisi')
            return
        }

        setIsSaving(true)
        if (editingCategory) {
            const res = await updateShrinkageCategory(
                editingCategory.id,
                {
                    name: formData.name,
                    description: formData.description,
                    is_active: formData.is_active
                },
                user?.id
            )

            if (res.isSuccess) {
                toast.success('Kategori penyusutan berhasil diperbarui')
                setIsDialogOpen(false)
                fetchCategories()
            } else {
                toast.error(res.error || 'Gagal memperbarui kategori penyusutan')
            }
        } else {
            const res = await createShrinkageCategory(
                {
                    name: formData.name,
                    description: formData.description,
                    is_active: formData.is_active,
                    kode_outlet: user?.kode_outlet || '111'
                },
                user?.id
            )

            if (res.isSuccess) {
                toast.success('Kategori penyusutan berhasil ditambahkan')
                setIsDialogOpen(false)
                fetchCategories()
            } else {
                toast.error(res.error || 'Gagal menambahkan kategori penyusutan')
            }
        }
        setIsSaving(false)
    }

    const handleToggleStatus = async (cat: MasterShrinkageCategory) => {
        const newStatus = !cat.is_active
        const res = await toggleShrinkageCategoryStatus(cat.id, newStatus, user?.id)

        if (res.isSuccess) {
            toast.success(`Kategori "${cat.name}" berhasil di${newStatus ? 'aktifkan' : 'nonaktifkan'}`)
            setCategories(prev =>
                prev.map(item => (item.id === cat.id ? { ...item, is_active: newStatus } : item))
            )
        } else {
            toast.error(res.error || 'Gagal mengubah status kategori penyusutan')
        }
    }

    const filteredCategories = useMemo(() => {
        return categories.filter(cat => {
            const matchesSearch =
                cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()))

            const matchesStatus =
                statusFilter === 'ALL' ||
                (statusFilter === 'ACTIVE' && cat.is_active) ||
                (statusFilter === 'INACTIVE' && !cat.is_active)

            return matchesSearch && matchesStatus
        })
    }, [categories, searchQuery, statusFilter])

    const totalCount = categories.length
    const activeCount = categories.filter(c => c.is_active).length
    const inactiveCount = totalCount - activeCount

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-lg bg-[#889D35]/15 text-[#889D35]">
                                <AlertTriangle className="w-5 h-5" />
                            </span>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#EBE6DF]">
                                Kategori Penyusutan & Pemusnahan
                            </h1>
                        </div>
                        <p className="text-slate-500 dark:text-[#A6A095] mt-1 text-sm">
                            Kelola kategori alasan penghapusan stok barang (rusak, kadaluarsa, tumpah, susut, atau limbah produksi).
                        </p>
                    </div>

                    <Button
                        onClick={handleOpenCreateModal}
                        className="bg-[#889D35] hover:bg-[#72842B] text-white shadow-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Kategori
                    </Button>
                </div>

                {/* Audit & Policy Notice Banner */}
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                        <span className="font-semibold">Ketentuan Integritas Data Gudang:</span> Sesuai regulasi audit operasional dan keterlacakan stok, kategori penyusutan <span className="font-semibold underline">tidak dapat dihapus</span> agar riwayat laporan penyusutan masa lalu tetap valid. Jika kategori sudah tidak digunakan, ubah statusnya menjadi <span className="font-semibold">Nonaktif</span>.
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-[#A6A095]">Total Kategori</p>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-[#EBE6DF] mt-1">
                                        {totalCount}
                                    </h3>
                                </div>
                                <div className="p-3 bg-slate-100 dark:bg-[#191914] rounded-xl text-slate-600 dark:text-slate-400">
                                    <Layers className="w-5 h-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-[#A6A095]">Kategori Aktif</p>
                                    <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                        {activeCount}
                                    </h3>
                                </div>
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-[#A6A095]">Kategori Nonaktif</p>
                                    <h3 className="text-2xl font-bold text-slate-600 dark:text-[#A6A095] mt-1">
                                        {inactiveCount}
                                    </h3>
                                </div>
                                <div className="p-3 bg-slate-100 dark:bg-[#191914] rounded-xl text-slate-500 dark:text-slate-400">
                                    <XCircle className="w-5 h-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & Table Card */}
                <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <CardTitle className="text-lg text-slate-900 dark:text-[#EBE6DF]">Daftar Kategori Penyusutan</CardTitle>
                                <CardDescription className="dark:text-[#A6A095]">
                                    Semua kategori alasan yang tersedia pada formulir Penyusutan / Pemusnahan Stok
                                </CardDescription>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                                    <Input
                                        placeholder="Cari nama atau deskripsi..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="pl-9 h-9 text-sm dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
                                    />
                                </div>

                                <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                                    <SelectTrigger className="w-full sm:w-36 h-9 text-sm dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]">
                                        <Filter className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent className="dark:bg-[#22221B] dark:border-[#38382E]">
                                        <SelectItem value="ALL">Semua Status</SelectItem>
                                        <SelectItem value="ACTIVE">Hanya Aktif</SelectItem>
                                        <SelectItem value="INACTIVE">Hanya Nonaktif</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80 dark:bg-[#191914]/80">
                                    <TableRow className="border-b border-slate-200 dark:border-[#38382E]">
                                        <TableHead className="w-16 text-center dark:text-[#EBE6DF]">No</TableHead>
                                        <TableHead className="min-w-[200px] dark:text-[#EBE6DF]">Nama Kategori</TableHead>
                                        <TableHead className="min-w-[280px] dark:text-[#EBE6DF]">Deskripsi / Keterangan</TableHead>
                                        <TableHead className="w-36 text-center dark:text-[#EBE6DF]">Status</TableHead>
                                        <TableHead className="w-28 text-center dark:text-[#EBE6DF]">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-40 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-[#A6A095]">
                                                    <Loader2 className="w-6 h-6 animate-spin text-[#889D35]" />
                                                    <p className="text-sm">Memuat data kategori penyusutan...</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredCategories.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-slate-500 dark:text-[#A6A095]">
                                                {searchQuery || statusFilter !== 'ALL'
                                                    ? 'Tidak ada kategori yang cocok dengan filter pencarian.'
                                                    : 'Belum ada kategori penyusutan. Klik "Tambah Kategori" untuk membuat.'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCategories.map((cat, index) => (
                                            <TableRow
                                                key={cat.id}
                                                className="border-b border-slate-100 dark:border-[#38382E]/60 hover:bg-slate-50/50 dark:hover:bg-[#191914]/40 transition-colors"
                                            >
                                                <TableCell className="text-center font-mono text-xs text-slate-400 dark:text-[#A6A095]">
                                                    {index + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-semibold text-slate-800 dark:text-[#EBE6DF]">
                                                        {cat.name}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600 dark:text-[#A6A095]">
                                                    {cat.description || (
                                                        <span className="text-slate-400 dark:text-slate-600 italic">
                                                            Tidak ada deskripsi
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Switch
                                                            checked={cat.is_active}
                                                            onCheckedChange={() => handleToggleStatus(cat)}
                                                            className="data-[state=checked]:bg-[#889D35]"
                                                        />
                                                        <span
                                                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                                cat.is_active
                                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                                    : 'bg-slate-100 text-slate-500 dark:bg-[#191914] dark:text-[#A6A095]'
                                                            }`}
                                                        >
                                                            {cat.is_active ? 'Aktif' : 'Nonaktif'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenEditModal(cat)}
                                                        className="h-8 px-2 text-slate-600 dark:text-[#EBE6DF] hover:text-[#889D35] hover:bg-[#889D35]/10"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                                                        Ubah
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Create / Edit Modal Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-md bg-white dark:bg-[#22221B] border-slate-200 dark:border-[#38382E]">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-[#EBE6DF]">
                                {editingCategory ? 'Ubah Kategori Penyusutan' : 'Tambah Kategori Penyusutan'}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-slate-500 dark:text-[#A6A095]">
                                {editingCategory
                                    ? 'Perbarui informasi nama, deskripsi, dan status kategori penyusutan stok.'
                                    : 'Tambahkan kategori alasan baru untuk pencatatan penyusutan atau pemusnahan stok.'}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSave} className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-sm font-medium dark:text-[#EBE6DF]">
                                    Nama Kategori <span className="text-rose-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="Cth: Barang Rusak / Pecah, Kadaluarsa / Busuk..."
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="description" className="text-sm font-medium dark:text-[#EBE6DF]">
                                    Deskripsi / Keterangan Alasan
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Jelaskan kondisi barang atau kriteria penyusutan untuk kategori ini..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="h-24 dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-[#38382E] bg-slate-50 dark:bg-[#191914]">
                                <div>
                                    <Label className="text-sm font-medium dark:text-[#EBE6DF] cursor-pointer">
                                        Status Aktif
                                    </Label>
                                    <p className="text-xs text-slate-500 dark:text-[#A6A095]">
                                        Hanya kategori aktif yang dapat dipilih pada formulir Penyusutan / Pemusnahan.
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.is_active}
                                    onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
                                    className="data-[state=checked]:bg-[#889D35]"
                                />
                            </div>

                            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-[#38382E] gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsDialogOpen(false)}
                                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-[#889D35] hover:bg-[#72842B] text-white"
                                >
                                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Simpan Kategori
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    )
}
export default ShrinkageCategoriesPage

