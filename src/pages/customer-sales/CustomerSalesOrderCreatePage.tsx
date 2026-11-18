import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthUser } from '@/hooks/useAuth'
import { useCustomers } from '@/hooks/useCustomer'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { SearchableSelect } from '@/components/ui/searchable-select'
import { DecimalPriceInput } from '@/components/ui/decimal-price-input'
import { toast } from 'sonner'
import {
  Plus,
  Trash2,
  Save,
  Send,
  Lock,
  ArrowLeft,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import {
  customerSalesService,
  OutletProductStockPrice,
} from '@/services/customerSalesService'
import { CstSalesOrder } from '@/types/database'

interface SalesOrderItemRow {
  id: number
  barang_id: number | null
  productName: string
  sku: string
  qty_on_hand: number
  qty: number
  uom: string
  price: number
  subtotal: number
}

const roundCurrency = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100

const formatIdrCurrency = (val: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0)

export function CustomerSalesOrderCreatePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuthUser()
  const isEditMode = Boolean(id)

  const [docNumber, setDocNumber] = useState('')
  const [isGeneratingNo, setIsGeneratingNo] = useState(!isEditMode)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedDate, setExpectedDate] = useState('')
  const [shippingCost, setShippingCost] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<SalesOrderItemRow[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingOrder, setExistingOrder] = useState<CstSalesOrder | null>(null)
  const [catalog, setCatalog] = useState<OutletProductStockPrice[]>([])
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true)

  const { data: customersRes } = useCustomers(user?.kode_outlet || '')
  const customers = customersRes?.data || []

  const isReadOnly = Boolean(
    existingOrder && !['DRAFT', 'ISSUED'].includes(existingOrder.status)
  )

  const productMap = useMemo(() => {
    const map = new Map<number, OutletProductStockPrice>()
    catalog.forEach((entry) => map.set(entry.barang.id, entry))
    return map
  }, [catalog])

  useEffect(() => {
    if (user?.kode_outlet) {
      loadCatalog(user.kode_outlet)
    }
  }, [user?.kode_outlet])

  useEffect(() => {
    if (!isEditMode && user?.kode_outlet) {
      generateSoNo(user.kode_outlet)
    }
  }, [isEditMode, user?.kode_outlet])

  useEffect(() => {
    if (isEditMode && id && catalog.length > 0) {
      loadOrderForEdit(id)
    }
  }, [isEditMode, id, catalog.length])

  async function loadCatalog(outletCode: string) {
    setIsLoadingCatalog(true)
    try {
      const list = await customerSalesService.getOutletProductsWithStockAndPrice(outletCode)
      setCatalog(list)
    } catch (err: any) {
      console.error(err)
      toast.error('Gagal memuat daftar produk dan stok gerai')
    } finally {
      setIsLoadingCatalog(false)
    }
  }

  async function generateSoNo(outletCode: string) {
    setIsGeneratingNo(true)
    try {
      const nextNo = await customerSalesService.generateNextSoNumber(outletCode)
      setDocNumber(nextNo)
    } catch (err) {
      console.error(err)
      toast.error('Gagal membuat nomor dokumen SO otomatis')
    } finally {
      setIsGeneratingNo(false)
    }
  }

  async function loadOrderForEdit(orderId: string) {
    setIsSubmitting(true)
    const res = await customerSalesService.getSalesOrderById(orderId)
    if (res.isSuccess && res.data) {
      const so = res.data
      setExistingOrder(so)
      setDocNumber(so.document_number)
      setSelectedCustomerId(so.kode_customer)
      setOrderDate(so.order_date || new Date().toISOString().split('T')[0])
      setExpectedDate(so.expected_delivery_date || '')
      setShippingCost(roundCurrency(Number(so.shipping_cost || 0)))
      setNotes(so.notes || '')

      const mappedItems: SalesOrderItemRow[] = (so.cst_sales_order_items || []).map((it) => {
        const meta = productMap.get(it.barang_id)
        const qty = Number(it.qty_ordered || 0)
        const price = roundCurrency(Number(it.price_per_unit || 0))
        return {
          id: Date.now() + Math.random(),
          barang_id: it.barang_id,
          productName: it.master_barang?.name || meta?.barang.name || 'Tidak Diketahui',
          sku: it.master_barang?.sku || meta?.barang.sku || '',
          qty_on_hand: meta?.qty_on_hand ?? 0,
          qty,
          uom: it.uom || meta?.uom || 'PCS',
          price,
          subtotal: roundCurrency(qty * price),
        }
      })
      setItems(mappedItems)

      if (!['DRAFT', 'ISSUED'].includes(so.status)) {
        toast.warning(`Pesanan ini berstatus ${so.status} dan tidak dapat diubah lagi.`)
      }
    } else {
      toast.error(res.error || 'Gagal memuat detail pesanan penjualan')
      navigate('/customer-sales/orders')
    }
    setIsSubmitting(false)
  }

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        barang_id: null,
        productName: '',
        sku: '',
        qty_on_hand: 0,
        qty: 1,
        uom: 'PCS',
        price: 0,
        subtotal: 0,
      },
    ])
  }

  const handleRemoveItem = (rowId: number) => {
    setItems((prev) => prev.filter((i) => i.id !== rowId))
  }

  const handleProductChange = (rowId: number, productIdStr: string) => {
    const productId = Number(productIdStr)
    const meta = productMap.get(productId)
    if (!meta) return

    if (meta.qty_on_hand <= 0) {
      toast.error(
        `Stok aktual untuk "${meta.barang.name}" di gerai ini adalah 0. Pesanan tidak dapat melebihi stok aktual.`
      )
      return
    }

    const duplicateOtherRow = items.some((i) => i.id !== rowId && i.barang_id === productId)
    if (duplicateOtherRow) {
      toast.warning('Barang ini sudah ada di daftar pesanan. Silakan ubah kuantitas pada baris yang sama.')
      return
    }

    const defaultSellPrice = roundCurrency(Number(meta.sell_price || 0))

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== rowId) return item
        const adjustedQty = Math.min(Math.max(1, item.qty || 1), meta.qty_on_hand)
        return {
          ...item,
          barang_id: productId,
          productName: meta.barang.name || '',
          sku: meta.barang.sku || '',
          qty_on_hand: meta.qty_on_hand,
          qty: adjustedQty,
          uom: meta.uom || 'PCS',
          price: defaultSellPrice,
          subtotal: roundCurrency(adjustedQty * defaultSellPrice),
        }
      })
    )
  }

  const handleItemChange = (rowId: number, field: 'qty' | 'price', value: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== rowId) return item
        const updated = { ...item, [field]: value }

        if (field === 'qty') {
          const safeQty = isNaN(value) ? 0 : Math.max(0, value)
          if (item.barang_id && safeQty > item.qty_on_hand) {
            toast.warning(
              `Kuantitas pesanan (${safeQty}) melebihi stok aktual di gerai (${item.qty_on_hand} ${item.uom})`
            )
          }
          updated.qty = safeQty
        }

        updated.subtotal = roundCurrency(Number(updated.qty || 0) * Number(updated.price || 0))
        return updated
      })
    )
  }

  const subtotalItems = roundCurrency(items.reduce((sum, i) => sum + Number(i.subtotal || 0), 0))
  const grandTotal = roundCurrency(subtotalItems + Number(shippingCost || 0))

  const hasStockViolation = items.some(
    (i) => i.barang_id !== null && (i.qty <= 0 || i.qty > i.qty_on_hand)
  )

  const handleSubmit = async (targetStatus: 'DRAFT' | 'ISSUED') => {
    if (!user?.kode_outlet || !user?.id) {
      toast.error('Data gerai atau user tidak ditemukan')
      return
    }
    if (!selectedCustomerId) {
      toast.error('Silakan pilih customer terlebih dahulu')
      return
    }
    if (items.length === 0) {
      toast.error('Harap tambahkan minimal satu barang pesanan')
      return
    }
    if (isReadOnly) {
      toast.error('Pesanan ini sudah dikunci dan tidak dapat diubah')
      return
    }

    const incomplete = items.filter((i) => !i.barang_id || i.qty <= 0)
    if (incomplete.length > 0) {
      toast.error('Lengkapi pilihan barang dan jumlah pesanan (> 0) untuk seluruh baris')
      return
    }

    // Strict stock validation against outlet inventory_balance
    const overStockItem = items.find((i) => i.qty > i.qty_on_hand)
    if (overStockItem) {
      toast.error(
        `Jumlah pesanan "${overStockItem.productName}" (${overStockItem.qty}) melebihi stok aktual di gerai (${overStockItem.qty_on_hand} ${overStockItem.uom}).`
      )
      return
    }

    setIsSubmitting(true)
    try {
      const itemPayloads = items.map((i) => ({
        barang_id: i.barang_id!,
        qty_ordered: i.qty,
        uom: i.uom,
        price_per_unit: roundCurrency(i.price),
        subtotal: roundCurrency(i.subtotal),
      }))

      if (isEditMode && id) {
        const res = await customerSalesService.updateSalesOrder(id, {
          kode_customer: selectedCustomerId,
          order_date: orderDate,
          expected_delivery_date: expectedDate || null,
          shipping_cost: roundCurrency(shippingCost),
          total_items_amount: subtotalItems,
          total_amount: grandTotal,
          status: targetStatus,
          notes: notes || null,
          update_by: user.id,
          items: itemPayloads,
        })

        if (res.isSuccess) {
          toast.success('Pesanan Penjualan berhasil diperbarui')
          navigate('/customer-sales/orders')
        } else {
          toast.error(res.error || 'Gagal memperbarui pesanan penjualan')
        }
      } else {
        const res = await customerSalesService.createSalesOrder({
          document_number: docNumber,
          kode_outlet: user.kode_outlet,
          kode_customer: selectedCustomerId,
          order_date: orderDate,
          expected_delivery_date: expectedDate || null,
          shipping_cost: roundCurrency(shippingCost),
          total_items_amount: subtotalItems,
          total_amount: grandTotal,
          status: targetStatus,
          notes: notes || null,
          created_by: user.id,
          items: itemPayloads,
        })

        if (res.isSuccess) {
          toast.success(
            targetStatus === 'DRAFT'
              ? 'Pesanan Penjualan berhasil disimpan sebagai draf'
              : 'Pesanan Penjualan berhasil diterbitkan'
          )
          navigate('/customer-sales/orders')
        } else {
          toast.error(res.error || 'Gagal menyimpan pesanan penjualan')
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/customer-sales/orders')}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {isEditMode ? 'Ubah Pesanan Penjualan (SO)' : 'Buat Pesanan Penjualan (SO)'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Buat pesanan penjualan B2B ke customer dengan validasi stok aktual Gerai{' '}
              {user?.kode_outlet || '-'}.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="bg-primary/5 pb-4 border-b">
            <CardTitle className="text-base font-semibold text-primary">
              Informasi Dokumen Pesanan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <Label htmlFor="so_number">Nomor Dokumen SO</Label>
                <Input
                  id="so_number"
                  value={isGeneratingNo ? 'Menghasilkan nomor...' : docNumber}
                  readOnly
                  className="mt-1.5 font-mono bg-muted text-muted-foreground"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Customer (Pelanggan B2B) *</Label>
                <div className="mt-1.5">
                  <SearchableSelect
                    value={selectedCustomerId}
                    onChange={setSelectedCustomerId}
                    disabled={isReadOnly}
                    placeholder="Pilih Customer..."
                    options={customers.map((c) => ({
                      value: c.kode_customer,
                      label: c.name,
                      subLabel: [c.city, c.pic_name ? `PIC: ${c.pic_name}` : '']
                        .filter(Boolean)
                        .join(' • '),
                    }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="order_date">Tanggal Pesanan *</Label>
                <Input
                  id="order_date"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  disabled={isReadOnly}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="expected_date">Perkiraan Tanggal Kirim</Label>
                <Input
                  id="expected_date"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  disabled={isReadOnly}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Ongkos Kirim (Rp)</Label>
                <div className="mt-1.5">
                  <DecimalPriceInput
                    value={shippingCost}
                    onChange={setShippingCost}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between bg-primary/5 pb-4 border-b">
            <CardTitle className="text-base font-semibold text-primary">
              Daftar Barang Pesanan
            </CardTitle>
            {!isReadOnly && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddItem}
                disabled={isLoadingCatalog}
                className="border-primary/40 hover:bg-primary/10 text-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Barang
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="min-w-[260px]">Barang / Produk</TableHead>
                    <TableHead className="text-right w-[110px]">Stok Aktual</TableHead>
                    <TableHead className="w-[100px]">Jumlah</TableHead>
                    <TableHead className="w-[80px]">Satuan</TableHead>
                    <TableHead className="text-right w-[180px]">Harga Jual / Satuan</TableHead>
                    <TableHead className="text-right w-[160px]">Subtotal</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingCatalog ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                        Memuat katalog dan saldo stok gerai...
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                        Belum ada barang ditambahkan. Klik &quot;Tambah Barang&quot; untuk memulai.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const isOverStock =
                        item.barang_id !== null && item.qty > item.qty_on_hand

                      return (
                        <TableRow key={item.id} className={isOverStock ? 'bg-red-50/50' : ''}>
                          <TableCell>
                            <SearchableSelect
                              value={item.barang_id ? String(item.barang_id) : ''}
                              onChange={(val) => handleProductChange(item.id, val)}
                              disabled={isReadOnly}
                              placeholder="Pilih Barang / Produk"
                              options={catalog.map((c) => ({
                                value: String(c.barang.id),
                                label: c.barang.name || 'Tidak Diketahui',
                                subLabel: `${c.barang.sku || '-'} • Stok: ${c.qty_on_hand} ${c.uom}`,
                              }))}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {item.barang_id ? (
                              <span
                                className={
                                  item.qty_on_hand <= 0
                                    ? 'text-red-600 font-semibold'
                                    : 'text-emerald-700 font-semibold'
                                }
                              >
                                {item.qty_on_hand} {item.uom}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              max={item.qty_on_hand > 0 ? item.qty_on_hand : undefined}
                              step="any"
                              value={item.qty}
                              onChange={(e) =>
                                handleItemChange(item.id, 'qty', Number(e.target.value))
                              }
                              disabled={isReadOnly}
                              className={`h-9 text-right ${
                                isOverStock ? 'border-red-500 text-red-700 font-semibold' : ''
                              }`}
                            />
                            {isOverStock && (
                              <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                Melebihi stok
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center h-9 px-2 bg-muted/50 rounded-md text-xs border border-border/40 text-muted-foreground">
                              {item.uom}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DecimalPriceInput
                              value={item.price}
                              onChange={(val) => handleItemChange(item.id, 'price', val)}
                              disabled={isReadOnly}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-sm">
                            {formatIdrCurrency(item.subtotal)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={isReadOnly}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col items-end gap-1.5 p-6 bg-muted/20 border-t">
              <div className="flex items-center justify-between w-full max-w-xs text-sm">
                <span className="text-muted-foreground">Subtotal Barang:</span>
                <span className="font-mono font-medium">{formatIdrCurrency(subtotalItems)}</span>
              </div>
              <div className="flex items-center justify-between w-full max-w-xs text-sm">
                <span className="text-muted-foreground">Ongkos Kirim:</span>
                <span className="font-mono font-medium">{formatIdrCurrency(shippingCost)}</span>
              </div>
              <div className="flex items-center justify-between w-full max-w-xs pt-2 border-t">
                <span className="font-semibold text-foreground">Total Pesanan:</span>
                <span className="text-xl font-bold text-primary font-mono">
                  {formatIdrCurrency(grandTotal)}
                </span>
              </div>
            </div>

            <div className="px-6 pb-6 pt-2">
              <Label htmlFor="so_notes">Catatan Pesanan</Label>
              <Textarea
                id="so_notes"
                placeholder="Tambahkan catatan pengiriman atau permintaan khusus customer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isReadOnly}
                rows={3}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          {!isReadOnly ? (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleSubmit('DRAFT')}
                disabled={isSubmitting || hasStockViolation}
              >
                <Save className="w-4 h-4 mr-2" />
                Simpan Draf
              </Button>
              <Button
                size="lg"
                onClick={() => handleSubmit('ISSUED')}
                disabled={isSubmitting || hasStockViolation}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Terbitkan Pesanan
              </Button>
            </>
          ) : (
            <div className="text-muted-foreground italic flex items-center text-sm">
              <Lock className="w-4 h-4 mr-2" />
              Pesanan ini berstatus {existingOrder?.status} dan sudah dikunci.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default CustomerSalesOrderCreatePage
