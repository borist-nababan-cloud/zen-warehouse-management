import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthUser } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Trash2, Save, Send, Lock, ArrowLeft, FileText } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog'

// Services & Hooks
import { createPurchaseOrder, getPurchaseOrderById, updatePurchaseOrderItems, createInvoice } from '@/services/purchaseOrderService'
import { useSuppliers } from '@/hooks/useSupplier'
import { MasterBarang, PurchaseOrder } from '@/types/database'
import { supabase } from '@/lib/supabase'

interface POItemRow {
    id: number // local temp id for React key (time based) OR real DB ID for edit
    db_id?: string // Real DB UUID if editing
    barang_id: number | null
    productName: string // for display/search
    sku: string
    qty: number
    unit: string // uom_purchase
    price: number
    conversion_rate: number
    subtotal: number
}

// Indonesian Thousand Formatter Helpers
const formatThousand = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0'
    return new Intl.NumberFormat('id-ID').format(val)
}

const parseThousand = (val: string) => {
    const raw = val.replace(/\D/g, '')
    return raw ? parseInt(raw, 10) : 0
}

export function PurchaseOrderCreatePage() {
    const navigate = useNavigate()
    const { id } = useParams() // Check for Edit Mode
    const { user } = useAuthUser()

    const isEditMode = Boolean(id)

    // -- State --
    const [docNumber, setDocNumber] = useState('')
    const [isGeneratingNo, setIsGeneratingNo] = useState(true)
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
    const [expectedDate, setExpectedDate] = useState('')
    const [roNumber, setRoNumber] = useState('')
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState<POItemRow[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [existingPo, setExistingPo] = useState<PurchaseOrder | null>(null)

    const isReadOnly = existingPo?.status === 'PARTIAL' || existingPo?.status === 'COMPLETED' || existingPo?.status === 'CANCELLED' || existingPo?.status === 'INVOICED'

    // Invoice Specific State
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)
    const [invNumber, setInvNumber] = useState('')
    const [invDueDate, setInvDueDate] = useState('')
    const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)

    // -- Data Fetching --
    const { data: suppliersData } = useSuppliers(user?.kode_outlet || '')
    const suppliers = suppliersData?.data || []

    const [products, setProducts] = useState<MasterBarang[]>([])

    // Load Products
    useEffect(() => {
        if (user?.kode_outlet) {
            loadProducts(user.kode_outlet)
        }
    }, [user?.kode_outlet])

    // Load Existing PO (Edit Mode)
    useEffect(() => {
        if (isEditMode && id) {
            loadPoForEdit(id)
            setIsGeneratingNo(false)
        }
    }, [isEditMode, id])

    // Load Next PO Number (RPC) - ONLY if Not Edit Mode
    useEffect(() => {
        if (!isEditMode && user?.kode_outlet) {
            fetchNextPoNumber(user.kode_outlet)
        }
    }, [isEditMode, user?.kode_outlet])

    async function loadPoForEdit(poId: string) {
        setIsSubmitting(true)
        const res = await getPurchaseOrderById(poId)
        if (res.data) {
            const po = res.data
            setExistingPo(po)
            setDocNumber(po.document_number)
            setSelectedSupplierId(po.kode_supplier)
            setExpectedDate(po.expected_delivery_date || '')
            setRoNumber(po.ro_number || '')
            setNotes(po.notes || '')

            // Map items
            if (po.purchase_order_items) {
                const mappedItems: POItemRow[] = po.purchase_order_items.map(i => ({
                    id: Date.now() + Math.random(),
                    db_id: i.id,
                    barang_id: i.barang_id,
                    productName: i.master_barang?.name || 'Tidak Diketahui',
                    sku: i.master_barang?.sku || '',
                    qty: i.qty_ordered,
                    unit: i.uom_purchase,
                    price: i.price_per_unit,
                    conversion_rate: i.conversion_rate,
                    subtotal: i.qty_ordered * i.price_per_unit
                }))
                setItems(mappedItems)
            }

            // Check Status Restriction
            if (po.status !== 'DRAFT' && po.status !== 'ISSUED') {
                toast.warning(`PO ini berstatus ${po.status}. Anda dapat melihat rincian tetapi tidak dapat mengubah data.`)
            }
        } else {
            toast.error('Gagal memuat data PO')
            navigate('/procurement/purchase-orders')
        }
        setIsSubmitting(false)
    }

    async function fetchNextPoNumber(outletCode: string) {
        setIsGeneratingNo(true)
        try {
            const { data, error } = await supabase.rpc('get_next_po_number', { outlet_code: outletCode })
            if (error) throw error
            if (data) setDocNumber(data)
        } catch (err) {
            console.error('Failed to generate PO Number:', err)
            toast.error('Gagal membuat Nomor PO otomatis')
        } finally {
            setIsGeneratingNo(false)
        }
    }

    async function loadProducts(outletCode: string) {
        const { data } = await supabase
            .from('master_barang')
            .select('*')
            .eq('kode_outlet', outletCode)
            .eq('deleted', false)
            .order('name')

        if (data) setProducts(data)
    }

    // -- Handlers --
    const handleAddItem = () => {
        setItems([
            ...items,
            {
                id: Date.now(),
                barang_id: null,
                productName: '',
                sku: '',
                qty: 1,
                unit: 'PCS',
                price: 0,
                conversion_rate: 1,
                subtotal: 0,
            },
        ])
    }

    const handleRemoveItem = (id: number) => {
        setItems(items.filter((i) => i.id !== id))
    }

    const handleProductChange = async (rowId: number, productIdStr: string) => {
        const productId = Number(productIdStr)
        const product = products.find((p) => p.id === productId)
        if (!product) return

        // Fetch Unit Info for this product (conversion rate)
        let convRate = 1
        let purchaseUom = 'PCS'

        // Check barang_units
        const { data: unitData } = await supabase
            .from('barang_units')
            .select('conversion_rate, purchase_uom, base_uom')
            .eq('barang_id', productId)
            .eq('kode_outlet', user?.kode_outlet)
            .maybeSingle()

        // Check barang_prices for buy_price
        const { data: priceData } = await supabase
            .from('barang_prices')
            .select('buy_price')
            .eq('barang_id', productId)
            .eq('kode_outlet', user?.kode_outlet)
            .maybeSingle()

        if (unitData) {
            convRate = unitData.conversion_rate || 1
            purchaseUom = unitData.purchase_uom || unitData.base_uom || 'PCS'
        }

        let buyPrice = 0
        if (priceData) {
            buyPrice = priceData.buy_price || 0
        }

        setItems((prev) =>
            prev.map((item) =>
                item.id === rowId
                    ? {
                        ...item,
                        barang_id: productId,
                        productName: product.name || '',
                        sku: product.sku || '',
                        unit: purchaseUom,
                        conversion_rate: convRate,
                        price: buyPrice,
                        subtotal: item.qty * buyPrice,
                    }
                    : item
            )
        )
    }

    const handleItemChange = (rowId: number, field: keyof POItemRow, value: any) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== rowId) return item

                const updated = { ...item, [field]: value }

                // Auto-calc subtotal
                if (field === 'qty' || field === 'price') {
                    updated.subtotal = Number(updated.qty || 0) * Number(updated.price || 0)
                }
                return updated
            })
        )
    }

    const calculateGrandTotal = () => {
        return items.reduce((sum, item) => sum + item.subtotal, 0)
    }

    const handleSubmit = async (status: 'DRAFT' | 'ISSUED') => {
        if (!user?.kode_outlet) {
            toast.error('Kode outlet pengguna tidak ditemukan')
            return
        }
        if (!selectedSupplierId) {
            toast.error('Silakan pilih pemasok terlebih dahulu')
            return
        }
        if (items.length === 0) {
            toast.error('Harap tambahkan minimal satu barang pesanan')
            return
        }

        const isReadOnlyMode = existingPo && (existingPo.status !== 'DRAFT' && existingPo.status !== 'ISSUED')
        if (isReadOnlyMode) {
            toast.error('Tidak dapat mengubah PO ini karena statusnya sudah dikunci')
            return
        }

        // Validate items
        const invalidItems = items.filter(i => !i.barang_id || i.qty <= 0)
        if (invalidItems.length > 0) {
            toast.error('Harap lengkapi item yang belum valid (pilihan produk atau jumlah)')
            return
        }

        setIsSubmitting(true)
        try {
            // Prepare Items Data
            const itemsData = items.map(item => ({
                id: item.db_id, // Pass DB ID if exists (for Update)
                barang_id: item.barang_id!,
                qty_ordered: item.qty,
                uom_purchase: item.unit,
                conversion_rate: item.conversion_rate,
                price_per_unit: item.price,
            }))

            if (isEditMode && id) {
                // --- UPDATE MODE ---
                const result = await updatePurchaseOrderItems(id, {
                    total_amount: calculateGrandTotal(),
                    status: status,
                    ro_number: roNumber,
                    notes: notes
                }, itemsData)

                if (result.isSuccess) {
                    toast.success('Pesanan Pembelian (PO) berhasil diperbarui!')
                    navigate('/procurement/purchase-orders')
                } else {
                    toast.error(result.error || 'Gagal memperbarui Pesanan Pembelian')
                }

            } else {
                // --- CREATE MODE ---
                const headerData = {
                    document_number: docNumber,
                    kode_supplier: selectedSupplierId,
                    kode_outlet: user.kode_outlet,
                    total_amount: calculateGrandTotal(),
                    expected_delivery_date: expectedDate || new Date().toISOString().split('T')[0],
                    status: status,
                    created_by: user.id,
                    ro_number: roNumber,
                    notes: notes
                }

                const payloadItems = items.map(item => ({
                    barang_id: item.barang_id!,
                    qty_ordered: item.qty,
                    uom_purchase: item.unit,
                    conversion_rate: item.conversion_rate,
                    price_per_unit: item.price,
                }))

                const result = await createPurchaseOrder(headerData, payloadItems)

                if (result.isSuccess) {
                    toast.success(`Pesanan Pembelian berhasil ${status === 'DRAFT' ? 'disimpan sebagai draf' : 'diterbitkan'}!`)
                    fetchNextPoNumber(user.kode_outlet)
                    setItems([])
                    setSelectedSupplierId('')
                    setRoNumber('')
                    setNotes('')
                } else {
                    if (result.error && (result.error.includes('duplicate key') || result.error.includes('23505'))) {
                        toast.warning('Nomor dokumen sudah digunakan. Menghasilkan nomor baru...')
                        await fetchNextPoNumber(user.kode_outlet)
                    } else {
                        toast.error(result.error || 'Gagal membuat Pesanan Pembelian')
                    }
                }
            }

        } catch (err) {
            console.error(err)
            toast.error('Terjadi kesalahan yang tidak diharapkan')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCreateInvoice = async () => {
        if (!invNumber || !invDueDate) {
            toast.error('Harap lengkapi semua bidang rincian faktur')
            return
        }
        if (!id) return

        setIsCreatingInvoice(true)
        const result = await createInvoice(id, invNumber, invDueDate)
        setIsCreatingInvoice(false)

        if (result.isSuccess) {
            toast.success('Faktur pembelian berhasil dibuat!')
            setIsInvoiceDialogOpen(false)
            loadPoForEdit(id)
        } else {
            toast.error(result.error || 'Gagal membuat faktur pembelian')
        }
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-6xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/procurement/purchase-orders')} className="hover:bg-primary/10">
                            <ArrowLeft className="w-5 h-5 text-primary" />
                        </Button>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                {isEditMode ? 'Ubah Pesanan Pembelian (PO)' : 'Buat Pesanan Pembelian (PO)'}
                            </h1>
                            <p className="text-muted-foreground mt-1 text-sm">
                                {isEditMode ? 'Perbarui rincian dokumen pesanan pembelian yang sudah ada.' : 'Terbitkan pesanan pembelian resmi kepada pemasok.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Header Form */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="bg-primary/5 pb-4 border-b border-border/40">
                        <CardTitle className="text-base font-semibold text-primary">Informasi Dokumen PO</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Document Number */}
                            <div>
                                <Label htmlFor="doc_number" className="text-sm font-medium">Nomor Dokumen PO</Label>
                                <Input
                                    id="doc_number"
                                    value={isGeneratingNo ? 'Menghasilkan nomor...' : docNumber}
                                    readOnly={true}
                                    className="mt-2 font-mono bg-muted text-muted-foreground"
                                />
                            </div>

                            {/* RO Number */}
                            <div>
                                <Label htmlFor="ro_number" className="text-sm font-medium">Nomor RO</Label>
                                <Input
                                    id="ro_number"
                                    value={roNumber}
                                    onChange={(e) => setRoNumber(e.target.value)}
                                    placeholder="Opsional (misal: RO-001)"
                                    className="mt-2"
                                    disabled={isReadOnly}
                                />
                            </div>

                            {/* Supplier */}
                            <div className="md:col-span-1">
                                <Label className="text-sm font-medium">Pemasok</Label>
                                <Select
                                    value={selectedSupplierId}
                                    onValueChange={setSelectedSupplierId}
                                    disabled={isEditMode}
                                >
                                    <SelectTrigger className={`mt-2 ${isEditMode ? 'bg-muted opacity-100' : ''}`}>
                                        <SelectValue placeholder="Pilih Pemasok" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map(s => (
                                            <SelectItem key={s.kode_supplier} value={s.kode_supplier}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Delivery Date */}
                            <div>
                                <Label htmlFor="date" className="text-sm font-medium">Perkiraan Pengiriman</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={expectedDate}
                                    onChange={e => setExpectedDate(e.target.value)}
                                    className="mt-2"
                                    disabled={isReadOnly}
                                />
                            </div>

                        </div>
                    </CardContent>
                </Card>

                {/* Items Table */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between bg-primary/5 pb-4 border-b border-border/40">
                        <CardTitle className="text-base font-semibold text-primary">Daftar Barang Pesanan</CardTitle>
                        {!isReadOnly && (
                            <Button size="sm" onClick={handleAddItem} variant="outline" className="border-primary/40 hover:bg-primary/10 text-primary">
                                <Plus className="w-4 h-4 mr-2" />
                                Tambah Barang
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-[35%] font-medium">Barang / Produk</TableHead>
                                    <TableHead className="w-[12%] font-medium">Jumlah</TableHead>
                                    <TableHead className="w-[10%] font-medium">Satuan</TableHead>
                                    <TableHead className="w-[20%] font-medium text-right">Harga / Satuan</TableHead>
                                    <TableHead className="w-[18%] font-medium text-right">Subtotal</TableHead>
                                    <TableHead className="w-[5%]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                                            Belum ada barang pesanan. Klik "Tambah Barang" untuk memulai.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <SearchableSelect
                                                value={item.barang_id ? String(item.barang_id) : ''}
                                                onChange={(val: string) => handleProductChange(item.id, val)}
                                                disabled={isReadOnly}
                                                placeholder="Pilih Produk / Bahan Baku"
                                                options={products.map(p => ({
                                                    value: String(p.id),
                                                    label: p.name || 'Tidak Diketahui',
                                                    subLabel: p.sku || ''
                                                }))}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.qty}
                                                onChange={(e) => handleItemChange(item.id, 'qty', Math.max(1, Number(e.target.value)))}
                                                className="h-9"
                                                disabled={isReadOnly}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center h-9 px-3 bg-muted/50 rounded-md text-sm border border-border/40 text-muted-foreground">
                                                {item.unit}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="text"
                                                inputMode="numeric"
                                                value={formatThousand(item.price)}
                                                onChange={(e) => handleItemChange(item.id, 'price', parseThousand(e.target.value))}
                                                className="h-9 text-right font-mono text-sm"
                                                disabled={isReadOnly}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium font-mono text-sm">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.subtotal)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleRemoveItem(item.id)}
                                                disabled={isReadOnly}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Footer Totals */}
                        <div className="flex justify-end p-6 bg-muted/20 border-t border-border/40">
                            <div className="text-right">
                                <span className="text-muted-foreground mr-4 text-sm font-medium">Total Pesanan:</span>
                                <span className="text-2xl font-bold text-primary font-mono">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(calculateGrandTotal())}
                                </span>
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className="mt-4 px-6 pb-6">
                            <Label htmlFor="notes" className="text-sm font-medium">Catatan</Label>
                            <Textarea
                                id="notes"
                                placeholder="Tambahkan catatan untuk pesanan ini..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="mt-2"
                                rows={3}
                                disabled={isReadOnly}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                    {!isReadOnly ? (
                        <>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => handleSubmit('DRAFT')}
                                disabled={isSubmitting}
                                className="border-border/80"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Simpan Draf
                            </Button>
                            <Button
                                size="lg"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                                onClick={() => handleSubmit('ISSUED')}
                                disabled={isSubmitting}
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Terbitkan PO
                            </Button>
                        </>
                    ) : (
                        <div className="text-muted-foreground italic flex items-center text-sm">
                            <Lock className="w-4 h-4 mr-2" />
                            Pesanan ini berstatus {existingPo?.status} dan tidak dapat diubah.
                        </div>
                    )}

                    {/* Invoice Link / Create Button */}
                    {isEditMode && existingPo?.status !== 'DRAFT' && existingPo?.status !== 'INVOICED' && (
                        <div className="ml-2 pl-3 border-l border-border">
                            <Button
                                variant="secondary"
                                className="bg-primary/10 text-primary hover:bg-primary/20"
                                onClick={() => setIsInvoiceDialogOpen(true)}
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Buat Faktur
                            </Button>
                        </div>
                    )}

                    {existingPo?.status === 'INVOICED' && (
                        <div className="ml-2 pl-3 border-l border-border">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                <FileText className="w-3.5 h-3.5 mr-1" />
                                Sudah Ditagih
                            </span>
                        </div>
                    )}
                </div>

                {/* Create Invoice Dialog */}
                <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Buat Faktur Pembelian (Invoice)</DialogTitle>
                            <DialogDescription>
                                Masukkan rincian faktur dari pemasok untuk memproses penagihan pesanan pembelian ini.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="inv-no">Nomor Faktur Pemasok</Label>
                                <Input
                                    id="inv-no"
                                    value={invNumber}
                                    onChange={(e) => setInvNumber(e.target.value)}
                                    placeholder="misal: INV-2026-001"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="inv-due">Tanggal Jatuh Tempo Pembayaran</Label>
                                <Input
                                    id="inv-due"
                                    type="date"
                                    value={invDueDate}
                                    onChange={(e) => setInvDueDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>Batal</Button>
                            <Button onClick={handleCreateInvoice} disabled={isCreatingInvoice} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                {isCreatingInvoice ? 'Menyimpan...' : 'Simpan Faktur'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </DashboardLayout>
    )
}
