import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthUser } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Ban, Printer, Search, Loader2, FileText } from 'lucide-react'
import { customerSalesService } from '@/services/customerSalesService'
import { CstSalesOrder } from '@/types/database'
import { printFakturPenjualanA5, printSuratJalanA5 } from '@/utils/customerPrintUtils'
import { toast } from 'sonner'
import { format } from 'date-fns'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0)

export function CustomerSalesOrderListPage() {
  const navigate = useNavigate()
  const { user } = useAuthUser()
  const [orders, setOrders] = useState<CstSalesOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (user?.kode_outlet) {
      loadOrders(user.kode_outlet)
    }
  }, [user?.kode_outlet])

  async function loadOrders(outletCode: string) {
    setIsLoading(true)
    const res = await customerSalesService.getSalesOrders({ kode_outlet: outletCode })
    if (res.isSuccess && res.data) {
      setOrders(res.data)
    } else {
      toast.error(res.error || 'Gagal memuat daftar pesanan penjualan')
    }
    setIsLoading(false)
  }

  const handleCancelOrder = async (order: CstSalesOrder) => {
    if (!confirm(`Batalkan Pesanan Penjualan "${order.document_number}"?`)) return

    const res = await customerSalesService.updateSalesOrderStatus(
      order.id,
      'CANCELLED',
      user?.id
    )
    if (res.isSuccess) {
      toast.success('Pesanan penjualan berhasil dibatalkan')
      if (user?.kode_outlet) loadOrders(user.kode_outlet)
    } else {
      toast.error(res.error || 'Gagal membatalkan pesanan')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="secondary">DRAF</Badge>
      case 'ISSUED':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">DITERBITKAN</Badge>
      case 'SHIPPED':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">DIKIRIM</Badge>
      case 'INVOICED':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">TERTAGIH</Badge>
      case 'PAID':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">PAID (LUNAS)</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">DIBATALKAN</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      o.document_number.toLowerCase().includes(q) ||
      o.master_customer?.name?.toLowerCase().includes(q)
    )
  })

  const printedByName = user?.full_name || user?.email || 'Petugas'

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Pesanan Penjualan (Customer)
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Kelola pesanan penjualan B2B untuk Gerai {user?.kode_outlet || '-'}.
            </p>
          </div>
          <Button onClick={() => navigate('/customer-sales/orders/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Buat Pesanan Penjualan
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nomor dokumen SO atau nama customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-base">Daftar Pesanan Penjualan ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Dokumen SO</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tanggal Pesan</TableHead>
                    <TableHead>Est. Pengiriman</TableHead>
                    <TableHead className="text-right">Ongkos Kirim</TableHead>
                    <TableHead className="text-right">Total Pesanan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                        Memuat pesanan penjualan...
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Belum ada pesanan penjualan ditemukan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((so) => {
                      const hasShipment = (so.cst_shipments?.length || 0) > 0
                      const hasInvoice = (so.cst_invoices?.length || 0) > 0
                      const canEdit = so.status === 'DRAFT' || so.status === 'ISSUED'

                      return (
                        <TableRow key={so.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono font-semibold">
                            {so.document_number}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{so.master_customer?.name || '-'}</div>
                            {so.master_customer?.pic_name && (
                              <div className="text-xs text-muted-foreground">
                                PIC: {so.master_customer.pic_name}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {so.order_date ? format(new Date(so.order_date), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            {so.expected_delivery_date
                              ? format(new Date(so.expected_delivery_date), 'dd/MM/yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(so.shipping_cost)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(so.total_amount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(so.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canEdit && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => navigate(`/customer-sales/orders/${so.id}/edit`)}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1" />
                                  Ubah
                                </Button>
                              )}

                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  title="Batalkan Pesanan"
                                  onClick={() => handleCancelOrder(so)}
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              )}

                              {hasShipment && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-amber-700 hover:bg-amber-50"
                                  title="Cetak Surat Jalan (A5)"
                                  onClick={() => printSuratJalanA5(so, printedByName)}
                                >
                                  <Printer className="h-3.5 w-3.5 mr-1" />
                                  SJ
                                </Button>
                              )}

                              {hasInvoice && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-indigo-700 hover:bg-indigo-50"
                                  title="Cetak Faktur Penjualan (A5)"
                                  onClick={() => printFakturPenjualanA5(so, printedByName)}
                                >
                                  <FileText className="h-3.5 w-3.5 mr-1" />
                                  Faktur
                                </Button>
                              )}
                            </div>
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
      </div>
    </DashboardLayout>
  )
}

export default CustomerSalesOrderListPage
