import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Truck, Package, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'

import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

// Helper for formatting IDR
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

interface StoItemRow {
    barang_id: number
    sku: string
    name: string
    price_unit: number
    qty_requested: number
    uom: string
}

export default function StoCreatePage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { user, isLoading: isAuthLoading } = useAuthUser()
    const queryClient = useQueryClient()

    // State
    const [toOutlet, setToOutlet] = useState<string>('')
    const [selectedRequestId, setSelectedRequestId] = useState<string>('NONE')
    const [shippingCost, setShippingCost] = useState<number>(0)

    // Item Entry State
    const [selectedProductId, setSelectedProductId] = useState<string>('')
    const [qtyInput, setQtyInput] = useState<number>(0)

    // Items List
    const [items, setItems] = useState<StoItemRow[]>([])

    // Data Fetching
    const { data: outlets } = useMasterOutlet(true)
    // Fetch products from the SENDER outlet (current user)
    const { data: products } = useProductsByOutlet(user?.kode_outlet || '')

    // Fetch open STO Requests addressed to this sender outlet
    const { data: openRequests = [] } = useQuery({
        queryKey: ['sto_requests', 'open_for_sender', user?.kode_outlet],
        queryFn: () => stoService.getOpenStoRequestsForSender(user?.kode_outlet || ''),
        enabled: !!user?.kode_outlet
    })

    // Pre-select from URL query params if navigated from Request List ("Proses Kirim STO")
    useEffect(() => {
        const paramReqId = searchParams.get('request_id')
        const paramToOutlet = searchParams.get('to_outlet')
        if (paramToOutlet && !toOutlet) {
            setToOutlet(paramToOutlet)
        }
        if (paramReqId && selectedRequestId === 'NONE') {
            setSelectedRequestId(paramReqId)
        }
    }, [searchParams])

    // Filter open requests if toOutlet is already selected, or show all open requests to this sender
    const availableRequests = useMemo(() => {
        if (!toOutlet) return openRequests
        return openRequests.filter(r => r.requesting_outlet === toOutlet)
    }, [openRequests, toOutlet])

    const selectedRequestObj = useMemo(() => {
        if (!selectedRequestId || selectedRequestId === 'NONE') return null
        return openRequests.find(r => r.id === selectedRequestId) || null
    }, [openRequests, selectedRequestId])

    // Handler when user picks a Request Number (STRICTLY LINK ONLY — DO NOT AUTO-INSERT ITEMS)
    const handleSelectRequest = (reqId: string) => {
        setSelectedRequestId(reqId)
        if (reqId !== 'NONE') {
            const req = openRequests.find(r => r.id === reqId)
            if (req && req.requesting_outlet && toOutlet !== req.requesting_outlet) {
                setToOutlet(req.requesting_outlet)
            }
        }
    }

    // Computed
    const subtotal = items.reduce((sum, item) => sum + (item.price_unit * item.qty_requested), 0)
    const grandTotal = subtotal + shippingCost

    // Mutations
    const createStoMutation = useMutation({
        mutationFn: stoService.createSto.bind(stoService),
        onSuccess: () => {
            toast.success('Dokumen STO Berhasil Dibuat')
            queryClient.invalidateQueries({ queryKey: ['sto_orders'] })
            queryClient.invalidateQueries({ queryKey: ['sto_requests'] })
            navigate('/sto')
        },
        onError: (error: any) => {
            toast.error(error.message || 'Gagal membuat dokumen STO')
        }
    })

    const isSubmitting = createStoMutation.isPending

    // Handlers
    const handleAddItem = () => {
        if (!selectedProductId || qtyInput <= 0) return

        const product = products?.data?.find(p => p.id.toString() === selectedProductId)
        if (!product) return

        // [STO Debug] Start
        // Find price for CURRENT outlet
        // Strict check: Must match user.kode_outlet
        const outletPrice = product.barang_prices?.find(p => p.kode_outlet === user?.kode_outlet)
        const resolvedPrice = outletPrice?.sell_price || 0

        // Check if item already exists
        const existingIndex = items.findIndex(i => i.barang_id === product.id)
        if (existingIndex >= 0) {
            // Update qty
            const newItems = [...items]
            newItems[existingIndex].qty_requested += qtyInput
            setItems(newItems)
        } else {
            // Add new
            setItems(prev => [...prev, {
                barang_id: product.id,
                sku: product.sku || '',
                name: product.name || 'Unknown',
                price_unit: resolvedPrice, // Use resolved price
                qty_requested: qtyInput,
                uom: product.barang_units?.[0]?.purchase_uom || 'PCS'
            }])
        }

        // Reset inputs
        setSelectedProductId('')
        setQtyInput(0)
    }

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = () => {
        if (!user || !user.kode_outlet) {
            toast.error('Outlet pengguna tidak terdefinisi')
            return
        }
        if (!toOutlet) {
            toast.error('Silakan pilih outlet tujuan pengiriman')
            return
        }
        if (items.length === 0) {
            toast.error('Silakan tambahkan minimal satu barang untuk dikirim')
            return
        }

        createStoMutation.mutate({
            from_outlet: user.kode_outlet,
            to_outlet: toOutlet,
            shipping_cost: shippingCost,
            sto_request_id: selectedRequestObj?.id || null,
            request_number: selectedRequestObj?.document_number || null,
            items: items.map(item => ({
                barang_id: item.barang_id,
                qty_requested: item.qty_requested,
                price_unit: item.price_unit
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

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto pb-20">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/sto')} className="text-zen-charcoal hover:bg-zen-sand/20">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold font-serif tracking-tight text-zen-charcoal">Kirim Barang Ke Outlet (STO)</h1>
                        <p className="text-muted-foreground text-sm">Buat pengiriman dan transfer stok barang ke outlet tujuan</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* LEFT COLUMN - FORM */}
                    <div className="md:col-span-2 space-y-6">

                        {/* 1. ALLOCATION */}
                        <Card className="border-t-4 border-t-zen-moss border-zen-border shadow-xs">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <Truck className="h-5 w-5 text-zen-moss" />
                                    <CardTitle className="text-base font-semibold text-zen-charcoal">Detail Pengiriman & Alokasi</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-zen-charcoal">Outlet Pengirim (Asal)</Label>
                                        <Input value={user?.outlet?.name_outlet || user?.kode_outlet || '-'} disabled className="bg-muted/60" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-zen-charcoal">Outlet Penerima (Tujuan) *</Label>
                                        <Select
                                            value={toOutlet}
                                            onValueChange={(val) => {
                                                setToOutlet(val)
                                                if (selectedRequestObj && selectedRequestObj.requesting_outlet !== val) {
                                                    setSelectedRequestId('NONE')
                                                }
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih Outlet Tujuan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {outlets?.filter(o => o.kode_outlet !== user?.kode_outlet).map(outlet => (
                                                    <SelectItem key={outlet.kode_outlet} value={outlet.kode_outlet}>
                                                        {outlet.name_outlet}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Referensi No. Request Kirim Barang (Link Only - No Auto-Insert Items) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-zen-charcoal flex items-center gap-1.5">
                                            <FileText className="h-3.5 w-3.5 text-zen-moss" />
                                            Referensi No. Request Barang (Opsional)
                                        </Label>
                                        <Select value={selectedRequestId} onValueChange={handleSelectRequest}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih No. Request Barang (Jika Ada)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="NONE">-- Tanpa Referensi Request --</SelectItem>
                                                {availableRequests.map(req => (
                                                    <SelectItem key={req.id} value={req.id}>
                                                        {req.document_number} ({req.requesting_master_outlet?.name_outlet || req.requesting_outlet})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {selectedRequestObj && (
                                            <p className="text-[11px] text-muted-foreground">
                                                Terhubung ke <strong>{selectedRequestObj.document_number}</strong> ({selectedRequestObj.sto_request_items?.length || 0} jenis barang diminta). Silakan input barang yang dikirim secara manual di bawah.
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-zen-charcoal">Estimasi Ongkos Kirim (Rp)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={shippingCost === 0 ? '' : shippingCost}
                                            onChange={(e) => setShippingCost(Number(e.target.value))}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. ITEMS */}
                        <Card className="border-t-4 border-t-zen-matcha border-zen-border shadow-xs">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-zen-moss" />
                                        <CardTitle className="text-base font-semibold text-zen-charcoal">Daftar Barang yang Dikirim</CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Add Item Row - Responsive & Protected Against Qty Shrinkage */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 p-3.5 bg-zen-sand/10 dark:bg-zen-stone/40 rounded-xl border border-zen-border">
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <Label className="text-xs font-semibold text-zen-charcoal">Pilih Produk / Barang</Label>
                                        <SearchableSelect
                                            value={selectedProductId}
                                            onChange={setSelectedProductId}
                                            placeholder="Cari atau pilih barang..."
                                            options={products?.data?.map(p => ({
                                                value: p.id.toString(),
                                                label: `${p.sku || 'No SKU'} - ${p.name}`,
                                                subLabel: p.name || ''
                                            })) || []}
                                        />
                                    </div>
                                    <div className="w-full sm:w-28 shrink-0 space-y-1.5">
                                        <Label className="text-xs font-semibold text-zen-charcoal">Jumlah (Qty)</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={qtyInput <= 0 ? '' : qtyInput}
                                            onChange={(e) => setQtyInput(Math.max(0, Number(e.target.value)))}
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
                                                <TableHead className="text-right w-[120px]">Harga Satuan</TableHead>
                                                <TableHead className="text-right w-[80px]">Qty</TableHead>
                                                <TableHead className="text-center w-[80px]">Satuan</TableHead>
                                                <TableHead className="text-right w-[130px]">Subtotal</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground text-sm">
                                                        Belum ada barang yang ditambahkan.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                items.map((item, index) => (
                                                    <TableRow key={`${item.barang_id}-${index}`}>
                                                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                                        <TableCell className="font-medium text-zen-charcoal">{item.name}</TableCell>
                                                        <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatCurrency(item.price_unit)}</TableCell>
                                                        <TableCell className="text-right font-semibold">{item.qty_requested}</TableCell>
                                                        <TableCell className="text-center text-muted-foreground font-mono text-xs">{item.uom}</TableCell>
                                                        <TableCell className="text-right font-semibold font-mono">
                                                            {formatCurrency(item.price_unit * item.qty_requested)}
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
                                <CardTitle className="text-base font-semibold text-zen-charcoal">Ringkasan Pengiriman</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal Barang</span>
                                    <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Ongkos Kirim</span>
                                    <span className="font-mono font-medium">{formatCurrency(shippingCost)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-base text-zen-charcoal">Total Keseluruhan</span>
                                    <span className="font-bold text-lg text-zen-moss dark:text-zen-matcha font-mono">{formatCurrency(grandTotal)}</span>
                                </div>

                                <Button
                                    className="w-full mt-6 bg-zen-moss hover:bg-zen-moss/90 text-white font-medium"
                                    size="lg"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || items.length === 0}
                                >
                                    {isSubmitting ? 'Memproses Dokumen...' : 'Kirim Barang (Buat STO)'}
                                </Button>

                                <p className="text-xs text-center text-muted-foreground mt-2 leading-relaxed">
                                    Dokumen STO akan disimpan sebagai status <strong>DRAFT</strong> dan selanjutnya diproses pengeluarannya oleh tim Gudang.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
