import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { getCompletedPurchaseOrders, createPurchaseInvoice } from '@/services/purchaseInvoiceService'
import { getPoDetailsFromView } from '@/services/goodsReceiptService'
import { PurchaseOrder, ViewPoDetailsReceived } from '@/types/database'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/Sidebar'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Simple Custom Modal Component to avoid missing dependency
function SimpleModal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    if (!isOpen) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-lg">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 max-h-[85vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    )
}
import { FileText, Loader2, Calendar as CalendarIcon } from 'lucide-react'

export function InvoicingPoPage() {
    const { user } = useAuthUser()

    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Modal State
    const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null)
    const [poDetails, setPoDetails] = useState<ViewPoDetailsReceived[]>([])
    const [isDetailsLoading, setIsDetailsLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Form State
    const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('')
    const [dueDate, setDueDate] = useState<string>('')
    const [shippingCost, setShippingCost] = useState<number>(0)

    const fetchOrders = async (outletCode: string) => {
        setIsLoading(true)
        try {
            const result = await getCompletedPurchaseOrders(outletCode)
            if (result.isSuccess && result.data) {
                setOrders(result.data)
            } else {
                toast.error(result.error || "Gagal memuat daftar pesanan")
            }
        } catch (error) {
            toast.error('Terjadi kesalahan yang tidak terduga')
        } finally {
            setIsLoading(false)
        }
    }

    const fetchPoDetails = async (poId: string) => {
        setIsDetailsLoading(true)
        try {
            const result = await getPoDetailsFromView(poId)
            if (result.isSuccess && result.data) {
                setPoDetails(result.data)
            } else {
                toast.error(result.error || "Gagal memuat rincian PO")
            }
        } catch (error) {
            toast.error('Terjadi kesalahan yang tidak terduga')
        } finally {
            setIsDetailsLoading(false)
        }
    }

    useEffect(() => {
        if (user?.kode_outlet) {
            fetchOrders(user.kode_outlet)
        }
    }, [user?.kode_outlet])

    const handleOpenModal = (po: PurchaseOrder) => {
        setSelectedPo(po)
        setSupplierInvoiceNumber('')
        setDueDate('')
        setShippingCost(0)
        setPoDetails([]) // Reset previous details
        setIsModalOpen(true)
        fetchPoDetails(po.id)
    }

    const handleSubmitInvoice = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPo || !supplierInvoiceNumber || !dueDate) {
            toast.error('Harap lengkapi seluruh kolom wajib')
            return
        }

        if (!confirm('Apakah Anda yakin ingin menerbitkan Faktur ini? Tindakan ini tidak dapat dibatalkan.')) return

        setIsSubmitting(true)
        const result = await createPurchaseInvoice({
            target_po_id: selectedPo.id,
            supplier_inv_ref: supplierInvoiceNumber,
            payment_due_date: dueDate, // Already in YYYY-MM-DD from input type="date"
            user_id: user?.id || '', // Pass user_id from auth context
            shipping_cost_input: shippingCost
        })

        if (result.isSuccess) {
            toast.success(`Faktur berhasil dibuat! Total: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(result.data))}`)
            setIsModalOpen(false)
            // Refresh list
            if (user?.kode_outlet) fetchOrders(user.kode_outlet)
        } else {
            toast.error(`Gagal membuat faktur: ${result.error}`)
        }
        setIsSubmitting(false)
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Faktur Pembelian (PO)</h1>
                        <p className="text-muted-foreground mt-1">
                            Proses Pesanan Pembelian (PO) yang telah selesai diterima menjadi Faktur Pembelian untuk pembayaran.
                        </p>
                    </div>
                </div>

                <Card className="border-pastel-blue/20 shadow-sm bg-white/50 backdrop-blur-sm">
                    <CardHeader className="bg-pastel-blue/10">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Siap Diterbitkan Faktur
                        </CardTitle>
                        <CardDescription>
                            Pesanan di bawah ini telah selesai diterima dan menunggu pembuatan faktur pembelian.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>No. PO</TableHead>
                                    <TableHead>Pemasok (Supplier)</TableHead>
                                    <TableHead>Tanggal Dibuat</TableHead>
                                    <TableHead>Estimasi Total</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Memuat data pesanan...
                                        </TableCell>
                                    </TableRow>
                                ) : orders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Tidak ada pesanan selesai yang menunggu pembuatan faktur.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    orders.map((po) => (
                                        <TableRow key={po.id}>
                                            <TableCell className="font-mono font-medium">{po.document_number}</TableCell>
                                            <TableCell>{po.master_supplier?.name || '-'}</TableCell>
                                            <TableCell>{po.created_at ? new Date(po.created_at).toLocaleDateString('id-ID') : '-'}</TableCell>
                                            <TableCell>
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(po.total_amount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200 shadow-sm"
                                                    onClick={() => handleOpenModal(po)}
                                                >
                                                    Buat Faktur
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Custom Modal for Invoice Creation */}
                <SimpleModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title="Buat Faktur Pembelian"
                >
                    <div className="space-y-4">
                        <div className="rounded-md border p-4 bg-muted/20">
                            <h4 className="font-semibold mb-2 text-sm text-foreground">Ringkasan PO: {selectedPo?.document_number}</h4>

                            {isDetailsLoading ? (
                                <div className="text-center py-4 text-sm text-muted-foreground">Memuat rincian...</div>
                            ) : (
                                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead>Barang</TableHead>
                                                <TableHead className="text-right">Jml PO</TableHead>
                                                <TableHead className="text-right">Jml Diterima</TableHead>
                                                <TableHead className="text-right">Harga / Satuan</TableHead>
                                                <TableHead className="text-right">Total (PO)</TableHead>
                                                <TableHead className="text-right">Total (Aktual)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {poDetails.map((item) => (
                                                <TableRow key={item.po_item_id}>
                                                    <TableCell className="font-medium">
                                                        {item.item_name}
                                                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {item.qty_ordered} {item.uom_purchase}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-blue-600">
                                                        {item.qty_already_received} {item.uom_purchase}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.price_per_unit || 0)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.total_price_po || 0)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-green-700">
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.total_price_received || 0)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {/* Shipping Cost Row */}
                                            <TableRow className="bg-muted/10">
                                                <TableCell colSpan={4} className="text-right font-medium">Ongkos Kirim</TableCell>
                                                <TableCell className="text-right text-muted-foreground">-</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(shippingCost)}
                                                </TableCell>
                                            </TableRow>
                                            {/* Summary Row */}
                                            <TableRow className="bg-muted/30 font-bold border-t-2">
                                                <TableCell colSpan={4} className="text-right">Total Keseluruhan</TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                                                        poDetails.reduce((sum, item) => sum + (item.total_price_po || 0), 0)
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-green-700 text-lg">
                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                                                        poDetails.reduce((sum, item) => sum + (item.total_price_received || 0), 0) + shippingCost
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>

                        <span className="text-xs text-yellow-600 font-medium bg-yellow-50 px-2 py-1 rounded inline-block">
                            Perhatian: Tindakan ini akan mengunci dokumen PO dan memperbarui nilai inventaris.
                        </span>
                    </div>

                    <form onSubmit={handleSubmitInvoice} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="supplier_inv">Nomor Faktur Pemasok (Invoice Supplier)</Label>
                            <Input
                                id="supplier_inv"
                                placeholder="Contoh: INV-2025-001"
                                value={supplierInvoiceNumber}
                                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="due_date">Tanggal Jatuh Tempo Pembayaran</Label>
                            <div className="relative">
                                <Input
                                    id="due_date"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    required
                                    className="pl-10"
                                />
                                <CalendarIcon className="h-4 w-4 absolute left-3 top-3 text-gray-500" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="shipping_cost">Ongkos Kirim (Opsional)</Label>
                            <Input
                                id="shipping_cost"
                                type="number"
                                min="0"
                                placeholder="0"
                                value={shippingCost}
                                onChange={(e) => setShippingCost(Number(e.target.value))}
                            />
                            <p className="text-xs text-muted-foreground">Biaya pengiriman atau ekspedisi tambahan.</p>
                        </div>

                        <div className="pt-4 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Terbitkan Faktur
                            </Button>
                        </div>
                    </form>
                </SimpleModal>
            </div >
        </DashboardLayout >
    )
}
