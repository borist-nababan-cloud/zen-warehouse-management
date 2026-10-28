import { useState, useEffect, useMemo } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { useProductsPaginated } from '@/hooks/useMasterBarang'
import { getShrinkageCategories, createShrinkageLog } from '@/services/inventoryService'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Loader2, AlertTriangle, Save, Store, Calendar, Package, Tags, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { MasterShrinkageCategory } from '@/types/database'

export function ShrinkageFormPage() {
    const { user } = useAuthUser()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoadingCategories, setIsLoadingCategories] = useState(true)

    // Form State
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [selectedProduct, setSelectedProduct] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')
    const [qtyLost, setQtyLost] = useState<number>(0)
    const [description, setDescription] = useState('')

    // Data State
    const [categories, setCategories] = useState<MasterShrinkageCategory[]>([])

    // Fetch Products
    const { data: productsData, isLoading: isLoadingProducts } = useProductsPaginated(
        0,
        1000,
        false,
        user?.kode_outlet || undefined
    )
    const allProducts = productsData?.data || []

    const productOptions = useMemo(() => {
        return allProducts.map(p => ({
            value: p.id.toString(),
            label: p.name || 'Produk Tanpa Nama',
            subLabel: `SKU: ${p.sku || '-'}`
        }))
    }, [allProducts])

    useEffect(() => {
        loadCategories(user?.kode_outlet || '111')
    }, [user?.kode_outlet])

    async function loadCategories(outletId: string) {
        setIsLoadingCategories(true)
        const res = await getShrinkageCategories(outletId)
        if (res.isSuccess && res.data) {
            setCategories(res.data)
        } else if (res.error) {
            toast.error('Gagal memuat kategori penyusutan: ' + res.error)
        }
        setIsLoadingCategories(false)
    }

    const selectedCategoryObj = useMemo(() => {
        return categories.find(c => c.id === selectedCategory)
    }, [categories, selectedCategory])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!date || !selectedProduct || !selectedCategory || !qtyLost || qtyLost <= 0) {
            toast.error('Harap lengkapi seluruh kolom wajib dan pastikan jumlah penyusutan lebih dari 0.')
            return
        }

        if (!user?.kode_outlet) {
            toast.error('Akun Anda belum terhubung dengan kode outlet aktif.')
            return
        }

        setIsSubmitting(true)
        try {
            const product = allProducts.find(p => p.id.toString() === selectedProduct)
            if (!product) throw new Error('Produk tidak ditemukan di katalog.')

            const result = await createShrinkageLog({
                barang_id: parseInt(selectedProduct, 10),
                kode_outlet: user.kode_outlet,
                shrinkage_category_id: selectedCategory,
                qty_lost: qtyLost,
                notes: description.trim() || null,
                transaction_date: format(date, 'yyyy-MM-dd')
            })

            if (result.isSuccess) {
                toast.success('Catatan penyusutan / pemusnahan stok berhasil disimpan.')
                // Reset form
                setQtyLost(0)
                setDescription('')
                setSelectedProduct('')
                setSelectedCategory('')
            } else {
                toast.error(result.error || 'Gagal menyimpan catatan penyusutan.')
            }
        } catch (err: any) {
            toast.error('Terjadi kesalahan: ' + err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const outletDisplay = user?.outlet?.name_outlet
        ? `${user.kode_outlet} - ${user.outlet.name_outlet}`
        : user?.kode_outlet || 'Outlet Belum Ditetapkan'

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-2xl mx-auto pb-10">
                {/* Page Header */}
                <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#EBE6DF]">
                            Penyusutan / Pemusnahan Stok
                        </h1>
                        <p className="text-slate-500 dark:text-[#A6A095] text-sm mt-1">
                            Pencatatan penghapusan stok barang karena rusak, kadaluarsa, tumpah, atau susut di gudang outlet.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <Card className="border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm border-t-4 border-t-[#889D35]">
                        <CardHeader className="bg-[#F8F5F1]/60 dark:bg-[#191914]/50 border-b border-slate-100 dark:border-[#38382E] pb-4">
                            <CardTitle className="text-lg font-bold text-slate-900 dark:text-[#EBE6DF]">
                                Rincian Penghapusan Stok (Write-off)
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500 dark:text-[#A6A095]">
                                Pastikan jumlah fisik barang yang rusak atau dimusnahkan telah diverifikasi sebelum disimpan.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-5 pt-6">
                            {/* Outlet (Read Only) */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5 text-slate-700 dark:text-[#EBE6DF]">
                                    <Store className="w-3.5 h-3.5 text-[#889D35]" />
                                    Lokasi Outlet
                                </Label>
                                <Input
                                    disabled
                                    value={outletDisplay}
                                    className="bg-slate-50 dark:bg-[#191914] border-slate-200 dark:border-[#38382E] text-slate-700 dark:text-[#EBE6DF] font-medium"
                                />
                            </div>

                            {/* Tanggal Transaksi */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5 text-slate-700 dark:text-[#EBE6DF]">
                                    <Calendar className="w-3.5 h-3.5 text-[#889D35]" />
                                    Tanggal Transaksi <span className="text-rose-500">*</span>
                                </Label>
                                <Input
                                    type="date"
                                    value={date ? format(date, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => setDate(e.target.value ? new Date(e.target.value) : undefined)}
                                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
                                    required
                                />
                            </div>

                            {/* Nama Barang / Produk */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5 text-slate-700 dark:text-[#EBE6DF]">
                                    <Package className="w-3.5 h-3.5 text-[#889D35]" />
                                    Nama Barang / Produk <span className="text-rose-500">*</span>
                                </Label>
                                <SearchableSelect
                                    options={productOptions}
                                    value={selectedProduct}
                                    onChange={setSelectedProduct}
                                    placeholder={isLoadingProducts ? 'Memuat daftar produk...' : 'Cari dan pilih produk (Nama / SKU)...'}
                                    disabled={isLoadingProducts}
                                />
                            </div>

                            {/* Kategori Penyusutan */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5 text-slate-700 dark:text-[#EBE6DF]">
                                    <Tags className="w-3.5 h-3.5 text-[#889D35]" />
                                    Kategori Penyusutan <span className="text-rose-500">*</span>
                                </Label>
                                <Select
                                    value={selectedCategory}
                                    onValueChange={setSelectedCategory}
                                    disabled={isLoadingCategories}
                                >
                                    <SelectTrigger className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]">
                                        <SelectValue
                                            placeholder={
                                                isLoadingCategories
                                                    ? 'Memuat kategori penyusutan...'
                                                    : 'Pilih alasan penyusutan / pemusnahan...'
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent className="dark:bg-[#22221B] dark:border-[#38382E]">
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedCategoryObj?.description && (
                                    <p className="text-xs text-slate-500 dark:text-[#A6A095] italic">
                                        Keterangan kategori: {selectedCategoryObj.description}
                                    </p>
                                )}
                            </div>

                            {/* Jumlah Penyusutan */}
                            <div className="space-y-2">
                                <Label className="text-slate-700 dark:text-[#EBE6DF]">
                                    Jumlah Penyusutan / Rusak (Qty) <span className="text-rose-500">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder="Masukkan jumlah kuantitas yang dihapus..."
                                    value={qtyLost || ''}
                                    onChange={e => setQtyLost(parseFloat(e.target.value) || 0)}
                                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus-visible:ring-[#889D35]"
                                    required
                                />
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Perhatian: Jumlah ini akan langsung memotong saldo stok aktif di gudang outlet.
                                </p>
                            </div>

                            {/* Deskripsi / Kronologi */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5 text-slate-700 dark:text-[#EBE6DF]">
                                    <FileText className="w-3.5 h-3.5 text-[#889D35]" />
                                    Keterangan / Catatan Kronologi
                                </Label>
                                <Textarea
                                    placeholder="Jelaskan alasan rinci atau kronologi kejadian (misal: botol pecah saat bongkar muat, lewat masa kadaluarsa, dll)..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="min-h-[96px] dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-[#889D35] hover:bg-[#72842B] text-white font-semibold mt-4 shadow-sm"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                Simpan Catatan Penyusutan
                            </Button>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </DashboardLayout>
    )
}
