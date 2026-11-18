import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  customerSalesService,
  CstShipmentItemReportRow,
} from '@/services/customerSalesService'
import { masterOutletService } from '@/services/masterOutletService'
import { MasterOutlet } from '@/types/database'
import { printReportA4 } from '@/utils/reportPrintUtils'
import { toast } from 'sonner'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Download, Loader2, Printer, Search, Truck } from 'lucide-react'

export function ReportCustomerShipmentsPage() {
  const { user } = useAuthUser()
  const roleId = Number(user?.user_role)
  const canOpenAllOutlets = [5, 8, 13].includes(roleId)

  const [rows, setRows] = useState<CstShipmentItemReportRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [selectedOutlet, setSelectedOutlet] = useState<string>(
    canOpenAllOutlets ? 'ALL' : user?.kode_outlet || ''
  )
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
    const res = await customerSalesService.getShipmentItemsReport({
      kode_outlet: outletParam,
      startDate,
      endDate,
      customerSearch,
    })

    if (res.isSuccess && res.data) {
      setRows(res.data)
    } else {
      toast.error(res.error || 'Gagal memuat laporan pengiriman barang')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (canOpenAllOutlets || user?.kode_outlet) {
      fetchReport()
    }
  }, [user?.kode_outlet, canOpenAllOutlets]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalQtyShipped = rows.reduce((sum, r) => sum + Number(r.qty_shipped || 0), 0)

  const handleExportCsv = () => {
    if (rows.length === 0) {
      toast.error('Tidak ada data untuk diekspor')
      return
    }

    const headers = [
      'Tanggal Kirim',
      'No. Surat Jalan',
      'No. Pesanan (SO)',
      'Gerai',
      'Nama Customer',
      'SKU',
      'Nama Barang',
      'Qty Dipesan',
      'Qty Dikirim',
      'Satuan',
    ]

    const csvRows = rows.map((r) => [
      format(new Date(r.shipment_date), 'yyyy-MM-dd HH:mm'),
      r.shipment_doc_number,
      r.so_doc_number,
      `"${r.name_outlet}"`,
      `"${r.customer_name}"`,
      r.sku,
      `"${r.item_name}"`,
      r.qty_ordered,
      r.qty_shipped,
      r.uom,
    ])

    const csvContent = [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Laporan_Pengiriman_Customer_${startDate}_sd_${endDate}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrintA4 = async () => {
    if (rows.length === 0) {
      toast.error('Tidak ada data untuk dicetak')
      return
    }

    await printReportA4({
      title: 'Laporan Pengiriman Barang Customer',
      subtitle: 'Rincian kuantitas item pengiriman barang ke customer B2B (tanpa informasi harga).',
      canSelectOutlet: canOpenAllOutlets,
      selectedOutlet,
      userOutletCode: user?.kode_outlet,
      availableOutlets: outletOptions,
      startDate,
      endDate,
      statusLabel: 'Semua Pengiriman',
      extraFilters: customerSearch
        ? [{ label: 'Pencarian Customer', value: customerSearch }]
        : [],
      summaryItems: [
        { label: 'Total Baris Item', value: `${rows.length} Item` },
        { label: 'Total Qty Dikirim', value: totalQtyShipped.toLocaleString('id-ID') },
      ],
      columns: [
        { header: 'Tanggal', width: '75px' },
        { header: 'No. Surat Jalan', width: '115px' },
        { header: 'No. SO', width: '105px' },
        { header: 'Gerai', width: '95px' },
        { header: 'Customer', width: '110px' },
        { header: 'SKU', width: '68px' },
        { header: 'Nama Barang' },
        { header: 'Qty Pesan', align: 'right', width: '58px' },
        { header: 'Qty Kirim', align: 'right', width: '58px' },
        { header: 'Satuan', align: 'center', width: '48px' },
      ],
      rows: rows.map((r) => [
        format(new Date(r.shipment_date), 'dd/MM/yyyy'),
        r.shipment_doc_number,
        r.so_doc_number,
        r.name_outlet,
        r.customer_name,
        r.sku,
        r.item_name,
        r.qty_ordered.toLocaleString('id-ID'),
        r.qty_shipped.toLocaleString('id-ID'),
        r.uom,
      ]),
      totalRow: [
        'TOTAL',
        '',
        '',
        '',
        '',
        '',
        `${rows.length} Baris Item`,
        '',
        totalQtyShipped.toLocaleString('id-ID'),
        '',
      ],
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Lap. Pengiriman Barang (Customer)
            </h1>
            <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Rincian kuantitas barang yang dikirim ke customer B2B.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePrintA4}
              disabled={isLoading || rows.length === 0}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Cetak (A4)
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={isLoading || rows.length === 0}
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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
                  Tampilkan Data
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
                    <TableHead>Tgl Kirim</TableHead>
                    <TableHead>No. Surat Jalan</TableHead>
                    <TableHead>No. SO</TableHead>
                    <TableHead>Gerai</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nama Barang</TableHead>
                    <TableHead className="text-right">Qty Pesan</TableHead>
                    <TableHead className="text-right">Qty Dikirim</TableHead>
                    <TableHead className="text-center">Satuan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                        Memuat data pengiriman...
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Tidak ada data pengiriman barang pada periode yang dipilih.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          {format(new Date(r.shipment_date), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {r.shipment_doc_number}
                        </TableCell>
                        <TableCell className="font-mono">{r.so_doc_number}</TableCell>
                        <TableCell>{r.name_outlet}</TableCell>
                        <TableCell className="font-medium">{r.customer_name}</TableCell>
                        <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                        <TableCell>{r.item_name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {r.qty_ordered.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">
                          {r.qty_shipped.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="text-center text-xs">{r.uom}</TableCell>
                      </TableRow>
                    ))
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

export default ReportCustomerShipmentsPage
