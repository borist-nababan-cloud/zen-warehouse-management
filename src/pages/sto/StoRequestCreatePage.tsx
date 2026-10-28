import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Send, Package } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'

import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

import { useAuthUser } from '@/hooks/useAuth'
import { useMasterOutlet } from '@/hooks/useMasterOutlet'
import { useProductsByOutlet } from '@/hooks/useMasterBarang'
import { stoService } from '@/services/stoService'

interface StoRequestItemRow {
    barang_id: number
    sku: string
    name: string
    qty_requested: number
    uom: string
    notes: string
}

export default function StoRequestCreatePage() {
    const navigate = useNavigate()
    const { user, isLoading: isAuthLoading } = useAuthUser()
    const queryClient = useQueryClient()

    // Header State
    const [targetOutlet, setTargetOutlet] = useState<string>('')
    const [requestDate, setRequestDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
    const [notes, setNotes] = useState<string>('')

    // Item Entry State
    const [selectedProductId, setSelectedProductId] = useState<string>('')
    const [qtyInput, setQtyInput] = useState<number>(0)
    const [itemNotesInput, setItemNotesInput] = useState<string>('')

    // Items List
    const [items, setItems] = useState<StoRequestItemRow[]>([])

    // Data Fetching
    const { data: outlets } = useMasterOutlet(true)
    const { data: products } = useProductsByOutlet(user?.kode_outlet || '')

    const createRequestMutation = useMutation({
        mutationFn: (params: Parameters<typeof stoService.createStoRequest>[0]) => stoService.createStoRequest(params),
        onSuccess: (created) => {
            toast.success(`Request Kirim Barang (${created.document_number}) berhasil diajukan`)
            queryClient.invalidateQueries({ queryKey: ['sto_requests'] })
            navigate('/sto/requests')
        },
        onError: (error: any) => {
            toast.error(error.message || 'Gagal mengajukan dokumen Request Kirim Barang')
        }
    })

    const isSubmitting = createRequestMutation.isPending

    const handleAddItem = () => {
        if (!selectedProductId || qtyInput <= 0) return

        const product = products?.data?.find(p => p.id.toString() === selectedProductId)
        if (!product) return

        const existingIndex = items.findIndex(i => i.barang_id === product.id)
        if (existingIndex >= 0) {
            const newItems = [...items]
            newItems[existingIndex].qty_requested += qtyInput
            if (itemNotesInput.trim()) {
                newItems[existingIndex].notes = itemNotesInput.trim()
            }
            setItems(newItems)
        } else {
            setItems(prev => [
                ...prev,
                {
                    barang_id: product.id,
                    sku: product.sku || '-',
                    name: product.name || 'Produk Tanpa Nama',
                    qty_requested: qtyInput,
                    uom: product.barang_units?.[0]?.purchase_uom || 'PCS',
                    notes: itemNotesInput.trim()
                }
            ])
        }

        setSelectedProductId('')
        setQtyInput(0)
        setItemNotesInput('')
    }

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = () => {
        if (!user || !user.kode_outlet) {
            toast.error('Outlet pengguna tidak terdefinisi')
            return
        }
        if (!targetOutlet) {
            toast.error('Silakan pilih Outlet Tujuan Permintaan (Penyedia Barang)')
            return
        }
        if (items.length === 0) {
            toast.error('Silakan tambahkan minimal satu barang yang diminta')
            return
        }

        createRequestMutation.mutate({
            requesting_outlet: user.kode_outlet,
            target_outlet: targetOutlet,
            request_date: requestDate,
            notes: notes.trim() || null,
            items: items.map(item => ({
                barang_id: item.barang_id,
                qty_requested: item.qty_requested,
                uom: item.uom,
                notes: item.notes || undefined
            })),
            created_by: user.id
        })
    }

    if (isAuthLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-screen items-center justify-center">
                    <p className="text-muted-foreground text-sm">Memuat data pengguna...</p>
                </div>
            </DashboardLayout>
        )
    }

    const totalQty = items.reduce((sum, item) => sum + item.qty_requested, 0)

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto pb-20">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/sto/requests')}
                        className="text-zen-charcoal hover:bg-zen-sand/20"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold font-serif tracking-tight text-zen-charcoal">
                            Buat Request Kirim Barang (STO)
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Ajukan permintaan pengiriman stok barang kepada outlet lain (seperti PO antar outlet)
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* LEFT COLUMN - FORM */}
                    <div className="md:col-span-2 space-y-6">
                        {/* 1. TUJUAN PERMINTAAN */}
                        <Card className="border-t-4 border-t-zen-moss border-zen-border shadow-xs">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <Send className="h-5 w-5 text-zen-moss" />
                                    <CardTitle className="text-base font-semibold text-zen-charcoal">
                                        Detail Permintaan & Outlet Tujuan
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-zen-charcoal">
                                            Outlet Pemohon (Meminta Barang)
                                        </Label>
                                        <Input
                                            value={user?.outlet?.name_outlet || user?.kode_outlet || '-'}
                                            disabled
                                            className="bg-muted/60"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-zen-charcoal">
                                            Outlet Tujuan Permintaan (Penyedia) *
                                        </Label>
                                        <Select value={targetOutlet} onValueChange={setTargetOutlet}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih Outlet yang Dimintai Barang" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {outlets
                                                    ?.filter(o => o.kode_outlet !== user?.kode_outlet)
                                                    .map(outlet => (
                                                        <SelectItem key={outlet.kode_outlet} value={outlet.kode_outlet}>
                                                            [{outlet.kode_outlet}] {outlet.name_outlet}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-zen-charcoal">Tanggal Request *</Label>
                                        <Input
                                            type="date"
                                            value={requestDate}
                                            onChange={e => setRequestDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-zen-charcoal">
                                            Catatan Permintaan (Opsional)
                                        </Label>
                                        <Textarea
                                            placeholder="Cth: Permintaan stok mingguan atau kebutuhan mendesak..."
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            className="h-10 min-h-[40px]"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. DAFTAR BARANG DIMINTA */}
                        <Card className="border-t-4 border-t-zen-matcha border-zen-border shadow-xs">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <Package className="h-5 w-5 text-zen-moss" />
                                    <CardTitle className="text-base font-semibold text-zen-charcoal">
                                        Daftar Barang yang Diminta
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Add Item Row - Anti-Squish Flexbox */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 p-3.5 bg-zen-sand/10 dark:bg-zen-stone/40 rounded-xl border border-zen-border">
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <Label className="text-xs font-semibold text-zen-charcoal">
                                            Pilih Produk / Barang
                                        </Label>
                                        <SearchableSelect
                                            value={selectedProductId}
                                            onChange={setSelectedProductId}
                                            placeholder="Cari atau pilih barang..."
                                            options={
                                                products?.data?.map(p => ({
                                                    value: p.id.toString(),
                                                    label: `${p.sku || 'No SKU'} - ${p.name}`,
                                                    subLabel: p.name || ''
                                                })) || []
                                            }
                                        />
                                    </div>
                                    <div className="w-full sm:w-28 shrink-0 space-y-1.5">
                                        <Label className="text-xs font-semibold text-zen-charcoal">Jumlah (Qty)</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={qtyInput <= 0 ? '' : qtyInput}
                                            onChange={e => setQtyInput(Math.max(0, Number(e.target.value)))}
                                            placeholder="0"
                                            className="w-full font-mono text-center"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={handleAddItem}
                                        disabled={!selectedProductId || qtyInput <= 0}
                                        className="shrink-0 bg-zen-moss hover:bg-zen-moss/90 text-white font-medium px-4 h-9"
                                    >
                                        <Plus className="h-4 w-4 mr-1.5" /> Tambah
                                    </Button>
                                </div>

                                {/* Items Table */}
                                <div className="rounded-xl border border-zen-border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40">
                                                <TableHead className="w-[110px]">SKU</TableHead>
                                                <TableHead>Nama Barang</TableHead>
                                                <TableHead className="text-right w-[100px]">Qty Diminta</TableHead>
                                                <TableHead className="text-center w-[90px]">Satuan</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.length === 0 ? (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={5}
                                                        className="text-center h-24 text-muted-foreground text-sm"
                                                    >
                                                        Belum ada barang yang ditambahkan ke dalam daftar permintaan.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                items.map((item, index) => (
                                                    <TableRow key={`${item.barang_id}-${index}`}>
                                                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                                        <TableCell className="font-medium text-zen-charcoal">
                                                            {item.name}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold font-mono">
                                                            {item.qty_requested}
                                                        </TableCell>
                                                        <TableCell className="text-center text-muted-foreground font-mono text-xs">
                                                            {item.uom}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                                onClick={() => handleRemoveItem(index)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
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
                    </div>

                    {/* RIGHT COLUMN - SUMMARY */}
                    <div className="space-y-6">
                        <Card className="shadow-xs border-zen-border sticky top-6">
                            <CardHeader className="bg-zen-sand/10 dark:bg-zen-stone/40 border-b border-zen-border pb-4">
                                <CardTitle className="text-base font-semibold text-zen-charcoal">
                                    Ringkasan Request Barang
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Jumlah Jenis Barang</span>
                                    <span className="font-mono font-medium">{items.length} Item</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Kuantitas Diminta</span>
                                    <span className="font-mono font-bold text-zen-moss dark:text-zen-matcha">
                                        {totalQty}
                                    </span>
                                </div>
                                <Separator />

                                <Button
                                    className="w-full mt-4 bg-zen-moss hover:bg-zen-moss/90 text-white font-medium"
                                    size="lg"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || items.length === 0}
                                >
                                    {isSubmitting ? 'Mengajukan Request...' : 'Kirim Permintaan Barang'}
                                </Button>

                                <p className="text-xs text-center text-muted-foreground mt-2 leading-relaxed">
                                    Dokumen Request ini akan muncul di outlet tujuan sebagai referensi nomor permintaan pada halaman <strong>Kirim Barang Ke Outlet (STO)</strong>.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
