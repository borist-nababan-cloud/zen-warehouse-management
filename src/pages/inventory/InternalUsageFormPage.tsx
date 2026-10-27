import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { useAuthUser } from '@/hooks/useAuth'
import { internalUsageService } from '@/services/internalUsageService'
import * as inventoryService from '@/services/inventoryService'
import { MasterIssueCategory } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { cn } from '@/lib/utils'

// Helper type for cart items
interface UsageCartItem {
    id: number // barang_id
    sku: string
    name: string
    uom: string | null
    qty_on_hand: number
    qty_used: number
    notes: string
}

export default function InternalUsageFormPage() {
    const navigate = useNavigate()
    const { user } = useAuthUser()

    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState<MasterIssueCategory[]>([])

    // Product Data
    // { value: string (id), label: string (name), subLabel: string (sku | stock) }
    const [productOptions, setProductOptions] = useState<any[]>([])
    const [rawProducts, setRawProducts] = useState<any[]>([])

    // Form State
    const [categoryId, setCategoryId] = useState<string>('')
    const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [requestedBy, setRequestedBy] = useState('')
    const [headerNotes, setHeaderNotes] = useState('')
    const [cart, setCart] = useState<UsageCartItem[]>([])

    // Selected product from dropdown (temp state before adding to cart)
    const [selectedProductId, setSelectedProductId] = useState<string>('')

    useEffect(() => {
        loadInitialData()
    }, [user])

    const loadInitialData = async () => {
        // 1. Load Categories
        const catRes = await internalUsageService.getCategories()
        if (catRes.data) setCategories(catRes.data)

        // 2. Load Products (Available stock)
        if (user?.kode_outlet) {
            const prodRes = await inventoryService.getInventoryBalanceForOpname(user.kode_outlet)
            if (prodRes.data) {
                // Store raw data for lookup
                setRawProducts(prodRes.data)

                // Format for SearchableSelect
                const options = prodRes.data.map((p: any) => ({
                    value: p.barang_id.toString(),
                    label: p.master_barang?.name || 'Unknown Item',
                    subLabel: `SKU: ${p.master_barang?.sku} | Stock: ${p.qty_on_hand}`
                }))
                setProductOptions(options)
            }
        }
    }

    // Effect to handle product selection from dropdown
    useEffect(() => {
        if (selectedProductId) {
            const prod = rawProducts.find(p => p.barang_id.toString() === selectedProductId)
            if (prod) {
                addToCart(prod)
                // Reset selection after adding
                // Timeout to allow UI to update (SearchableSelect might need it)
                setTimeout(() => setSelectedProductId(''), 100)
            }
        }
    }, [selectedProductId])

    const addToCart = (product: any) => {
        if (cart.find(c => c.id === product.barang_id)) {
            toast.error("Item already in list")
            return
        }

        setCart([...cart, {
            id: product.barang_id,
            sku: product.master_barang?.sku || '',
            name: product.master_barang?.name || '',
            uom: 'PCS', // Default
            qty_on_hand: product.qty_on_hand,
            qty_used: 1, // Default 1
            notes: ''
        }])
    }

    const updateCartItem = (index: number, field: keyof UsageCartItem, value: any) => {
        const newCart = [...cart]
        newCart[index] = { ...newCart[index], [field]: value }
        setCart(newCart)
    }

    const removeCartItem = (index: number) => {
        const newCart = [...cart]
        newCart.splice(index, 1)
        setCart(newCart)
    }

    const handleSubmit = async () => {
        if (!categoryId) return toast.error("Silakan pilih kategori pemakaian")
        if (!requestedBy) return toast.error("Silakan isi nama pemohon barang")
        if (cart.length === 0) return toast.error("Silakan tambahkan minimal satu barang")

        // Validate Stock
        for (const item of cart) {
            if (item.qty_used > item.qty_on_hand) {
                return toast.error(`Stok tidak mencukupi untuk ${item.name}. Tersedia: ${item.qty_on_hand}`)
            }
            if (item.qty_used <= 0) {
                return toast.error(`Jumlah pemakaian tidak valid untuk ${item.name}`)
            }
        }

        setLoading(true)
        try {
            const header = {
                kode_outlet: user!.kode_outlet!,
                category_id: parseInt(categoryId),
                transaction_date: transactionDate,
                requested_by: requestedBy,
                notes: headerNotes
            }

            const items = cart.map(c => ({
                barang_id: c.id,
                qty_used: c.qty_used,
                uom: c.uom,
                notes: c.notes
            }))

            const res = await internalUsageService.createUsage(header, items, user!.id)

            if (res.isSuccess) {
                toast.success("Pemakaian internal berhasil dicatat!")
                navigate('/inventory/internal-usage')
            } else {
                toast.error(res.error || "Gagal mencatat pemakaian internal")
            }
        } catch (err) {
            toast.error("Terjadi kesalahan sistem saat menyimpan")
        } finally {
            setLoading(false)
        }
    }

    return (
        <DashboardLayout>
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate('/inventory/internal-usage')}
                        className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#EBE6DF]">
                            Catat Pemakaian Internal Baru
                        </h1>
                        <p className="text-slate-500 dark:text-[#A6A095]">
                            Catat barang atau perlengkapan yang diambil untuk pemakaian operasional internal outlet.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Header Information */}
                    <Card className="md:col-span-1 border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] h-fit shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base text-slate-900 dark:text-[#EBE6DF]">Rincian Transaksi</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="dark:text-[#EBE6DF]">Tanggal Transaksi</Label>
                                <Input
                                    type="date"
                                    value={transactionDate}
                                    onChange={e => setTransactionDate(e.target.value)}
                                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="dark:text-[#EBE6DF]">Kategori Pemakaian <span className="text-rose-500">*</span></Label>
                                <Select value={categoryId} onValueChange={setCategoryId}>
                                    <SelectTrigger className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]">
                                        <SelectValue placeholder="Pilih Kategori" />
                                    </SelectTrigger>
                                    <SelectContent className="dark:bg-[#22221B] dark:border-[#38382E]">
                                        {categories.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.category_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="dark:text-[#EBE6DF]">Pemohon / Bagian <span className="text-rose-500">*</span></Label>
                                <Input
                                    placeholder="Cth: Front Office, Terapis, Supervisor..."
                                    value={requestedBy}
                                    onChange={e => setRequestedBy(e.target.value)}
                                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="dark:text-[#EBE6DF]">Catatan Keperluan</Label>
                                <Textarea
                                    placeholder="Catatan tambahan keperluan pemakaian..."
                                    value={headerNotes}
                                    onChange={e => setHeaderNotes(e.target.value)}
                                    className="dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF] focus:border-[#889D35]"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Items & Cart */}
                    <Card className="md:col-span-2 border-slate-200 dark:border-[#38382E] bg-white dark:bg-[#22221B] shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-[#38382E]">
                            <CardTitle className="text-base text-slate-900 dark:text-[#EBE6DF]">Daftar Barang yang Diambil</CardTitle>

                            <div className="w-[300px]">
                                <SearchableSelect
                                    options={productOptions}
                                    value={selectedProductId}
                                    onChange={setSelectedProductId}
                                    placeholder="Cari & Tambah Barang..."
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <Table>
                                <TableHeader className="bg-slate-50/80 dark:bg-[#191914]">
                                    <TableRow className="border-b border-slate-200 dark:border-[#38382E]">
                                        <TableHead className="dark:text-[#EBE6DF]">Barang</TableHead>
                                        <TableHead className="w-[110px] text-right dark:text-[#EBE6DF]">Stok Ada</TableHead>
                                        <TableHead className="w-[120px] dark:text-[#EBE6DF]">Jumlah Pakai</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cart.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-28 text-center text-slate-500 dark:text-[#A6A095]">
                                                Belum ada barang ditambahkan. Gunakan pencarian di atas untuk memilih barang.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        cart.map((item, index) => (
                                            <TableRow key={item.id} className="border-b border-slate-100 dark:border-[#38382E]/50">
                                                <TableCell>
                                                    <div className="font-medium text-slate-700 dark:text-[#EBE6DF]">{item.name}</div>
                                                    <div className="text-xs text-slate-500 dark:text-[#A6A095] mb-1 font-mono">{item.sku}</div>
                                                    <Input
                                                        placeholder="Catatan item khusus..."
                                                        className="h-7 text-xs dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]"
                                                        value={item.notes}
                                                        onChange={(e) => updateCartItem(index, 'notes', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right text-slate-500 dark:text-[#A6A095] whitespace-nowrap">
                                                    {item.qty_on_hand} {item.uom}
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        value={item.qty_used}
                                                        onChange={(e) => updateCartItem(index, 'qty_used', parseFloat(e.target.value))}
                                                        className={cn(
                                                            "h-8 text-right dark:bg-[#191914] dark:border-[#38382E] dark:text-[#EBE6DF]",
                                                            item.qty_used > item.qty_on_hand && "border-rose-500 focus-visible:ring-rose-500"
                                                        )}
                                                    />
                                                    {item.qty_used > item.qty_on_hand && (
                                                        <div className="text-[10px] text-rose-500 mt-1 font-semibold">Melebihi Stok!</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => removeCartItem(index)} className="text-slate-400 hover:text-rose-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>

                            <div className="flex justify-end mt-6 pt-4 border-t border-slate-100 dark:border-[#38382E]">
                                <Button
                                    onClick={handleSubmit}
                                    disabled={loading || cart.length === 0}
                                    className="bg-[#889D35] hover:bg-[#72842B] text-white min-w-[170px] font-medium shadow-sm"
                                >
                                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    <Save className="h-4 w-4 mr-2" />
                                    Simpan Pemakaian
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    )
}
