import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { customerSalesService } from '@/services/customerSalesService'
import { masterOutletService } from '@/services/masterOutletService'
import { CstSalesOrder, CstSalesOrderStatus, MasterOutlet } from '@/types/database'
import { printFakturPenjualanA5, printSuratJalanA5 } from '@/utils/customerPrintUtils'
import { printReportA4 } from '@/utils/reportPrintUtils'
import { toast } from 'sonner'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Download, FileText, Loader2, Printer, Search } from 'lucide-react'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0)

export function ReportCustomerSalesPage() {
  const { user } = useAuthUser()
  const roleId = Number(user?.user_role)
  const canOpenAllOutlets = [5, 8, 13].includes(roleId)

  const [orders, setOrders] = useState<CstSalesOrder[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [selectedOutlet, setSelectedOutlet] = useState<string>(
    canOpenAllOutlets ? 'ALL' : user?.kode_outlet || ''
  )
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [customerSearch, setCustomerSearch] = useState('')
  const [outletOptions, setOutletOptions] = useState<MasterOutlet[]>([])

  useEffect(() => {
    if (!canOpenAllOutlets && user?.kode_outlet) {
      setSelectedOutlet(user.kode_outlet)
    } else if (canOpenAllOutlets) {
      setSelectedOutlet('ALL')
      masterOutletService
        .getAllWhOutlet()
        .then(setOutletOptions)
        .catch((err) => console.error('Gagal memuat daftar outlet:', err))
    }
  }, [canOpenAllOutlets, user?.kode_outlet])

  const fetchReport = async () => {
    if (!canOpenAllOutlets && !user?.kode_outlet) return

    setIsLoading(true)
    const outletParam = canOpenAllOutlets ? selectedOutlet : user?.kode_outlet || ''
    const res = await customerSalesService.getSalesOrders({
      kode_outlet: outletParam,
      startDate,
      endDate,
      statuses:
        statusFilter !== 'ALL' ? [statusFilter as CstSalesOrderStatus] : undefined,
      customerSearch,
    })

    if (res.isSuccess && res.data) {
      setOrders(res.data)
    } else {
      toast.error(res.error || 'Gagal memuat laporan penjualan customer')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (canOpenAllOutlets || user?.kode_outlet) {
      fetchReport()
    }
  }, [user?.kode_outlet, canOpenAllOutlets]) // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="secondary">DRAFT</Badge>
      case 'ISSUED':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">ISSUED</Badge>
      case 'SHIPPED':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">SHIPPED</Badge>
      case 'INVOICED':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">INVOICED</Badge>
      case 'PAID':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">PAID</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">CANCELLED</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getEffectiveTotal = (so: CstSalesOrder) => {
    const inv = so.cst_invoices?.[0]
    return inv ? Number(inv.grand_total || 0) : Number(so.total_amount || 0)
  }

  const totalNilaiPenjualan = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + getEffectiveTotal(o), 0)

  const totalPaid = orders
    .filter((o) => o.status === 'PAID')
    .reduce((sum, o) => sum + getEffectiveTotal(o), 0)

  const handleExportCsv = () => {
    if (orders.length === 0) {
      toast.error('Tidak ada data untuk diekspor')
      return
    }

    const headers = [
      'Tanggal Pesan',
      'No. SO',
      'No. Surat Jalan',
      'No. Faktur',
      'Gerai',
      'Nama Customer',
      'Total Tagihan',
      'Status',
    ]

    const csvRows = orders.map((so) => [
      so.order_date,
      so.document_number,
      so.cst_shipments?.[0]?.document_number || '-',
      so.cst_invoices?.[0]?.document_number || '-',
      `"${so.master_outlet?.name_outlet || so.kode_outlet}"`,
      `"${so.master_customer?.name || '-'}"`,
      getEffectiveTotal(so),
      so.status,
    ])

    const csvContent = [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Laporan_Penjualan_Customer_${startDate}_sd_${endDate}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrintA4 = async () => {
    if (orders.length === 0) {
      toast.error('Tidak ada data untuk dicetak')
      return
    }

    await printReportA4({
      title: 'Laporan Penjualan Customer (B2B)',
      subtitle: 'Rekapitulasi Pesanan Penjualan, Surat Jalan, Faktur, dan Status Pelunasan.',
      canSelectOutlet: canOpenAllOutlets,
      selectedOutlet,
      userOutletCode: user?.kode_outlet,
      availableOutlets: outletOptions,
      startDate,
      endDate,
      statusLabel: statusFilter === 'ALL' ? 'Semua Status' : statusFilter,
      extraFilters: customerSearch
        ? [{ label: 'Pencarian Customer', value: customerSearch }]
        : [],
      summaryItems: [
        { label: 'Total Dokumen SO', value: `${orders.length} Dokumen` },
        { label: 'Total Penjualan Aktif', value: formatCurrency(totalNilaiPenjualan) },
        { label: 'Total Sudah Lunas (PAID)', value: formatCurrency(totalPaid) },
      ],
      columns: [
        { header: 'Tgl Pesan', width: '75px' },
        { header: 'No. SO', width: '115px' },
        { header: 'No. Surat Jalan', width: '110px' },
        { header: 'No. Faktur', width: '115px' },
        { header: 'Gerai', width: '95px' },
        { header: 'Customer' },
        { header: 'Total', align: 'right', width: '105px' },
        { header: 'Status', align: 'center', width: '70px' },
      ],
      rows: orders.map((so) => [
        so.order_date ? format(new Date(so.order_date), 'dd/MM/yyyy') : '-',
        so.document_number,
        so.cst_shipments?.[0]?.document_number || '-',
        so.cst_invoices?.[0]?.document_number || '-',
        so.master_outlet?.name_outlet || so.kode_outlet,
        so.master_customer?.name || '-',
        formatCurrency(getEffectiveTotal(so)),
        so.status,
      ]),
      totalRow: [
        'TOTAL',
        '',
        '',
        '',
        '',
        `${orders.length} Dokumen`,
        formatCurrency(totalNilaiPenjualan),
        '',
      ],
    })
  }

  const printedByName = user?.full_name || user?.email || 'Petugas'

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Lap. Penjualan (Customer)
            </h1>
            <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Laporan Pesanan Penjualan B2B, status pelunasan (PAID), dan cetak ulang dokumen A5.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePrintA4}
              disabled={isLoading || orders.length === 0}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Cetak (A4)
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={isLoading || orders.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Ekspor CSV
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filter Laporan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div className="space-y-1.5">
                <Label>Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Selesai</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {canOpenAllOutlets && (
                <div className="space-y-1.5">
                  <Label>Gerai / Outlet</Label>
                  <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Outlet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Outlet</SelectItem>
                      {outletOptions.map((o) => (
                        <SelectItem key={o.kode_outlet} value={o.kode_outlet}>
                          [{o.kode_outlet}] {o.name_outlet}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status</SelectItem>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="ISSUED">ISSUED</SelectItem>
                    <SelectItem value="SHIPPED">SHIPPED</SelectItem>
                    <SelectItem value="INVOICED">INVOICED</SelectItem>
                    <SelectItem value="PAID">PAID</SelectItem>
                    <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Cari Nama Customer</Label>
                <Input
                  placeholder="Ketik nama customer..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>

              <div>
                <Button onClick={fetchReport} disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Tgl Pesan</TableHead>
                    <TableHead>No. SO</TableHead>
                    <TableHead>No. Surat Jalan</TableHead>
                    <TableHead>No. Faktur</TableHead>
                    <TableHead>Gerai</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Cetak Ulang (A5)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                        Memuat laporan penjualan...
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Tidak ada data pesanan penjualan pada periode yang dipilih.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((so) => {
                      const sj = so.cst_shipments?.[0]
                      const inv = so.cst_invoices?.[0]

                      return (
                        <TableRow key={so.id}>
                          <TableCell>
                            {so.order_date ? format(new Date(so.order_date), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell className="font-mono font-semibold">
                            {so.document_number}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {sj?.document_number || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {inv?.document_number || '-'}
                          </TableCell>
                          <TableCell>{so.master_outlet?.name_outlet || so.kode_outlet}</TableCell>
                          <TableCell className="font-medium">
                            {so.master_customer?.name || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(getEffectiveTotal(so))}
                          </TableCell>
                          <TableCell>{getStatusBadge(so.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2"
                                disabled={!sj}
                                title="Cetak Ulang Surat Jalan (A5)"
                                onClick={() => printSuratJalanA5(so, printedByName)}
                              >
                                <Printer className="h-3.5 w-3.5 mr-1" />
                                Surat Jalan
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2"
                                disabled={!inv}
                                title="Cetak Ulang Faktur Penjualan (A5)"
                                onClick={() => printFakturPenjualanA5(so, printedByName)}
                              >
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                Faktur
                              </Button>
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

export default ReportCustomerSalesPage
