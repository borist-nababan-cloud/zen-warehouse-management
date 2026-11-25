import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth } from 'date-fns'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  Download,
  History,
  Lock,
  Package,
  Printer,
  RefreshCw,
  Store,
  ZoomIn,
} from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthUser } from '@/hooks/useAuth'
import { masterOutletService } from '@/services/masterOutletService'
import {
  stockCardService,
  type StockCardMode,
  type StockCardSourceCode,
} from '@/services/stockCardService'
import { printStockCardA5 } from '@/utils/stockCardPrintUtils'
import type { MasterOutlet } from '@/types/database'

const SOURCE_BADGE_MAP: Record<StockCardSourceCode, string> = {
  GR: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  STO_IN: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  STO_OUT: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  STO_REJECT: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
  PROD_IN: 'bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30',
  PROD_OUT: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  USAGE: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  RETURN: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  SHRINKAGE: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  CST_SALE: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  OPNAME: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
  PURCHASE_RETURN: 'bg-rose-600/15 text-rose-700 dark:text-rose-300 border-rose-600/30',
}

function formatQty(val: number | null | undefined): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(Number(val || 0))
}

function formatDateOnly(dateStr?: string | null): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`)
    if (isNaN(d.getTime())) return String(dateStr)
    return format(d, 'dd/MMM/yyyy')
  } catch {
    return String(dateStr)
  }
}

function formatDateTimeWib(tsStr?: string | null): string {
  if (!tsStr) return '-'
  try {
    const d = new Date(tsStr)
    if (isNaN(d.getTime())) return String(tsStr)
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
  } catch {
    return String(tsStr)
  }
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value)
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function StockCardPage() {
  const { user } = useAuthUser()
  const roleId = Number(user?.user_role || 0)
  const isOutletLocked = [6, 7, 14].includes(roleId)
  const canChooseAnyOutlet = [5, 8, 13].includes(roleId)

  const [outlets, setOutlets] = useState<MasterOutlet[]>([])
  const [selectedOutlet, setSelectedOutlet] = useState<string>('')
  const [selectedBarangId, setSelectedBarangId] = useState<string>('')
  const [mode, setMode] = useState<StockCardMode>('ALL')
  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  )
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null)

  useEffect(() => {
    masterOutletService
      .getAllWhOutlet()
      .then((list) => setOutlets(list))
      .catch(() => {
        toast.error('Gagal memuat daftar outlet gudang.')
      })
  }, [])

  useEffect(() => {
    if (!user) return
    if (isOutletLocked) {
      setSelectedOutlet(user.kode_outlet || '')
      return
    }
    if (canChooseAnyOutlet && !selectedOutlet && outlets.length > 0) {
      const userHasWhOutlet = outlets.some((o) => o.kode_outlet === user.kode_outlet)
      setSelectedOutlet(userHasWhOutlet && user.kode_outlet ? user.kode_outlet : outlets[0].kode_outlet)
    }
  }, [user, isOutletLocked, canChooseAnyOutlet, outlets, selectedOutlet])

  const effectiveOutlet = isOutletLocked ? user?.kode_outlet || '' : selectedOutlet

  const outletLabel = useMemo(() => {
    const found = outlets.find((o) => o.kode_outlet === effectiveOutlet)
    if (found) return `[${found.kode_outlet}] ${found.name_outlet}`
    return effectiveOutlet ? `[${effectiveOutlet}]` : '-'
  }, [outlets, effectiveOutlet])

  const {
    data: outletItems = [],
    isLoading: isLoadingItems,
  } = useQuery({
    queryKey: ['stock-card-outlet-items', effectiveOutlet],
    queryFn: () => stockCardService.getOutletItemsForStockCard(effectiveOutlet),
    enabled: Boolean(effectiveOutlet),
    staleTime: 1000 * 60 * 2,
  })

  const itemOptions = useMemo(
    () =>
      outletItems.map((it) => ({
        value: String(it.barang_id),
        label: `${it.sku} — ${it.name}`,
        subLabel: `Stok Sistem: ${formatQty(it.qty_on_hand)} ${it.uom}`,
      })),
    [outletItems]
  )

  const isRangeInvalid = mode === 'RANGE' && Boolean(startDate && endDate && startDate > endDate)

  const {
    data: stockCard,
    isLoading: isLoadingCard,
    isFetching: isFetchingCard,
    error: cardError,
    refetch: refetchCard,
  } = useQuery({
    queryKey: [
      'stock-card-detail',
      effectiveOutlet,
      selectedBarangId,
      mode,
      mode === 'RANGE' ? startDate : null,
      mode === 'RANGE' ? endDate : null,
    ],
    queryFn: () =>
      stockCardService.getStockCard({
        kodeOutlet: effectiveOutlet,
        barangId: Number(selectedBarangId),
        mode,
        startDate: mode === 'RANGE' ? startDate : null,
        endDate: mode === 'RANGE' ? endDate : null,
      }),
    enabled: Boolean(effectiveOutlet && selectedBarangId && !isRangeInvalid),
    retry: 1,
  })

  const handleOutletChange = (kode: string) => {
    setSelectedOutlet(kode)
    setSelectedBarangId('')
  }

  const handlePrintA5 = () => {
    if (!stockCard) {
      toast.error('Pilih barang terlebih dahulu untuk mencetak Kartu Stok.')
      return
    }
    const printedBy = user?.full_name || user?.email || 'Pengguna WHMS'
    printStockCardA5(stockCard, printedBy)
  }

  const handleExportCsv = () => {
    if (!stockCard) {
      toast.error('Pilih barang terlebih dahulu untuk mengekspor CSV.')
      return
    }

    const { item, outlet, filter, summary, rows } = stockCard
    const periodeText =
      filter.mode === 'RANGE'
        ? `${formatDateOnly(filter.start_date)} s/d ${formatDateOnly(filter.end_date || format(new Date(), 'yyyy-MM-dd'))}`
        : 'Dari Saldo Awal (Semua Riwayat)'
    const reconText = summary.is_balanced
      ? `Seimbang (${formatQty(summary.system_qty_on_hand)} ${item.uom})`
      : `Anomali Selisih ${summary.discrepancy > 0 ? '+' : ''}${formatQty(summary.discrepancy)} ${item.uom} (Kartu: ${formatQty(summary.calculated_current_balance)} vs Sistem: ${formatQty(summary.system_qty_on_hand)})`

    const csvLines: string[] = [
      ['KARTU STOK (MUTASI PERSEDIAAN)'].map(escapeCsvCell).join(','),
      ['Outlet', `[${outlet.kode_outlet}] ${outlet.name_outlet}`].map(escapeCsvCell).join(','),
      ['SKU', item.sku].map(escapeCsvCell).join(','),
      ['Nama Barang', item.name].map(escapeCsvCell).join(','),
      ['Satuan (UOM)', item.uom].map(escapeCsvCell).join(','),
      ['Periode', periodeText].map(escapeCsvCell).join(','),
      ['Status Rekonsiliasi', reconText].map(escapeCsvCell).join(','),
      '',
      ['Tanggal (WIB)', 'Sumber', 'No. Dokumen', 'Deskripsi', 'Masuk', 'Keluar', 'Saldo']
        .map(escapeCsvCell)
        .join(','),
      [
        formatDateOnly(summary.opening_date),
        'SALDO_AWAL',
        '-',
        summary.opening_label,
        0,
        0,
        summary.opening_balance,
      ]
        .map(escapeCsvCell)
        .join(','),
      ...rows.map((r) =>
        [
          formatDateTimeWib(r.event_ts),
          r.source_label,
          r.doc_number,
          r.has_opname_mismatch
            ? `${r.description} [Anomali Opname: Saldo Kartu ${formatQty(r.balance_before)} != Sistem ${formatQty(r.opname_system_qty)}]`
            : r.description,
          r.in_qty,
          r.out_qty,
          r.balance,
        ]
          .map(escapeCsvCell)
          .join(',')
      ),
      [
        '',
        'TOTAL',
        '',
        `TOTAL MUTASI PERIODE (${item.uom})`,
        summary.total_in,
        summary.total_out,
        summary.closing_balance,
      ]
        .map(escapeCsvCell)
        .join(','),
    ]

    const bom = '\uFEFF'
    const blob = new Blob([bom + csvLines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = format(new Date(), 'yyyyMMdd_HHmm')
    const safeSku = (item.sku || 'ITEM').replace(/[^a-zA-Z0-9_-]/g, '_')
    link.href = url
    link.download = `Kartu_Stok_${outlet.kode_outlet}_${safeSku}_${timestamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('File CSV Kartu Stok berhasil diunduh.')
  }

  const primaryImage =
    stockCard?.item.image1_url || stockCard?.item.image2_url || null

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-16">
        {/* Header & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif text-zen-charcoal flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-zen-moss" />
              Kartu Stok
            </h1>
            <p className="text-sm text-zen-charcoal/70 mt-1">
              Lacak riwayat pergerakan stok masuk, keluar, saldo berjalan per barang, dan audit rekonsiliasi sistem.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchCard()}
              disabled={!stockCard || isFetchingCard}
              className="gap-1.5 border-zen-border"
            >
              <RefreshCw className={`h-4 w-4 ${isFetchingCard ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintA5}
              disabled={!stockCard || isLoadingCard}
              className="gap-1.5 bg-zen-matcha/10 text-zen-moss border-zen-matcha/40 hover:bg-zen-matcha/20"
            >
              <Printer className="h-4 w-4" />
              Cetak (A5)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={!stockCard || isLoadingCard}
              className="gap-1.5 border-zen-sand bg-zen-linen/70 text-zen-charcoal hover:bg-zen-sand/30"
            >
              <Download className="h-4 w-4" />
              Ekspor CSV
            </Button>
          </div>
        </div>

        {/* Filter Card */}
        <Card className="border-zen-border bg-white dark:bg-zen-stone shadow-xs">
          <CardHeader className="pb-3 border-b border-zen-border/60">
            <CardTitle className="text-sm font-bold text-zen-charcoal">
              Filter Kartu Stok (1 Barang per Gudang Outlet)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* Outlet Selector / Locked Display */}
              <div className="md:col-span-4 space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">
                  Outlet / Gudang
                </Label>
                {isOutletLocked ? (
                  <div className="flex h-10 items-center gap-2 rounded-md border border-zen-border bg-zen-linen/70 dark:bg-black/20 px-3 text-sm font-medium text-zen-charcoal">
                    <Lock className="h-4 w-4 text-zen-moss shrink-0" />
                    <span className="truncate">{outletLabel}</span>
                  </div>
                ) : (
                  <Select value={selectedOutlet} onValueChange={handleOutletChange}>
                    <SelectTrigger className="bg-white dark:bg-zen-stone border-zen-border">
                      <div className="flex items-center gap-2 truncate">
                        <Store className="h-4 w-4 text-zen-moss shrink-0" />
                        <SelectValue placeholder="Pilih Outlet..." />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {outlets.map((o) => (
                        <SelectItem key={o.kode_outlet} value={o.kode_outlet}>
                          [{o.kode_outlet}] {o.name_outlet}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Single Item SearchableSelect */}
              <div className="md:col-span-8 space-y-1.5 min-w-0">
                <Label className="text-xs font-semibold text-zen-charcoal">
                  Pilih Barang (Hanya 1 Item) <span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  options={itemOptions}
                  value={selectedBarangId}
                  onChange={setSelectedBarangId}
                  disabled={!effectiveOutlet || isLoadingItems}
                  placeholder={
                    isLoadingItems
                      ? 'Memuat daftar barang...'
                      : 'Cari berdasarkan SKU atau Nama Barang...'
                  }
                />
              </div>
            </div>

            {/* Mode Toggle & Optional Date Range */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-2 border-t border-zen-border/50">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">
                  Mode Periode Mutasi
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === 'ALL' ? 'default' : 'outline'}
                    onClick={() => setMode('ALL')}
                    className={
                      mode === 'ALL'
                        ? 'bg-zen-matcha hover:bg-zen-moss text-white gap-1.5'
                        : 'border-zen-border text-zen-charcoal gap-1.5'
                    }
                  >
                    <History className="h-4 w-4" />
                    Dari Saldo Awal (Semua Riwayat)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={mode === 'RANGE' ? 'default' : 'outline'}
                    onClick={() => setMode('RANGE')}
                    className={
                      mode === 'RANGE'
                        ? 'bg-zen-matcha hover:bg-zen-moss text-white gap-1.5'
                        : 'border-zen-border text-zen-charcoal gap-1.5'
                    }
                  >
                    <CalendarRange className="h-4 w-4" />
                    Rentang Tanggal
                  </Button>
                </div>
              </div>

              {mode === 'RANGE' && (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-zen-charcoal">
                      Dari Tanggal
                    </Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40 bg-white dark:bg-zen-stone border-zen-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-zen-charcoal">
                      Sampai Tanggal
                    </Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40 bg-white dark:bg-zen-stone border-zen-border"
                    />
                  </div>
                </div>
              )}
            </div>

            {isRangeInvalid && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                Tanggal mulai tidak boleh lebih besar dari tanggal akhir.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Empty / Prompt State */}
        {!selectedBarangId && (
          <Card className="border-dashed border-2 border-zen-sand bg-white/70 dark:bg-zen-stone/60">
            <CardContent className="py-12 text-center space-y-2">
              <Package className="h-10 w-10 mx-auto text-zen-moss/70" />
              <p className="text-sm font-semibold text-zen-charcoal">
                Pilih satu barang terlebih dahulu untuk menampilkan Kartu Stok
              </p>
              <p className="text-xs text-zen-charcoal/65 max-w-md mx-auto">
                Anda dapat mencari berdasarkan kode SKU atau nama barang, lalu melihat riwayat lengkap mutasi sejak saldo awal maupun pada rentang tanggal tertentu.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {selectedBarangId && isLoadingCard && (
          <Card className="border-zen-border bg-white dark:bg-zen-stone">
            <CardContent className="py-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zen-matcha border-t-transparent mx-auto" />
              <p className="text-xs text-zen-charcoal/70 mt-3">
                Menghitung mutasi &amp; rekonsiliasi Kartu Stok...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {selectedBarangId && cardError && (
          <Card className="border-red-300 bg-red-50/80 dark:bg-red-950/30">
            <CardContent className="py-6 flex items-center gap-3 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>
                {cardError instanceof Error
                  ? cardError.message
                  : 'Terjadi kesalahan saat memuat Kartu Stok.'}
              </span>
            </CardContent>
          </Card>
        )}

        {/* Stock Card Data Display */}
        {stockCard && !isLoadingCard && (
          <>
            {/* Item Header Card */}
            <Card className="border-zen-border bg-white dark:bg-zen-stone shadow-xs">
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Product Image + SKU + Name */}
                  <div className="flex items-center gap-4 min-w-0">
                    {primaryImage ? (
                      <button
                        type="button"
                        onClick={() => setZoomImageUrl(primaryImage)}
                        title="Klik untuk memperbesar foto barang"
                        className="group relative h-20 w-20 shrink-0 rounded-xl overflow-hidden border border-zen-sand bg-zen-linen shadow-xs"
                      >
                        <img
                          src={primaryImage}
                          alt={stockCard.item.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-colors">
                          <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </button>
                    ) : (
                      <div className="h-20 w-20 shrink-0 rounded-xl border border-zen-border bg-zen-linen dark:bg-black/20 flex items-center justify-center">
                        <Package className="h-8 w-8 text-zen-moss/70" />
                      </div>
                    )}

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-zen-matcha/15 px-2.5 py-0.5 text-xs font-mono font-bold text-zen-moss dark:text-zen-matcha border border-zen-matcha/30">
                          SKU: {stockCard.item.sku}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-zen-linen dark:bg-black/20 px-2 py-0.5 text-xs font-semibold text-zen-charcoal border border-zen-border">
                          Satuan: {stockCard.item.uom}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-zen-linen dark:bg-black/20 px-2 py-0.5 text-xs font-medium text-zen-charcoal/80 border border-zen-border">
                          [{stockCard.outlet.kode_outlet}] {stockCard.outlet.name_outlet}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-zen-charcoal break-words">
                        {stockCard.item.name}
                      </h2>
                      <p className="text-xs text-zen-charcoal/65">
                        Periode:{' '}
                        <strong>
                          {stockCard.filter.mode === 'RANGE'
                            ? `${formatDateOnly(stockCard.filter.start_date)} s/d ${formatDateOnly(stockCard.filter.end_date || endDate)}`
                            : 'Dari Saldo Awal (Semua Riwayat)'}
                        </strong>{' '}
                        • {stockCard.rows.length} mutasi tercatat
                      </p>
                    </div>
                  </div>

                  {/* 4 Summary Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                    <div className="rounded-xl border border-zen-border bg-zen-linen/50 dark:bg-black/20 px-3.5 py-2.5">
                      <p className="text-[11px] font-medium text-zen-charcoal/65">
                        Saldo Awal
                      </p>
                      <p className="text-lg font-bold text-zen-charcoal mt-0.5">
                        {formatQty(stockCard.summary.opening_balance)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 px-3.5 py-2.5">
                      <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <ArrowDownRight className="h-3.5 w-3.5" />
                        Total Masuk
                      </p>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                        +{formatQty(stockCard.summary.total_in)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30 px-3.5 py-2.5">
                      <p className="text-[11px] font-medium text-red-700 dark:text-red-300 flex items-center gap-1">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        Total Keluar
                      </p>
                      <p className="text-lg font-bold text-red-700 dark:text-red-300 mt-0.5">
                        -{formatQty(stockCard.summary.total_out)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-zen-matcha/40 bg-zen-matcha/10 px-3.5 py-2.5">
                      <p className="text-[11px] font-semibold text-zen-moss dark:text-zen-matcha">
                        Saldo Akhir
                      </p>
                      <p className="text-lg font-bold text-zen-moss dark:text-zen-matcha mt-0.5">
                        {formatQty(stockCard.summary.closing_balance)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Forensic Reconciliation Status Banner */}
            {stockCard.summary.is_balanced ? (
              <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Seimbang — Saldo kalkulasi seluruh riwayat kartu stok (
                    {formatQty(stockCard.summary.calculated_current_balance)}{' '}
                    {stockCard.item.uom}) sinkron 100% dengan Stok Sistem saat ini.
                  </span>
                </div>
                <span className="font-mono font-bold">
                  Stok Sistem: {formatQty(stockCard.summary.system_qty_on_hand)}{' '}
                  {stockCard.item.uom}
                </span>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-950/40 px-4 py-3.5 space-y-2 text-xs text-red-800 dark:text-red-200">
                <div className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span>
                    Terdeteksi Anomali Selisih Stok:{' '}
                    {stockCard.summary.discrepancy > 0 ? '+' : ''}
                    {formatQty(stockCard.summary.discrepancy)} {stockCard.item.uom}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="rounded-lg bg-white/80 dark:bg-black/25 px-3 py-2 border border-red-200 dark:border-red-800">
                    <span className="block text-[11px] opacity-75">
                      Kalkulasi Riwayat Kartu Stok (s/d Sekarang)
                    </span>
                    <strong className="text-sm">
                      {formatQty(stockCard.summary.calculated_current_balance)}{' '}
                      {stockCard.item.uom}
                    </strong>
                  </div>
                  <div className="rounded-lg bg-white/80 dark:bg-black/25 px-3 py-2 border border-red-200 dark:border-red-800">
                    <span className="block text-[11px] opacity-75">
                      Stok Tercatat di Sistem (inventory_balance)
                    </span>
                    <strong className="text-sm">
                      {formatQty(stockCard.summary.system_qty_on_hand)}{' '}
                      {stockCard.item.uom}
                    </strong>
                  </div>
                  <div className="rounded-lg bg-white/80 dark:bg-black/25 px-3 py-2 border border-red-200 dark:border-red-800">
                    <span className="block text-[11px] opacity-75">
                      Selisih (Sistem − Kalkulasi)
                    </span>
                    <strong className="text-sm">
                      {stockCard.summary.discrepancy > 0 ? '+' : ''}
                      {formatQty(stockCard.summary.discrepancy)} {stockCard.item.uom}
                    </strong>
                  </div>
                </div>
                {stockCard.summary.opname_mismatch_count > 0 && (
                  <p className="text-[11px] font-medium">
                    Ditemukan{' '}
                    <strong>{stockCard.summary.opname_mismatch_count} titik Stock Opname</strong>{' '}
                    yang saldo sebelum opname-nya tidak cocok dengan <code>system_qty</code>{' '}
                    dokumen opname (ditandai pada tabel di bawah).
                  </p>
                )}
              </div>
            )}

            {/* Ledger Detail Table */}
            <Card className="border-zen-border bg-white dark:bg-zen-stone shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zen-linen/80 dark:bg-black/25 border-b border-zen-border text-zen-charcoal/80">
                    <tr>
                      <th className="px-4 py-3 font-bold w-40">Tanggal (WIB)</th>
                      <th className="px-4 py-3 font-bold">Deskripsi (Sumber &amp; Dokumen)</th>
                      <th className="px-4 py-3 font-bold text-right w-28">Masuk</th>
                      <th className="px-4 py-3 font-bold text-right w-28">Keluar</th>
                      <th className="px-4 py-3 font-bold text-right w-28">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zen-border/50">
                    {/* Mandatory First Row: Opening Balance */}
                    <tr className="bg-zen-linen/60 dark:bg-white/5 font-semibold">
                      <td className="px-4 py-3 whitespace-nowrap text-zen-charcoal">
                        {formatDateOnly(stockCard.summary.opening_date)}
                      </td>
                      <td className="px-4 py-3 text-zen-charcoal">
                        <span className="inline-flex items-center rounded-full border border-zen-sand bg-white dark:bg-zen-stone px-2 py-0.5 text-[10px] font-bold mr-2">
                          SALDO AWAL
                        </span>
                        {stockCard.summary.opening_label}
                      </td>
                      <td className="px-4 py-3 text-right text-zen-charcoal/50">-</td>
                      <td className="px-4 py-3 text-right text-zen-charcoal/50">-</td>
                      <td className="px-4 py-3 text-right font-bold text-zen-charcoal">
                        {formatQty(stockCard.summary.opening_balance)}
                      </td>
                    </tr>

                    {stockCard.rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-zen-charcoal/60"
                        >
                          Tidak ada transaksi mutasi pada periode yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      stockCard.rows.map((row) => {
                        const badgeCls =
                          SOURCE_BADGE_MAP[row.source_code] ||
                          'bg-slate-100 text-slate-700 border-slate-300'
                        return (
                          <tr
                            key={`${row.source_code}-${row.id}`}
                            className={`hover:bg-zen-linen/40 dark:hover:bg-white/5 ${
                              row.has_opname_mismatch
                                ? 'bg-red-50/60 dark:bg-red-950/20'
                                : ''
                            }`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-zen-charcoal/85">
                              {formatDateTimeWib(row.event_ts)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeCls}`}
                                >
                                  {row.source_label}
                                </span>
                                {row.has_opname_mismatch && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] font-bold">
                                    <AlertTriangle className="h-3 w-3" />
                                    Anomali Opname (Kartu: {formatQty(row.balance_before)} ≠ Sistem:{' '}
                                    {formatQty(row.opname_system_qty)})
                                  </span>
                                )}
                              </div>
                              <p className="text-zen-charcoal font-medium leading-snug">
                                {row.description}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-emerald-700 dark:text-emerald-300">
                              {row.in_qty > 0 ? `+${formatQty(row.in_qty)}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-red-700 dark:text-red-300">
                              {row.out_qty > 0 ? `-${formatQty(row.out_qty)}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-zen-charcoal">
                              {formatQty(row.balance)}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zen-linen/80 dark:bg-black/30 border-t-2 border-zen-border font-bold">
                      <td colSpan={2} className="px-4 py-3 text-right text-zen-charcoal">
                        TOTAL MUTASI PERIODE ({stockCard.item.uom})
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-300">
                        +{formatQty(stockCard.summary.total_in)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-700 dark:text-red-300">
                        -{formatQty(stockCard.summary.total_out)}
                      </td>
                      <td className="px-4 py-3 text-right text-zen-moss dark:text-zen-matcha">
                        {formatQty(stockCard.summary.closing_balance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* Product Image Zoom Modal */}
        <Dialog open={Boolean(zoomImageUrl)} onOpenChange={() => setZoomImageUrl(null)}>
          <DialogContent className="max-w-lg bg-white dark:bg-zen-stone border-zen-border">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-zen-charcoal">
                {stockCard?.item.sku} — {stockCard?.item.name}
              </DialogTitle>
            </DialogHeader>
            {zoomImageUrl && (
              <div className="flex items-center justify-center rounded-xl overflow-hidden bg-zen-linen dark:bg-black/20 p-2">
                <img
                  src={zoomImageUrl}
                  alt={stockCard?.item.name || 'Foto Barang'}
                  className="max-h-[65vh] w-auto object-contain rounded-lg"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default StockCardPage
