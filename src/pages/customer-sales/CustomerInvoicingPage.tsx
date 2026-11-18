import { useState, useEffect, useMemo } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { DecimalPriceInput } from '@/components/ui/decimal-price-input'
import { customerSalesService } from '@/services/customerSalesService'
import { CstSalesOrder } from '@/types/database'
import { printFakturPenjualanA5 } from '@/utils/customerPrintUtils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { FileText, Loader2, Printer, CheckCircle2 } from 'lucide-react'

const roundCurrency = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100

const formatIdrCurrency = (val: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0)

export function CustomerInvoicingPage() {
  const { user } = useAuthUser()
  const [shippedOrders, setShippedOrders] = useState<CstSalesOrder[]>([])
  const [invoicedOrders, setInvoicedOrders] = useState<CstSalesOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [selectedOrder, setSelectedOrder] = useState<CstSalesOrder | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Invoice form state
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [useTax, setUseTax] = useState<boolean>(false)
  const [taxPercent, setTaxPercent] = useState<number>(11)
  const [shippingCost, setShippingCost] = useState<number>(0)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (user?.kode_outlet) {
      loadData(user.kode_outlet)
    }
  }, [user?.kode_outlet])

  async function loadData(outletCode: string) {
    setIsLoading(true)
    try {
      const [readyRes, historyRes] = await Promise.all([
        customerSalesService.getSalesOrders({
          kode_outlet: outletCode,
          statuses: ['SHIPPED'],
        }),
        customerSalesService.getSalesOrders({
          kode_outlet: outletCode,
          statuses: ['INVOICED', 'PAID'],
        }),
      ])

      if (readyRes.isSuccess && readyRes.data) {
        setShippedOrders(readyRes.data)
      }
      if (historyRes.isSuccess && historyRes.data) {
        setInvoicedOrders(historyRes.data)
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data faktur penjualan')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenInvoiceModal = async (order: CstSalesOrder) => {
    const detailRes = await customerSalesService.getSalesOrderById(order.id)
    if (!detailRes.isSuccess || !detailRes.data) {
      toast.error(detailRes.error || 'Gagal memuat detail pengiriman pesanan')
      return
    }

    const fullOrder = detailRes.data
    setSelectedOrder(fullOrder)
    setInvoiceDate(new Date().toISOString().split('T')[0])
    const defaultDue = new Date()
    defaultDue.setDate(defaultDue.getDate() + 14)
    setDueDate(defaultDue.toISOString().split('T')[0])
    setDiscountAmount(0)
    setUseTax(false)
    setTaxPercent(11)
    setShippingCost(roundCurrency(Number(fullOrder.shipping_cost || 0)))
    setNotes('')
    setIsModalOpen(true)
  }

  // Re-count line items using actual shipped quantities from Pengiriman Barang (Issue)
  const recountedLines = useMemo(() => {
    if (!selectedOrder) return []
    const shipment = selectedOrder.cst_shipments?.[0]
    const shippedMap = new Map<string, number>()
    ;(shipment?.cst_shipment_items || []).forEach((si) => {
      shippedMap.set(si.so_item_id, (shippedMap.get(si.so_item_id) || 0) + Number(si.qty_shipped || 0))
    })

    return (selectedOrder.cst_sales_order_items || []).map((soItem) => {
      const qtyOrdered = Number(soItem.qty_ordered || 0)
      const qtyShipped = shipment ? (shippedMap.get(soItem.id) ?? 0) : qtyOrdered
      const price = roundCurrency(Number(soItem.price_per_unit || 0))
      const totalPo = roundCurrency(qtyOrdered * price)
      const totalActual = roundCurrency(qtyShipped * price)

      return {
        soItemId: soItem.id,
        name: soItem.master_barang?.name || '-',
        sku: soItem.master_barang?.sku || '-',
        uom: soItem.uom || 'PCS',
        qtyOrdered,
        qtyShipped,
        price,
        totalPo,
        totalActual,
      }
    })
  }, [selectedOrder])

  const subtotalActual = useMemo(
    () => roundCurrency(recountedLines.reduce((sum, l) => sum + l.totalActual, 0)),
    [recountedLines]
  )

  const subtotalPo = useMemo(
    () => roundCurrency(recountedLines.reduce((sum, l) => sum + l.totalPo, 0)),
    [recountedLines]
  )

  // Formula:
  // DPP = Subtotal Aktual - Diskon
  // Pajak = useTax ? DPP * (taxPercent / 100) : 0
  // Grand Total = DPP + Pajak + Ongkos Kirim
  const dppAfterDiscount = Math.max(0, roundCurrency(subtotalActual - Number(discountAmount || 0)))
  const taxAmount = useTax
    ? roundCurrency(dppAfterDiscount * (Math.max(0, Number(taxPercent || 0)) / 100))
    : 0
  const grandTotal = roundCurrency(dppAfterDiscount + taxAmount + Number(shippingCost || 0))

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder || !user?.kode_outlet || !user?.id) return

    const shipment = selectedOrder.cst_shipments?.[0]
    if (!shipment) {
      toast.error('Data pengiriman (Surat Jalan) belum ditemukan untuk pesanan ini')
      return
    }
    if (!invoiceDate) {
      toast.error('Tanggal faktur wajib diisi')
      return
    }
    if (discountAmount > subtotalActual) {
      toast.error('Diskon tidak boleh melebihi subtotal barang aktual')
      return
    }

    if (!confirm('Terbitkan Faktur Penjualan ini? Tindakan ini akan mengunci pesanan dan mencetak faktur.')) {
      return
    }

    setIsSubmitting(true)
    try {
      const res = await customerSalesService.createCstInvoice({
        so_id: selectedOrder.id,
        shipment_id: shipment.id,
        kode_outlet: user.kode_outlet,
        kode_customer: selectedOrder.kode_customer,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        subtotal_items: subtotalActual,
        discount_amount: roundCurrency(discountAmount),
        use_tax: useTax,
        tax_percent: useTax ? roundCurrency(taxPercent) : 0,
        tax_amount: taxAmount,
        shipping_cost: roundCurrency(shippingCost),
        grand_total: grandTotal,
        notes: notes || null,
        created_by: user.id,
      })

      if (!res.isSuccess || !res.data) {
        toast.error(res.error || 'Gagal menerbitkan faktur penjualan')
        return
      }

      toast.success(`Faktur Penjualan ${res.data.document_number} berhasil diterbitkan!`)
      setIsModalOpen(false)

      const refreshed = await customerSalesService.getSalesOrderById(selectedOrder.id)
      if (refreshed.isSuccess && refreshed.data) {
        printFakturPenjualanA5(refreshed.data, user.full_name || user.email || 'Petugas')
      }

      loadData(user.kode_outlet)
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
            Faktur Penjualan (Customer)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Terbitkan faktur berdasarkan kuantitas aktual Pengiriman Barang (Issue) untuk Gerai{' '}
            {user?.kode_outlet || '-'}.
          </p>
        </div>

        <Card>
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-base font-semibold text-primary flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Siap Diterbitkan Faktur ({shippedOrders.length})
            </CardTitle>
            <CardDescription>
              Pesanan di bawah ini sudah dikirim ke customer dan menunggu pembuatan faktur penjualan.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Pesanan (SO)</TableHead>
                    <TableHead>No. Surat Jalan</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tgl Kirim</TableHead>
                    <TableHead className="text-right">Estimasi Total SO</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                        Memuat data pesanan...
                      </TableCell>
                    </TableRow>
                  ) : shippedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Tidak ada pesanan terkirim yang menunggu penerbitan faktur.
                      </TableCell>
                    </TableRow>
                  ) : (
                    shippedOrders.map((so) => {
                      const sj = so.cst_shipments?.[0]
                      return (
                        <TableRow key={so.id}>
                          <TableCell className="font-mono font-semibold">
                            {so.document_number}
                          </TableCell>
                          <TableCell className="font-mono">{sj?.document_number || '-'}</TableCell>
                          <TableCell>{so.master_customer?.name || '-'}</TableCell>
                          <TableCell>
                            {sj?.shipment_date
                              ? format(new Date(sj.shipment_date), 'dd/MM/yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatIdrCurrency(so.total_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => handleOpenInvoiceModal(so)}>
                              Buat Faktur Penjualan
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

        <Card>
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Riwayat Faktur Penjualan Terbit ({invoicedOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Faktur</TableHead>
                    <TableHead>No. SO</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tgl Faktur</TableHead>
                    <TableHead className="text-right">Total Tagihan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Cetak A5</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Belum ada faktur penjualan yang diterbitkan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoicedOrders.map((so) => {
                      const inv = so.cst_invoices?.[0]
                      return (
                        <TableRow key={so.id}>
                          <TableCell className="font-mono font-semibold">
                            {inv?.document_number || '-'}
                          </TableCell>
                          <TableCell className="font-mono">{so.document_number}</TableCell>
                          <TableCell>{so.master_customer?.name || '-'}</TableCell>
                          <TableCell>
                            {inv?.invoice_date
                              ? format(new Date(inv.invoice_date), 'dd/MM/yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatIdrCurrency(inv?.grand_total || 0)}
                          </TableCell>
                          <TableCell>
                            {inv?.payment_status === 'PAID' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                PAID (LUNAS)
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                UNPAID
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => printFakturPenjualanA5(so, printedByName)}
                            >
                              <Printer className="h-4 w-4 mr-1.5" />
                              Cetak Faktur (A5)
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

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Buat Faktur Penjualan: {selectedOrder?.document_number}
              </DialogTitle>
              <DialogDescription>
                Perhitungan otomatis berdasarkan kuantitas kirim aktual untuk{' '}
                <strong>{selectedOrder?.master_customer?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitInvoice} className="space-y-4">
              <div className="rounded-md border p-3 bg-muted/20 overflow-x-auto max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Barang</TableHead>
                      <TableHead className="text-right">Qty SO</TableHead>
                      <TableHead className="text-right">Qty Kirim Aktual</TableHead>
                      <TableHead className="text-right">Harga Satuan</TableHead>
                      <TableHead className="text-right">Total (SO)</TableHead>
                      <TableHead className="text-right">Total (Aktual)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recountedLines.map((line) => (
                      <TableRow key={line.soItemId}>
                        <TableCell>
                          <div className="font-medium">{line.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{line.sku}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {line.qtyOrdered} {line.uom}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-blue-700">
                          {line.qtyShipped} {line.uom}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatIdrCurrency(line.price)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatIdrCurrency(line.totalPo)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-emerald-700">
                          {formatIdrCurrency(line.totalActual)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-bold border-t">
                      <TableCell colSpan={4} className="text-right">
                        Subtotal Barang
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatIdrCurrency(subtotalPo)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-700">
                        {formatIdrCurrency(subtotalActual)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="inv_date">Tanggal Faktur *</Label>
                  <Input
                    id="inv_date"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="inv_due_date">Tanggal Jatuh Tempo</Label>
                  <Input
                    id="inv_due_date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label>Diskon (Rp)</Label>
                  <div className="mt-1.5">
                    <DecimalPriceInput value={discountAmount} onChange={setDiscountAmount} />
                  </div>
                </div>

                <div>
                  <Label>Ongkos Kirim (Rp)</Label>
                  <div className="mt-1.5">
                    <DecimalPriceInput value={shippingCost} onChange={setShippingCost} />
                  </div>
                </div>

                <div className="md:col-span-2 p-3 rounded-lg border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useTax}
                      onChange={(e) => setUseTax(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 accent-primary"
                    />
                    <span className="text-sm font-medium">
                      Kenakan Pajak (PPN) &amp; Tampilkan pada Cetakan Faktur
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <Label htmlFor="tax_percent" className="text-xs whitespace-nowrap">
                      Tarif Pajak (%):
                    </Label>
                    <Input
                      id="tax_percent"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(Math.max(0, Number(e.target.value)))}
                      disabled={!useTax}
                      className="w-24 h-8 text-right font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-primary/5 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal Barang Aktual:</span>
                  <span className="font-mono font-medium">{formatIdrCurrency(subtotalActual)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diskon:</span>
                  <span className="font-mono text-red-600">
                    - {formatIdrCurrency(discountAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dasar Pengenaan Pajak (DPP):</span>
                  <span className="font-mono">{formatIdrCurrency(dppAfterDiscount)}</span>
                </div>
                {useTax && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pajak (PPN {taxPercent}%):</span>
                    <span className="font-mono font-medium">{formatIdrCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ongkos Kirim:</span>
                  <span className="font-mono font-medium">{formatIdrCurrency(shippingCost)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t text-base font-bold text-primary">
                  <span>Grand Total Faktur:</span>
                  <span className="font-mono">{formatIdrCurrency(grandTotal)}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="inv_notes">Catatan Faktur (Opsional)</Label>
                <Textarea
                  id="inv_notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informasi pembayaran atau catatan tambahan pada faktur..."
                  rows={2}
                  className="mt-1.5"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Terbitkan &amp; Cetak Faktur (A5)
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default CustomerInvoicingPage
