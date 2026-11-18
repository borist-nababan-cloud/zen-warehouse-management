import { useState, useEffect, useMemo } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  TransactionImageInput,
  uploadTransactionImage,
} from '@/components/common/TransactionImageInput'
import {
  customerSalesService,
  OutletProductStockPrice,
} from '@/services/customerSalesService'
import { CstSalesOrder } from '@/types/database'
import { printSuratJalanA5 } from '@/utils/customerPrintUtils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Truck,
  ArrowRight,
  AlertCircle,
  Printer,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

interface ShippingItemInput {
  so_item_id: string
  barang_id: number
  qty_shipped: number
}

export function CustomerGoodsIssuePage() {
  const { user } = useAuthUser()
  const [issuedOrders, setIssuedOrders] = useState<CstSalesOrder[]>([])
  const [shippedOrders, setShippedOrders] = useState<CstSalesOrder[]>([])
  const [catalog, setCatalog] = useState<OutletProductStockPrice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [selectedOrder, setSelectedOrder] = useState<CstSalesOrder | null>(null)
  const [shippingItems, setShippingItems] = useState<ShippingItemInput[]>([])
  const [shipmentNotes, setShipmentNotes] = useState('')
  const [shipmentImageFile, setShipmentImageFile] = useState<File | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const stockMap = useMemo(() => {
    const map = new Map<number, number>()
    catalog.forEach((c) => map.set(c.barang.id, c.qty_on_hand))
    return map
  }, [catalog])

  useEffect(() => {
    if (user?.kode_outlet) {
      loadData(user.kode_outlet)
    }
  }, [user?.kode_outlet])

  async function loadData(outletCode: string) {
    setIsLoading(true)
    try {
      const [pendingRes, historyRes, catList] = await Promise.all([
        customerSalesService.getSalesOrders({
          kode_outlet: outletCode,
          statuses: ['ISSUED'],
        }),
        customerSalesService.getSalesOrders({
          kode_outlet: outletCode,
          statuses: ['SHIPPED', 'INVOICED', 'PAID'],
        }),
        customerSalesService.getOutletProductsWithStockAndPrice(outletCode),
      ])

      if (pendingRes.isSuccess && pendingRes.data) {
        setIssuedOrders(pendingRes.data)
      }
      if (historyRes.isSuccess && historyRes.data) {
        setShippedOrders(historyRes.data)
      }
      setCatalog(catList)
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data pengiriman barang')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenShipmentDialog = async (order: CstSalesOrder) => {
    const detailRes = await customerSalesService.getSalesOrderById(order.id)
    if (!detailRes.isSuccess || !detailRes.data) {
      toast.error(detailRes.error || 'Gagal memuat rincian pesanan')
      return
    }

    const fullOrder = detailRes.data
    setSelectedOrder(fullOrder)
    setShippingItems(
      (fullOrder.cst_sales_order_items || []).map((item) => {
        const availableStock = stockMap.get(item.barang_id) ?? 0
        const defaultShip = Math.max(0, Math.min(Number(item.qty_ordered || 0), availableStock))
        return {
          so_item_id: item.id,
          barang_id: item.barang_id,
          qty_shipped: defaultShip,
        }
      })
    )
    setShipmentNotes('')
    setShipmentImageFile(null)
    setIsDetailOpen(true)
  }

  const updateShipQty = (soItemId: string, qty: number) => {
    setShippingItems((prev) =>
      prev.map((item) =>
        item.so_item_id === soItemId
          ? { ...item, qty_shipped: isNaN(qty) ? 0 : Math.max(0, qty) }
          : item
      )
    )
  }

  const handleSubmitShipment = async () => {
    if (!selectedOrder || !user?.kode_outlet || !user?.id) return

    if (shippingItems.some((i) => i.qty_shipped < 0)) {
      toast.error('Kuantitas pengiriman tidak boleh negatif')
      return
    }

    const exceededOrder = (selectedOrder.cst_sales_order_items || []).find((item) => {
      const ship = shippingItems.find((s) => s.so_item_id === item.id)
      return (ship?.qty_shipped || 0) > Number(item.qty_ordered || 0)
    })
    if (exceededOrder) {
      toast.error(
        `Kuantitas kirim "${exceededOrder.master_barang?.name || 'barang'}" melebihi jumlah pesanan (${exceededOrder.qty_ordered}).`
      )
      return
    }

    const exceededStock = (selectedOrder.cst_sales_order_items || []).find((item) => {
      const ship = shippingItems.find((s) => s.so_item_id === item.id)
      const stock = stockMap.get(item.barang_id) ?? 0
      return (ship?.qty_shipped || 0) > stock
    })
    if (exceededStock) {
      const stock = stockMap.get(exceededStock.barang_id) ?? 0
      toast.error(
        `Kuantitas kirim "${exceededStock.master_barang?.name || 'barang'}" melebihi stok gudang aktual (${stock}).`
      )
      return
    }

    const totalShipped = shippingItems.reduce((sum, i) => sum + Number(i.qty_shipped || 0), 0)
    if (totalShipped <= 0) {
      toast.error('Minimal satu barang harus dikirim dengan jumlah lebih dari 0')
      return
    }

    setIsSubmitting(true)
    try {
      let uploadedImageUrl: string | null = null
      if (shipmentImageFile) {
        uploadedImageUrl = await uploadTransactionImage(
          shipmentImageFile,
          'cst-shipments',
          user.kode_outlet
        )
      }

      const res = await customerSalesService.createCstShipment({
        so_id: selectedOrder.id,
        kode_outlet: user.kode_outlet,
        kode_customer: selectedOrder.kode_customer,
        shipped_by: user.id,
        image_url: uploadedImageUrl,
        notes: shipmentNotes || null,
        items: shippingItems,
      })

      if (!res.isSuccess || !res.data) {
        toast.error(res.error || 'Gagal memproses pengiriman barang')
        return
      }

      toast.success(
        `Pengiriman berhasil dicatat (${res.data.document_number}). Stok gudang otomatis terpotong.`
      )
      setIsDetailOpen(false)

      const refreshed = await customerSalesService.getSalesOrderById(selectedOrder.id)
      if (refreshed.isSuccess && refreshed.data) {
        printSuratJalanA5(refreshed.data, user.full_name || user.email || 'Petugas')
      }

      loadData(user.kode_outlet)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Terjadi kesalahan saat memproses pengiriman')
    } finally {
      setIsSubmitting(false)
    }
  }

  const printedByName = user?.full_name || user?.email || 'Petugas'

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Pengiriman Barang ke Customer (Issue)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Proses pengeluaran barang berdasarkan Pesanan Penjualan (SO) yang telah diterbitkan pada
            Gerai {user?.kode_outlet || '-'}.
          </p>
        </div>

        <Card>
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-base font-semibold text-primary flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Antrean Siap Kirim ({issuedOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                Memuat pesanan siap kirim...
              </div>
            ) : issuedOrders.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                <Truck className="h-10 w-10 mb-2 opacity-25" />
                <p>Tidak ada Pesanan Penjualan yang menunggu pengiriman.</p>
              </div>
            ) : (
              issuedOrders.map((so) => (
                <Card key={so.id} className="hover:bg-muted/20 transition-colors">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">{so.document_number}</span>
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                          {so.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Customer:{' '}
                        <span className="font-semibold text-foreground">
                          {so.master_customer?.name || '-'}
                        </span>{' '}
                        • Tgl Pesan:{' '}
                        {so.order_date ? format(new Date(so.order_date), 'dd MMM yyyy') : '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Jumlah Item</p>
                        <p className="font-bold">
                          {so.cst_sales_order_items?.length || 0} Barang
                        </p>
                      </div>
                      <Button onClick={() => handleOpenShipmentDialog(so)}>
                        Proses Pengiriman
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Riwayat Surat Jalan & Cetak Ulang ({shippedOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Surat Jalan</TableHead>
                    <TableHead>No. Pesanan (SO)</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tgl Kirim</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Cetak A5</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shippedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Belum ada riwayat pengiriman barang.
                      </TableCell>
                    </TableRow>
                  ) : (
                    shippedOrders.map((so) => {
                      const sj = so.cst_shipments?.[0]
                      return (
                        <TableRow key={so.id}>
                          <TableCell className="font-mono font-semibold">
                            {sj?.document_number || '-'}
                          </TableCell>
                          <TableCell className="font-mono">{so.document_number}</TableCell>
                          <TableCell>{so.master_customer?.name || '-'}</TableCell>
                          <TableCell>
                            {sj?.shipment_date
                              ? format(new Date(sj.shipment_date), 'dd/MM/yyyy HH:mm')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{so.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => printSuratJalanA5(so, printedByName)}
                            >
                              <Printer className="h-4 w-4 mr-1.5" />
                              Cetak Surat Jalan (A5)
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Proses Pengiriman Barang: {selectedOrder?.document_number}
              </DialogTitle>
              <DialogDescription>
                Verifikasi kuantitas fisik yang dikirim ke{' '}
                <strong>{selectedOrder?.master_customer?.name}</strong>. Saldo stok gudang akan
                langsung terpotong saat pengiriman dikonfirmasi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="bg-blue-50 p-3 rounded-md border border-blue-100 text-sm text-blue-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Pastikan fisik barang sesuai dengan kuantitas di bawah ini. Barang yang kosong di
                  gudang dapat diisi <strong>0</strong>. Setelah dikonfirmasi, Anda dapat langsung
                  mencetak <strong>Surat Jalan (A5)</strong>.
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barang / Produk</TableHead>
                    <TableHead className="text-right">Stok Gudang</TableHead>
                    <TableHead className="text-right">Qty Pesanan</TableHead>
                    <TableHead className="text-right w-36">Qty Dikirim</TableHead>
                    <TableHead className="text-center">Satuan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder?.cst_sales_order_items?.map((item) => {
                    const shipItem = shippingItems.find((s) => s.so_item_id === item.id)
                    const stock = stockMap.get(item.barang_id) ?? 0
                    const qtyShipped = shipItem?.qty_shipped ?? 0
                    const isZero = qtyShipped === 0

                    return (
                      <TableRow key={item.id} className={isZero ? 'bg-amber-50/40' : ''}>
                        <TableCell>
                          <div className="font-medium">{item.master_barang?.name || '-'}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {item.master_barang?.sku || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{stock}</TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {item.qty_ordered}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            max={Math.min(Number(item.qty_ordered || 0), stock)}
                            step="any"
                            className={`text-right h-8 ${
                              isZero ? 'border-amber-300 text-amber-700 font-semibold' : ''
                            }`}
                            value={qtyShipped}
                            onChange={(e) => updateShipQty(item.id, Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {item.uom}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div>
                <Label htmlFor="ship_notes">Catatan Pengiriman (Opsional)</Label>
                <Textarea
                  id="ship_notes"
                  value={shipmentNotes}
                  onChange={(e) => setShipmentNotes(e.target.value)}
                  placeholder="Contoh: Dikirim via kurir toko / nomor resi..."
                  rows={2}
                  className="mt-1.5"
                />
              </div>

              <div className="pt-2 border-t">
                <TransactionImageInput
                  label="Foto Bukti Pengiriman Barang (Opsional)"
                  helperText="Ambil foto paket/surat jalan saat serah terima menggunakan kamera atau unggah dari galeri perangkat."
                  file={shipmentImageFile}
                  onChange={setShipmentImageFile}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setIsDetailOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button onClick={handleSubmitShipment} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Konfirmasi & Cetak Surat Jalan (A5)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default CustomerGoodsIssuePage
