import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { customerSalesService } from '@/services/customerSalesService'
import { CstInvoice } from '@/types/database'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, CheckCircle, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0)

export function CustomerSettlementPage() {
  const { user } = useAuthUser()

  const [unpaidInvoices, setUnpaidInvoices] = useState<CstInvoice[]>([])
  const [paidInvoices, setPaidInvoices] = useState<CstInvoice[]>([])
  const [accounts, setAccounts] = useState<
    { id: string; account_name: string; bank_name?: string | null; account_number?: string | null }[]
  >([])
  const [loading, setLoading] = useState(true)

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<CstInvoice | null>(null)
  const [targetAccountId, setTargetAccountId] = useState('')
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentNotes, setPaymentNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    if (!user?.kode_outlet) return
    setLoading(true)
    try {
      const [unpaidRes, paidRes, accs] = await Promise.all([
        customerSalesService.getCustomerInvoices({
          kode_outlet: user.kode_outlet,
          payment_status: 'UNPAID',
        }),
        customerSalesService.getCustomerInvoices({
          kode_outlet: user.kode_outlet,
          payment_status: 'PAID',
        }),
        customerSalesService.getOutletFinancialAccounts(user.kode_outlet),
      ])

      if (unpaidRes.isSuccess && unpaidRes.data) setUnpaidInvoices(unpaidRes.data)
      if (paidRes.isSuccess && paidRes.data) setPaidInvoices(paidRes.data)
      setAccounts(accs || [])
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data pelunasan customer')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.kode_outlet]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenConfirm = (inv: CstInvoice) => {
    setSelectedInvoice(inv)
    setTargetAccountId('')
    setReceivedDate(new Date().toISOString().split('T')[0])
    setPaymentNotes('')
    setIsConfirmOpen(true)
  }

  const handleSubmitConfirm = async () => {
    if (!selectedInvoice || !targetAccountId) {
      toast.error('Silakan pilih rekening atau kas tujuan terlebih dahulu')
      return
    }
    if (!receivedDate) {
      toast.error('Tanggal penerimaan pembayaran wajib diisi')
      return
    }

    setIsSubmitting(true)
    try {
      await customerSalesService.confirmCustomerPayment({
        invoice_id: selectedInvoice.id,
        account_id: targetAccountId,
        received_date: receivedDate,
        notes: paymentNotes || undefined,
      })

      toast.success(
        'Pelunasan Customer berhasil dikonfirmasi! Status berubah menjadi PAID dan saldo rekening telah bertambah.'
      )
      setIsConfirmOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengonfirmasi pelunasan customer')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Pelunasan Customer (AR)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Verifikasi dan catat penerimaan pelunasan faktur penjualan customer untuk Gerai{' '}
            {user?.kode_outlet || '-'}.
          </p>
        </div>

        <Card>
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-base font-semibold text-primary">
              Tagihan Customer Belum Lunas ({unpaidInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tgl Faktur</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>No. Faktur</TableHead>
                    <TableHead>No. SO</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total Tagihan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                        Memuat data piutang customer...
                      </TableCell>
                    </TableRow>
                  ) : unpaidInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Tidak ada faktur penjualan yang menunggu pelunasan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    unpaidInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          {inv.invoice_date ? format(new Date(inv.invoice_date), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {inv.due_date ? format(new Date(inv.due_date), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell className="font-mono font-semibold">
                          {inv.document_number}
                        </TableCell>
                        <TableCell className="font-mono">
                          {inv.cst_sales_orders?.document_number || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{inv.master_customer?.name || '-'}</div>
                          {inv.master_customer?.pic_name && (
                            <div className="text-xs text-muted-foreground">
                              PIC: {inv.master_customer.pic_name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(inv.grand_total)}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                            UNPAID
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => handleOpenConfirm(inv)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Konfirmasi Pelunasan
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

        <Card>
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Riwayat Pelunasan Customer (PAID) ({paidInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tgl Faktur</TableHead>
                    <TableHead>No. Faktur</TableHead>
                    <TableHead>No. SO</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Nominal Lunas</TableHead>
                    <TableHead>Tgl Pelunasan</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Belum ada riwayat faktur yang sudah lunas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paidInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          {inv.invoice_date ? format(new Date(inv.invoice_date), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {inv.document_number}
                        </TableCell>
                        <TableCell className="font-mono">
                          {inv.cst_sales_orders?.document_number || '-'}
                        </TableCell>
                        <TableCell>{inv.master_customer?.name || '-'}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(inv.grand_total)}
                        </TableCell>
                        <TableCell>
                          {inv.paid_at ? format(new Date(inv.paid_at), 'dd/MM/yyyy HH:mm') : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            PAID
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Konfirmasi Pelunasan Customer</DialogTitle>
              <DialogDescription>
                Anda menyatakan telah menerima pembayaran untuk faktur{' '}
                <strong>{selectedInvoice?.document_number}</strong> dari{' '}
                <strong>{selectedInvoice?.master_customer?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-3">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Nominal</Label>
                <div className="col-span-3 font-bold text-lg font-mono text-primary">
                  {selectedInvoice ? formatCurrency(selectedInvoice.grand_total) : '-'}
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cst_account" className="text-right">
                  Masuk ke Kas/Bank *
                </Label>
                <div className="col-span-3">
                  <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                    <SelectTrigger id="cst_account">
                      <SelectValue placeholder="Pilih Rekening Bank / Kas" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.account_name}
                          {acc.bank_name ? ` (${acc.bank_name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cst_received_date" className="text-right">
                  Tanggal Diterima *
                </Label>
                <div className="col-span-3">
                  <Input
                    id="cst_received_date"
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="cst_pay_notes" className="text-right mt-2">
                  Catatan
                </Label>
                <div className="col-span-3">
                  <Textarea
                    id="cst_pay_notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Contoh: Transfer BCA an. PT..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button onClick={handleSubmitConfirm} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Konfirmasi Pelunasan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default CustomerSettlementPage
