import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek, subDays } from 'date-fns'
import {
  AlertTriangle,
  ArrowLeftRight,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FilterX,
  Gift,
  History,
  Lock,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Store,
  Ticket,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'
import { useAuthUser } from '@/hooks/useAuth'
import {
  gcListService,
  type GcCrossOutletFilter,
  type GcDateField,
  type GcExpiredFilter,
  type GcExtensionDays,
  type GcOutletScope,
  type GcTransactionRow,
  type GcTriState,
} from '@/services/gcListService'
import type { MasterOutlet } from '@/types/database'
import { printReportA4 } from '@/utils/reportPrintUtils'

type DatePreset = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'CUSTOM'

const PAGE_SIZE = 50
const EXPORT_MAX_ROWS = 2000
const MAX_EXPIRED_DAYS_FOR_EXTENSION = 30
const MIN_EXTENSION_NOTES_LENGTH = 10

const EXTENSION_OPTIONS: { days: GcExtensionDays; label: string; addedDays: number }[] = [
  { days: 1, label: '1 Hari', addedDays: 2 },
  { days: 7, label: '1 Minggu', addedDays: 7 },
  { days: 14, label: '2 Minggu', addedDays: 14 },
  { days: 21, label: '3 Minggu', addedDays: 21 },
  { days: 28, label: '4 Minggu', addedDays: 28 },
]

function getExtensionDurationLabel(days: number): string {
  if (days === 1) return '1 Hari'
  if (days === 7) return '1 Minggu (7 Hari)'
  if (days === 14) return '2 Minggu (14 Hari)'
  if (days === 21) return '3 Minggu (21 Hari)'
  if (days === 28) return '4 Minggu (28 Hari)'
  return `${days} Hari`
}

function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'
  } catch {
    return 'Asia/Jakarta'
  }
}

function getDateStrInTimeZone(
  value: Date | string | null | undefined,
  timeZone: string
): string | null {
  if (!value) return null
  try {
    const d = value instanceof Date ? value : new Date(value)
    if (isNaN(d.getTime())) return null
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d)
  } catch {
    return null
  }
}

function getUserTodayStr(timeZone: string): string {
  return getDateStrInTimeZone(new Date(), timeZone) || getWibTodayStr()
}

type GcExtensionEligibilityReason = 'ELIGIBLE' | 'NO_BUY_AT' | 'NOT_EXPIRED_YET' | 'EXCEEDED_30_DAYS'

interface GcExtensionEligibility {
  eligible: boolean
  reason: GcExtensionEligibilityReason
  posExpiredDateStr: string | null
  daysSinceExpired: number | null
  todayUserStr: string
}

function evaluateGcExtensionEligibility(
  row: GcTransactionRow,
  timeZone: string
): GcExtensionEligibility {
  const todayUserStr = getUserTodayStr(timeZone)
  const buyDateUserStr = getDateStrInTimeZone(row.buy_at, timeZone)

  if (!buyDateUserStr) {
    return {
      eligible: false,
      reason: 'NO_BUY_AT',
      posExpiredDateStr: null,
      daysSinceExpired: null,
      todayUserStr,
    }
  }

  const posExpiredDate = addDays(parseISO(buyDateUserStr), 120)
  const posExpiredDateStr = format(posExpiredDate, 'yyyy-MM-dd')
  const daysSinceExpired = differenceInCalendarDays(parseISO(todayUserStr), posExpiredDate)

  if (daysSinceExpired <= 0) {
    return {
      eligible: false,
      reason: 'NOT_EXPIRED_YET',
      posExpiredDateStr,
      daysSinceExpired,
      todayUserStr,
    }
  }

  if (daysSinceExpired > MAX_EXPIRED_DAYS_FOR_EXTENSION) {
    return {
      eligible: false,
      reason: 'EXCEEDED_30_DAYS',
      posExpiredDateStr,
      daysSinceExpired,
      todayUserStr,
    }
  }

  return {
    eligible: true,
    reason: 'ELIGIBLE',
    posExpiredDateStr,
    daysSinceExpired,
    todayUserStr,
  }
}

function computeExpiryExtensionPreview(extensionDays: GcExtensionDays, timeZone: string) {
  const todayUserStr = getUserTodayStr(timeZone)
  const selectedOption = EXTENSION_OPTIONS.find((o) => o.days === extensionDays)
  const totalAddedDays = selectedOption ? selectedOption.addedDays : extensionDays
  const newExpiredDate = addDays(parseISO(todayUserStr), totalAddedDays)
  const newBuyAtDate = subDays(newExpiredDate, 120)

  return {
    todayUserStr,
    totalAddedDays,
    newExpiredDateStr: format(newExpiredDate, 'yyyy-MM-dd'),
    newBuyAtDateStr: format(newBuyAtDate, 'yyyy-MM-dd'),
  }
}

function getWibTodayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getDateRangeForPreset(preset: Exclude<DatePreset, 'CUSTOM'>): { start: string; end: string } {
  const todayStr = getWibTodayStr()
  if (preset === 'TODAY') {
    return { start: todayStr, end: todayStr }
  }
  if (preset === 'THIS_WEEK') {
    const todayDate = parseISO(todayStr)
    const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 })
    return { start: format(weekStart, 'yyyy-MM-dd'), end: todayStr }
  }
  if (preset === 'THIS_MONTH') {
    return { start: `${todayStr.slice(0, 7)}-01`, end: todayStr }
  }
  return { start: `${todayStr.slice(0, 4)}-01-01`, end: todayStr }
}

function formatIdr(value: number | null | undefined): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatCount(count: number | null | undefined): string {
  return new Intl.NumberFormat('id-ID').format(Number(count || 0))
}

function formatDateTimeWib(ts?: string | null): string {
  if (!ts) return '-'
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return String(ts)
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
    return String(ts)
  }
}

function formatDateShortWib(ts?: string | null): string {
  if (!ts) return '-'
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return String(ts)
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d)
  } catch {
    return String(ts)
  }
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

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value)
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function getGcStatusText(row: GcTransactionRow): string {
  if (!row.is_active) return 'Non-Aktif'
  if (row.has_used) return 'Sudah Dipakai'
  if (row.is_expired) return 'Kadaluarsa'
  return 'Belum Dipakai'
}

export function GcListPage() {
  const { user } = useAuthUser()
  const queryClient = useQueryClient()
  const roleId = Number(user?.user_role || 0)
  const isMultiOutlet = [5, 8, 13, 20].includes(roleId)
  const isOutletLocked = [6, 14, 19].includes(roleId)
  const canExtendExpiry = [5, 8, 13].includes(roleId)

  const initialRange = useMemo(() => getDateRangeForPreset('THIS_MONTH'), [])

  // Filter States
  const [dateField, setDateField] = useState<GcDateField>('BUY_AT')
  const [datePreset, setDatePreset] = useState<DatePreset>('THIS_MONTH')
  const [startDate, setStartDate] = useState<string>(initialRange.start)
  const [endDate, setEndDate] = useState<string>(initialRange.end)
  const [outletBuy, setOutletBuy] = useState<string>('ALL')
  const [outletUsed, setOutletUsed] = useState<string>('ALL')
  const [outletScope, setOutletScope] = useState<GcOutletScope>('ALL_OWN')
  const [hasUsed, setHasUsed] = useState<GcTriState>('ALL')
  const [expiredFilter, setExpiredFilter] = useState<GcExpiredFilter>('ALL')
  const [isActive, setIsActive] = useState<GcTriState>('ALL')
  const [crossOutlet, setCrossOutlet] = useState<GcCrossOutletFilter>('ALL')
  const [searchInput, setSearchInput] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')
  const [page, setPage] = useState<number>(1)

  // Modal, Extension & Export State
  const [detailRow, setDetailRow] = useState<GcTransactionRow | null>(null)
  const [showExtendForm, setShowExtendForm] = useState<boolean>(false)
  const [selectedExtensionDays, setSelectedExtensionDays] = useState<GcExtensionDays>(7)
  const [extensionNotes, setExtensionNotes] = useState<string>('')
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [isPrinting, setIsPrinting] = useState<boolean>(false)

  const isGlobalSearchActive = Boolean(debouncedSearch)

  const handleOpenDetail = (row: GcTransactionRow) => {
    setDetailRow(row)
    setShowExtendForm(false)
    setSelectedExtensionDays(7)
    setExtensionNotes('')
  }

  const handleCloseDetail = () => {
    setDetailRow(null)
    setShowExtendForm(false)
    setSelectedExtensionDays(7)
    setExtensionNotes('')
  }

  const userTimeZone = useMemo(() => getUserTimeZone(), [])

  const extendMutation = useMutation({
    mutationFn: async ({
      gcUid,
      extensionDays,
      notes,
      timezone,
    }: {
      gcUid: string
      extensionDays: GcExtensionDays
      notes: string
      timezone: string
    }) => gcListService.extendPosGcExpiry(gcUid, extensionDays, notes, timezone),
    onSuccess: (updated) => {
      setDetailRow((prev) =>
        prev && prev.uid === updated.uid
          ? {
              ...prev,
              buy_at: updated.buy_at,
              original_buy_at: updated.original_buy_at,
              expired_date: updated.expired_date,
              is_expired: updated.is_expired,
              has_been_extended: updated.has_been_extended,
              extension_log: updated.extension_log,
            }
          : prev
      )
      setShowExtendForm(false)
      setExtensionNotes('')
      queryClient.invalidateQueries({ queryKey: ['pos-gc-list'] })
      toast.success(
        `Masa kadaluarsa GC ${updated.gc_number || ''} berhasil diperpanjang s/d ${formatDateOnly(updated.expired_date)}.`
      )
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Gagal memperpanjang masa kadaluarsa GC.')
    },
  })

  const extensionEligibility = useMemo(() => {
    if (!detailRow) return null
    return evaluateGcExtensionEligibility(detailRow, userTimeZone)
  }, [detailRow, userTimeZone])

  const extensionPreview = useMemo(() => {
    if (!detailRow) return null
    return computeExpiryExtensionPreview(selectedExtensionDays, userTimeZone)
  }, [detailRow, selectedExtensionDays, userTimeZone])

  const trimmedNotesLen = extensionNotes.trim().length
  const isNotesValid = trimmedNotesLen >= MIN_EXTENSION_NOTES_LENGTH

  const handleSubmitExtension = () => {
    if (!detailRow) return
    if (!extensionEligibility?.eligible) {
      toast.error('GC ini belum memenuhi syarat perpanjangan (harus sudah kadaluarsa 1–30 hari).')
      return
    }
    if (!isNotesValid) {
      toast.error(`Catatan / keterangan wajib diisi minimal ${MIN_EXTENSION_NOTES_LENGTH} karakter.`)
      return
    }
    extendMutation.mutate({
      gcUid: detailRow.uid,
      extensionDays: selectedExtensionDays,
      notes: extensionNotes.trim(),
      timezone: userTimeZone,
    })
  }

  // Debounce search input (350ms) and reset page to 1
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  // Load Master Outlets (all POS outlets)
  const { data: outlets = [] } = useQuery<MasterOutlet[]>({
    queryKey: ['pos-gc-outlets'],
    queryFn: () => gcListService.getAllPosOutlets(),
    staleTime: 1000 * 60 * 10,
  })

  const userOutletLabel = useMemo(() => {
    const code = user?.kode_outlet || ''
    const found = outlets.find((o) => o.kode_outlet === code)
    const name = found?.name_outlet || user?.outlet?.name_outlet || ''
    return code ? (name ? `[${code}] ${name}` : `[${code}]`) : '-'
  }, [outlets, user?.kode_outlet, user?.outlet?.name_outlet])

  const isDateRangeInvalid = Boolean(
    !debouncedSearch && startDate && endDate && startDate > endDate
  )

  const queryParams = useMemo(
    () => ({
      dateField,
      startDate: startDate || null,
      endDate: endDate || null,
      outletBuy,
      outletUsed,
      outletScope,
      hasUsed,
      expiredFilter,
      isActive,
      crossOutlet,
      search: debouncedSearch,
      page,
      pageSize: PAGE_SIZE,
    }),
    [
      dateField,
      startDate,
      endDate,
      outletBuy,
      outletUsed,
      outletScope,
      hasUsed,
      expiredFilter,
      isActive,
      crossOutlet,
      debouncedSearch,
      page,
    ]
  )

  const {
    data: gcResponse,
    isLoading,
    isFetching,
    error: gcError,
    refetch,
  } = useQuery({
    queryKey: ['pos-gc-list', roleId, user?.kode_outlet, queryParams],
    queryFn: () => gcListService.getPosGcList(queryParams),
    enabled: Boolean(user && !isDateRangeInvalid),
    placeholderData: (prev) => prev,
  })

  const handleApplyPreset = (preset: Exclude<DatePreset, 'CUSTOM'>) => {
    const range = getDateRangeForPreset(preset)
    setDatePreset(preset)
    setStartDate(range.start)
    setEndDate(range.end)
    setPage(1)
  }

  const handleResetFilters = () => {
    const range = getDateRangeForPreset('THIS_MONTH')
    setDateField('BUY_AT')
    setDatePreset('THIS_MONTH')
    setStartDate(range.start)
    setEndDate(range.end)
    setOutletBuy('ALL')
    setOutletUsed('ALL')
    setOutletScope('ALL_OWN')
    setHasUsed('ALL')
    setExpiredFilter('ALL')
    setIsActive('ALL')
    setCrossOutlet('ALL')
    setSearchInput('')
    setDebouncedSearch('')
    setPage(1)
  }

  const buildStatusLabel = (): string => {
    const parts: string[] = []
    if (hasUsed === 'TRUE') parts.push('Sudah Dipakai')
    else if (hasUsed === 'FALSE') parts.push('Belum Dipakai')

    if (expiredFilter === 'EXPIRED') parts.push('Kadaluarsa')
    else if (expiredFilter === 'VALID') parts.push('Masih Berlaku')
    else if (expiredFilter === 'EXPIRING_SOON') parts.push('Expired ≤ 30 Hari')

    if (isActive === 'TRUE') parts.push('Aktif')
    else if (isActive === 'FALSE') parts.push('Non-Aktif')

    if (crossOutlet === 'CROSS_ONLY') parts.push('Lintas Outlet')

    return parts.length > 0 ? parts.join(' • ') : 'Semua Status'
  }

  const handlePrintA4 = async () => {
    if (isDateRangeInvalid) {
      toast.error('Rentang tanggal tidak valid.')
      return
    }
    setIsPrinting(true)
    try {
      const res = await gcListService.getPosGcList({
        ...queryParams,
        page: 1,
        pageSize: EXPORT_MAX_ROWS,
      })

      if (!res.rows.length) {
        toast.error('Tidak ada data Gift Certificate untuk dicetak.')
        return
      }

      if (res.pagination.total_count > EXPORT_MAX_ROWS) {
        toast.info(
          `Menampilkan ${formatCount(EXPORT_MAX_ROWS)} baris terbaru dari total ${formatCount(res.pagination.total_count)} data untuk cetakan A4.`
        )
      }

      const printedRowsSum = res.rows.reduce((sum, r) => sum + Number(r.value || 0), 0)

      const columns = [
        { header: 'No. GC', width: '18%' },
        { header: 'Nama Voucher / GC', width: '21%' },
        { header: 'Nominal', align: 'right' as const, width: '12%' },
        { header: 'Outlet & Tgl Beli', width: '14%' },
        { header: 'Outlet & Tgl Pakai', width: '14%' },
        { header: 'Berlaku s/d', align: 'center' as const, width: '10%' },
        { header: 'Status', align: 'center' as const, width: '11%' },
      ]

      const rows = res.rows.map((r) => [
        r.gc_number || r.gc_barcode || '-',
        r.nama_gc || '-',
        formatIdr(r.value),
        r.kode_outlet_buy
          ? `[${r.kode_outlet_buy}] ${r.buy_at ? formatDateShortWib(r.buy_at) : '-'}`
          : '-',
        r.has_used
          ? `[${r.kode_outlet_used || '-'}] ${r.used_at ? formatDateShortWib(r.used_at) : '-'}`
          : '-',
        formatDateOnly(r.expired_date),
        getGcStatusText(r),
      ])

      const totalRow = [
        'TOTAL CETAK',
        `${formatCount(res.rows.length)} Lembar`,
        formatIdr(printedRowsSum),
        '',
        '',
        '',
        '',
      ]

      const extraFilters: { label: string; value: string }[] = []

      if (debouncedSearch) {
        extraFilters.push({
          label: 'Pencarian Global (Semua Filter Diabaikan)',
          value: debouncedSearch,
        })
      } else {
        extraFilters.push({
          label: 'Basis Tanggal',
          value: dateField === 'USED_AT' ? 'Tanggal Pakai (used_at)' : 'Tanggal Beli (buy_at)',
        })

        if (isMultiOutlet) {
          if (outletBuy !== 'ALL') {
            const ob = outlets.find((o) => o.kode_outlet === outletBuy)
            extraFilters.push({
              label: 'Outlet Beli',
              value: ob ? `[${ob.kode_outlet}] ${ob.name_outlet}` : outletBuy,
            })
          }
          if (outletUsed !== 'ALL') {
            const ou = outlets.find((o) => o.kode_outlet === outletUsed)
            extraFilters.push({
              label: 'Outlet Pakai',
              value: ou ? `[${ou.kode_outlet}] ${ou.name_outlet}` : outletUsed,
            })
          }
        } else if (isOutletLocked) {
          const scopeLabel =
            outletScope === 'BUY_OWN'
              ? 'Dibeli di Outlet Saya'
              : outletScope === 'USED_OWN'
              ? 'Dipakai di Outlet Saya'
              : 'Beli atau Pakai di Outlet Saya'
          extraFilters.push({ label: 'Cakupan Outlet', value: scopeLabel })
        }
      }

      const headerSelectedOutlet = isMultiOutlet
        ? outletBuy !== 'ALL'
          ? outletBuy
          : 'ALL'
        : user?.kode_outlet || 'ALL'

      await printReportA4({
        title: 'Laporan Daftar Gift Certificate (GC List)',
        subtitle:
          'Pemantauan penjualan, pemakaian lintas cabang, masa berlaku, dan saldo outstanding Gift Certificate.',
        canSelectOutlet: isMultiOutlet,
        selectedOutlet: headerSelectedOutlet,
        userOutletCode: user?.kode_outlet,
        availableOutlets: outlets,
        startDate: debouncedSearch ? null : startDate,
        endDate: debouncedSearch ? null : endDate,
        statusLabel: buildStatusLabel(),
        extraFilters,
        summaryItems: [
          {
            label: 'Total GC (Filter)',
            value: `${formatCount(res.summary.total_count)} • ${formatIdr(res.summary.total_value)}`,
          },
          {
            label: 'Belum Dipakai',
            value: `${formatCount(res.summary.unused_valid_count)} • ${formatIdr(res.summary.unused_valid_value)}`,
          },
          {
            label: 'Sudah Dipakai',
            value: `${formatCount(res.summary.used_count)} • ${formatIdr(res.summary.used_value)}`,
          },
          {
            label: 'Kadaluarsa',
            value: `${formatCount(res.summary.expired_count)} • ${formatIdr(res.summary.expired_value)}`,
          },
        ],
        columns,
        rows,
        totalRow,
        rowsPerPage: 22,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyiapkan pratinjau cetak A4.')
    } finally {
      setIsPrinting(false)
    }
  }

  const handleExportCsv = async () => {
    if (isDateRangeInvalid) {
      toast.error('Rentang tanggal tidak valid.')
      return
    }
    setIsExporting(true)
    try {
      const res = await gcListService.getPosGcList({
        ...queryParams,
        page: 1,
        pageSize: EXPORT_MAX_ROWS,
      })

      if (!res.rows.length) {
        toast.error('Tidak ada data Gift Certificate untuk diekspor.')
        return
      }

      if (res.pagination.total_count > EXPORT_MAX_ROWS) {
        toast.info(
          `Mengekspor ${formatCount(EXPORT_MAX_ROWS)} baris terbaru dari total ${formatCount(res.pagination.total_count)} data.`
        )
      }

      const headers = [
        'No. GC',
        'Barcode GC',
        'QR Code',
        'Nama Voucher / GC',
        'Nominal (IDR)',
        'Outlet Beli',
        'Nama Outlet Beli',
        'Tanggal Beli (WIB)',
        'ID Pembayaran Beli',
        'Sudah Dipakai',
        'Outlet Pakai',
        'Nama Outlet Pakai',
        'Tanggal Pakai (WIB)',
        'ID Pembayaran Pakai',
        'Berlaku s/d',
        'Aktif',
        'Status',
      ]

      const csvLines = [
        headers.map(escapeCsvCell).join(','),
        ...res.rows.map((r) =>
          [
            r.gc_number || '',
            r.gc_barcode || '',
            r.qrcode || '',
            r.nama_gc || '',
            r.value,
            r.kode_outlet_buy || '',
            r.outlet_buy_name || '',
            r.buy_at ? formatDateTimeWib(r.buy_at) : '',
            r.id_payment_buy || '',
            r.has_used ? 'YA' : 'TIDAK',
            r.kode_outlet_used || '',
            r.outlet_used_name || '',
            r.used_at ? formatDateTimeWib(r.used_at) : '',
            r.id_payment_used || '',
            r.expired_date || '',
            r.is_active ? 'AKTIF' : 'NON-AKTIF',
            getGcStatusText(r),
          ]
            .map(escapeCsvCell)
            .join(',')
        ),
      ]

      const bom = '\uFEFF'
      const blob = new Blob([bom + csvLines.join('\r\n')], {
        type: 'text/csv;charset=utf-8;',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const ts = format(new Date(), 'yyyyMMdd_HHmm')
      link.href = url
      link.download = `Laporan_GC_List_${ts}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success(`Berhasil mengekspor ${formatCount(res.rows.length)} baris ke CSV.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengekspor CSV.')
    } finally {
      setIsExporting(false)
    }
  }

  const summary = gcResponse?.summary || {
    total_count: 0,
    total_value: 0,
    unused_valid_count: 0,
    unused_valid_value: 0,
    used_count: 0,
    used_value: 0,
    expired_count: 0,
    expired_value: 0,
    cross_outlet_count: 0,
    cross_outlet_value: 0,
  }

  const pagination = gcResponse?.pagination || {
    page: 1,
    page_size: PAGE_SIZE,
    total_count: 0,
    total_pages: 1,
  }

  const rows = gcResponse?.rows || []
  const startIndex = pagination.total_count === 0 ? 0 : (pagination.page - 1) * pagination.page_size + 1
  const endIndex = Math.min(pagination.page * pagination.page_size, pagination.total_count)

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        {/* Header & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif text-zen-charcoal flex items-center gap-2.5">
              <Gift className="h-6 w-6 text-zen-moss" />
              Daftar Gift Certificate (GC List)
            </h1>
            <p className="text-sm text-zen-charcoal/70 mt-1">
              Pemantauan transaksi pembelian, pemakaian antar-gerai, dan masa berlaku voucher Gift Certificate POS.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5 border-zen-border"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintA4}
              disabled={isLoading || isPrinting || pagination.total_count === 0}
              className="gap-1.5 bg-zen-matcha/10 text-zen-moss border-zen-matcha/40 hover:bg-zen-matcha/20"
            >
              <Printer className="h-4 w-4" />
              {isPrinting ? 'Menyiapkan...' : 'Cetak (A4)'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isLoading || isExporting || pagination.total_count === 0}
              className="gap-1.5 border-zen-sand bg-zen-linen/70 text-zen-charcoal hover:bg-zen-sand/30"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Mengekspor...' : 'Ekspor CSV'}
            </Button>
          </div>
        </div>

        {/* Top 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="border-zen-border bg-white dark:bg-zen-stone shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-zen-charcoal/70">
                Total GC (Sesuai Filter)
              </CardTitle>
              <Ticket className="h-4 w-4 text-zen-moss" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zen-charcoal">
                {formatIdr(summary.total_value)}
              </div>
              <p className="text-xs text-zen-charcoal/65 mt-1">
                <strong>{formatCount(summary.total_count)}</strong> lembar voucher
                {summary.cross_outlet_count > 0 && (
                  <span className="ml-1.5 text-zen-moss font-medium">
                    • {formatCount(summary.cross_outlet_count)} lintas outlet
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="border-sky-200 dark:border-sky-900 bg-sky-50/60 dark:bg-sky-950/25 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-sky-900 dark:text-sky-200">
                Belum Dipakai (Berlaku)
              </CardTitle>
              <Clock className="h-4 w-4 text-sky-700 dark:text-sky-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-800 dark:text-sky-200">
                {formatIdr(summary.unused_valid_value)}
              </div>
              <p className="text-xs text-sky-700/80 dark:text-sky-300/80 mt-1">
                <strong>{formatCount(summary.unused_valid_count)}</strong> lembar aktif beredar
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/25 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
                Sudah Dipakai (Redeemed)
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                {formatIdr(summary.used_value)}
              </div>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                <strong>{formatCount(summary.used_count)}</strong> lembar telah ditukar
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/25 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-red-900 dark:text-red-200">
                Kadaluarsa (Expired)
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-700 dark:text-red-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-800 dark:text-red-200">
                {formatIdr(summary.expired_value)}
              </div>
              <p className="text-xs text-red-700/80 dark:text-red-300/80 mt-1">
                <strong>{formatCount(summary.expired_count)}</strong> lembar melewati masa berlaku
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Card */}
        <Card className="border-zen-border bg-white dark:bg-zen-stone shadow-xs">
          <CardHeader className="pb-3 border-b border-zen-border/60 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold text-zen-charcoal">
              Pencarian &amp; Filter Data Gift Certificate
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 px-2.5 text-xs text-zen-charcoal/70 hover:text-zen-charcoal gap-1"
            >
              <FilterX className="h-3.5 w-3.5" />
              Reset Filter
            </Button>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {/* Row 1: Search Box + Date Basis + Date Presets */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-5 space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">
                  Cari Kode GC (No. GC / Barcode / QR Code)
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zen-charcoal/50" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Ketik sebagian/penuh gc_number, gc_barcode, atau qrcode..."
                    className="pl-9 pr-8 bg-white dark:bg-zen-stone border-zen-border"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      aria-label="Hapus pencarian"
                      className="absolute right-2.5 top-2.5 text-zen-charcoal/50 hover:text-zen-charcoal"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {isGlobalSearchActive && (
                  <p className="text-[11px] font-medium text-zen-moss flex items-center gap-1">
                    <Search className="h-3 w-3 shrink-0" />
                    Mode Pencarian Global: mencari di seluruh tabel ot_pos_gc_transaction (semua filter tanggal, outlet, dan status diabaikan sementara)
                  </p>
                )}
              </div>

              <div className="lg:col-span-3 space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">
                  Basis Filter Tanggal
                </Label>
                <Select
                  value={dateField}
                  disabled={isGlobalSearchActive}
                  onValueChange={(val) => {
                    setDateField(val as GcDateField)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="bg-white dark:bg-zen-stone border-zen-border">
                    <div className="flex items-center gap-2 truncate">
                      <Calendar className="h-4 w-4 text-zen-moss shrink-0" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY_AT">Tanggal Beli (buy_at)</SelectItem>
                    <SelectItem value="USED_AT">Tanggal Pakai (used_at)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-4 space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">
                  Preset Periode Cepat
                </Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { key: 'TODAY', label: 'Hari Ini' },
                      { key: 'THIS_WEEK', label: 'Minggu Ini' },
                      { key: 'THIS_MONTH', label: 'Bulan Ini' },
                      { key: 'THIS_YEAR', label: 'Tahun Ini' },
                    ] as const
                  ).map((p) => (
                    <Button
                      key={p.key}
                      type="button"
                      size="sm"
                      disabled={Boolean(debouncedSearch)}
                      variant={datePreset === p.key && !debouncedSearch ? 'default' : 'outline'}
                      onClick={() => handleApplyPreset(p.key)}
                      className={
                        datePreset === p.key && !debouncedSearch
                          ? 'bg-zen-matcha hover:bg-zen-moss text-white text-xs px-2'
                          : 'border-zen-border text-zen-charcoal text-xs px-2'
                      }
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Custom Date Range + Outlet Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">Dari Tanggal</Label>
                <Input
                  type="date"
                  value={startDate}
                  disabled={Boolean(debouncedSearch)}
                  onChange={(e) => {
                    setDatePreset('CUSTOM')
                    setStartDate(e.target.value)
                    setPage(1)
                  }}
                  className="bg-white dark:bg-zen-stone border-zen-border"
                />
              </div>

              <div className="lg:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">Sampai Tanggal</Label>
                <Input
                  type="date"
                  value={endDate}
                  disabled={Boolean(debouncedSearch)}
                  onChange={(e) => {
                    setDatePreset('CUSTOM')
                    setEndDate(e.target.value)
                    setPage(1)
                  }}
                  className="bg-white dark:bg-zen-stone border-zen-border"
                />
              </div>

              {isMultiOutlet ? (
                <>
                  <div className="lg:col-span-4 space-y-1.5">
                    <Label className="text-xs font-semibold text-zen-charcoal">Outlet Beli</Label>
                    <Select
                      value={outletBuy}
                      disabled={isGlobalSearchActive}
                      onValueChange={(val) => {
                        setOutletBuy(val)
                        setPage(1)
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-zen-stone border-zen-border">
                        <div className="flex items-center gap-2 truncate">
                          <Store className="h-4 w-4 text-zen-moss shrink-0" />
                          <SelectValue placeholder="Semua Outlet Beli" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua Outlet Beli</SelectItem>
                        {outlets.map((o) => (
                          <SelectItem key={`buy-${o.kode_outlet}`} value={o.kode_outlet}>
                            [{o.kode_outlet}] {o.name_outlet}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="lg:col-span-4 space-y-1.5">
                    <Label className="text-xs font-semibold text-zen-charcoal">Outlet Pakai</Label>
                    <Select
                      value={outletUsed}
                      disabled={isGlobalSearchActive}
                      onValueChange={(val) => {
                        setOutletUsed(val)
                        setPage(1)
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-zen-stone border-zen-border">
                        <div className="flex items-center gap-2 truncate">
                          <Store className="h-4 w-4 text-zen-moss shrink-0" />
                          <SelectValue placeholder="Semua Outlet Pakai" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua Outlet Pakai</SelectItem>
                        {outlets.map((o) => (
                          <SelectItem key={`used-${o.kode_outlet}`} value={o.kode_outlet}>
                            [{o.kode_outlet}] {o.name_outlet}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="lg:col-span-4 space-y-1.5">
                    <Label className="text-xs font-semibold text-zen-charcoal">
                      Outlet Tugas (Terkunci)
                    </Label>
                    <div className="flex h-10 items-center gap-2 rounded-md border border-zen-border bg-zen-linen/70 dark:bg-black/20 px-3 text-sm font-medium text-zen-charcoal">
                      <Lock className="h-4 w-4 text-zen-moss shrink-0" />
                      <span className="truncate">{userOutletLabel}</span>
                    </div>
                  </div>

                  <div className="lg:col-span-4 space-y-1.5">
                    <Label className="text-xs font-semibold text-zen-charcoal">
                      Cakupan Transaksi Outlet
                    </Label>
                    <Select
                      value={outletScope}
                      disabled={isGlobalSearchActive}
                      onValueChange={(val) => {
                        setOutletScope(val as GcOutletScope)
                        setPage(1)
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-zen-stone border-zen-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL_OWN">Semua Terkait Outlet Saya (Beli atau Pakai)</SelectItem>
                        <SelectItem value="BUY_OWN">Dibeli di Outlet Saya</SelectItem>
                        <SelectItem value="USED_OWN">Dipakai di Outlet Saya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Row 3: Status Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-zen-border/50">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">Status Pemakaian</Label>
                <Select
                  value={hasUsed}
                  disabled={isGlobalSearchActive}
                  onValueChange={(val) => {
                    setHasUsed(val as GcTriState)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="bg-white dark:bg-zen-stone border-zen-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status Pakai</SelectItem>
                    <SelectItem value="FALSE">Belum Dipakai</SelectItem>
                    <SelectItem value="TRUE">Sudah Dipakai</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">Masa Berlaku (Expired)</Label>
                <Select
                  value={expiredFilter}
                  disabled={isGlobalSearchActive}
                  onValueChange={(val) => {
                    setExpiredFilter(val as GcExpiredFilter)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="bg-white dark:bg-zen-stone border-zen-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Masa Berlaku</SelectItem>
                    <SelectItem value="VALID">Masih Berlaku (Belum Dipakai)</SelectItem>
                    <SelectItem value="EXPIRING_SOON">Akan Expired ≤ 30 Hari</SelectItem>
                    <SelectItem value="EXPIRED">Sudah Kadaluarsa (Expired)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">Status Aktif Voucher</Label>
                <Select
                  value={isActive}
                  disabled={isGlobalSearchActive}
                  onValueChange={(val) => {
                    setIsActive(val as GcTriState)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="bg-white dark:bg-zen-stone border-zen-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status Aktif</SelectItem>
                    <SelectItem value="TRUE">Aktif</SelectItem>
                    <SelectItem value="FALSE">Non-Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">Rekonsiliasi Lintas Outlet</Label>
                <Select
                  value={crossOutlet}
                  disabled={isGlobalSearchActive}
                  onValueChange={(val) => {
                    setCrossOutlet(val as GcCrossOutletFilter)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="bg-white dark:bg-zen-stone border-zen-border">
                    <div className="flex items-center gap-2 truncate">
                      <ArrowLeftRight className="h-3.5 w-3.5 text-zen-moss shrink-0" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Transaksi</SelectItem>
                    <SelectItem value="CROSS_ONLY">Lintas Outlet (Beli ≠ Pakai)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isDateRangeInvalid && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                Tanggal mulai tidak boleh lebih besar dari tanggal akhir.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {gcError && (
          <Card className="border-red-300 bg-red-50/80 dark:bg-red-950/30">
            <CardContent className="py-5 flex items-center gap-3 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{gcError instanceof Error ? gcError.message : 'Gagal memuat data GC List.'}</span>
            </CardContent>
          </Card>
        )}

        {/* Data Table Card */}
        <Card className="border-zen-border bg-white dark:bg-zen-stone shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zen-linen/80 dark:bg-black/25 border-b border-zen-border">
                <TableRow>
                  <TableHead className="font-bold text-zen-charcoal">No. GC / Barcode</TableHead>
                  <TableHead className="font-bold text-zen-charcoal">Nama GC</TableHead>
                  <TableHead className="font-bold text-zen-charcoal text-right">Nominal</TableHead>
                  <TableHead className="font-bold text-zen-charcoal">Outlet &amp; Tgl Beli</TableHead>
                  <TableHead className="font-bold text-zen-charcoal">Outlet &amp; Tgl Pakai</TableHead>
                  <TableHead className="font-bold text-zen-charcoal text-center">Berlaku s/d</TableHead>
                  <TableHead className="font-bold text-zen-charcoal text-center">Status</TableHead>
                  <TableHead className="font-bold text-zen-charcoal text-center w-[90px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && !gcResponse ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-sm text-zen-charcoal/70">
                      Memuat daftar Gift Certificate...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-sm text-zen-charcoal/65">
                      Tidak ada data Gift Certificate yang sesuai dengan filter yang dipilih.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const isCross =
                      row.has_used &&
                      Boolean(row.kode_outlet_buy) &&
                      Boolean(row.kode_outlet_used) &&
                      row.kode_outlet_buy !== row.kode_outlet_used

                    return (
                      <TableRow key={row.uid} className="hover:bg-zen-linen/40 dark:hover:bg-white/5">
                        <TableCell>
                          <div className="font-mono text-xs font-bold text-zen-charcoal">
                            {row.gc_number || '-'}
                          </div>
                          {row.gc_barcode && row.gc_barcode !== row.gc_number && (
                            <div className="font-mono text-[11px] text-zen-charcoal/65">
                              BC: {row.gc_barcode}
                            </div>
                          )}
                          {row.qrcode && (
                            <div className="font-mono text-[10px] text-zen-moss truncate max-w-[180px]" title={row.qrcode}>
                              QR: {row.qrcode}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="text-xs font-semibold text-zen-charcoal">
                            {row.nama_gc || '-'}
                          </div>
                          {row.pack_number && (
                            <div className="text-[11px] text-zen-charcoal/60 font-mono">
                              Paket: {row.pack_number}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-right font-mono text-xs font-bold text-zen-charcoal whitespace-nowrap">
                          {formatIdr(row.value)}
                        </TableCell>

                        <TableCell>
                          <div className="text-xs font-medium text-zen-charcoal">
                            {row.kode_outlet_buy
                              ? `[${row.kode_outlet_buy}] ${row.outlet_buy_name || ''}`
                              : '-'}
                          </div>
                          <div className="text-[11px] text-zen-charcoal/65">
                            {formatDateTimeWib(row.buy_at)}
                          </div>
                        </TableCell>

                        <TableCell>
                          {row.has_used ? (
                            <>
                              <div className="text-xs font-medium text-zen-charcoal">
                                {row.kode_outlet_used
                                  ? `[${row.kode_outlet_used}] ${row.outlet_used_name || ''}`
                                  : '-'}
                              </div>
                              <div className="text-[11px] text-zen-charcoal/65">
                                {formatDateTimeWib(row.used_at)}
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-zen-charcoal/45">-</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center text-xs whitespace-nowrap">
                          <span
                            className={
                              row.is_expired
                                ? 'font-semibold text-red-600 dark:text-red-400'
                                : 'text-zen-charcoal/80'
                            }
                          >
                            {formatDateOnly(row.expired_date)}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            {!row.is_active ? (
                              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-[11px]">
                                Non-Aktif
                              </Badge>
                            ) : row.has_used ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[11px]">
                                Sudah Dipakai
                              </Badge>
                            ) : row.is_expired ? (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-[11px]">
                                Kadaluarsa
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-300 text-[11px]">
                                Belum Dipakai
                              </Badge>
                            )}

                            {isCross && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]">
                                Lintas Outlet
                              </Badge>
                            )}

                            {row.has_been_extended && (
                              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 text-[10px]">
                                Diperpanjang 1x
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetail(row)}
                            className="h-7 px-2.5 text-xs gap-1 border-zen-border hover:bg-zen-matcha/10 hover:text-zen-moss"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-zen-border/60 bg-zen-linen/40 dark:bg-black/15 text-xs text-zen-charcoal/75">
            <div>
              Menampilkan <strong>{formatCount(startIndex)}</strong>–<strong>{formatCount(endIndex)}</strong> dari{' '}
              <strong>{formatCount(pagination.total_count)}</strong> data (Halaman{' '}
              <strong>{formatCount(pagination.page)}</strong> dari{' '}
              <strong>{formatCount(pagination.total_pages)}</strong>)
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 gap-1 border-zen-border"
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.total_pages || isFetching}
                onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                className="h-8 gap-1 border-zen-border"
              >
                Berikutnya
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Detail & One-Time Expiry Extension Modal */}
      <Dialog open={Boolean(detailRow)} onOpenChange={(open) => !open && handleCloseDetail()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-lg">
              <Gift className="h-5 w-5 text-zen-moss" />
              Rincian Gift Certificate
            </DialogTitle>
            <DialogDescription>
              {canExtendExpiry
                ? 'Informasi lengkap pembelian, pemakaian, dan masa berlaku Gift Certificate. Role 5, 8, dan 13 dapat memperpanjang masa kadaluarsa maksimal 1 kali khusus untuk GC yang sudah kadaluarsa 1–30 hari.'
                : 'Informasi lengkap status pembelian, pemakaian, dan masa berlaku Gift Certificate (Baca Saja).'}
            </DialogDescription>
          </DialogHeader>

          {detailRow && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-zen-border bg-zen-linen/50 dark:bg-black/20 p-3.5">
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">No. GC</span>
                  <span className="font-mono font-bold text-sm text-zen-charcoal">
                    {detailRow.gc_number || '-'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Nominal Voucher</span>
                  <span className="font-mono font-bold text-sm text-zen-moss">
                    {formatIdr(detailRow.value)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Nama Voucher / Layanan</span>
                  <span className="font-semibold text-zen-charcoal">{detailRow.nama_gc || '-'}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Status Saat Ini</span>
                  <span className="font-semibold text-zen-charcoal">{getGcStatusText(detailRow)}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Barcode GC</span>
                  <span className="font-mono text-zen-charcoal">{detailRow.gc_barcode || '-'}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">QR Code Digital</span>
                  <span className="font-mono text-zen-charcoal break-all">{detailRow.qrcode || '-'}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Nomor Paket</span>
                  <span className="font-mono text-zen-charcoal">{detailRow.pack_number || '-'}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Masa Berlaku (Expired)</span>
                  <span
                    className={`font-semibold ${
                      detailRow.is_expired ? 'text-red-600 dark:text-red-400' : 'text-zen-charcoal'
                    }`}
                  >
                    {formatDateOnly(detailRow.expired_date)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-zen-border p-3.5 space-y-2">
                  <div className="font-bold text-zen-charcoal border-b border-zen-border/60 pb-1.5">
                    Informasi Pembelian
                  </div>
                  <div>
                    <span className="block text-[11px] text-zen-charcoal/60">Outlet Beli</span>
                    <span className="font-semibold text-zen-charcoal">
                      {detailRow.kode_outlet_buy
                        ? `[${detailRow.kode_outlet_buy}] ${detailRow.outlet_buy_name || ''}`
                        : '-'}
                    </span>
                  </div>
                  {detailRow.original_buy_at ? (
                    <>
                      <div>
                        <span className="block text-[11px] text-zen-charcoal/60">Waktu Beli Asli (WIB)</span>
                        <span className="text-zen-charcoal font-medium">
                          {formatDateTimeWib(detailRow.original_buy_at)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-zen-charcoal/60">
                          Waktu Beli Sistem / Sync 120 Hari (WIB)
                        </span>
                        <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                          {formatDateTimeWib(detailRow.buy_at)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div>
                      <span className="block text-[11px] text-zen-charcoal/60">Waktu Beli (WIB)</span>
                      <span className="text-zen-charcoal">{formatDateTimeWib(detailRow.buy_at)}</span>
                    </div>
                  )}
                  <div>
                    <span className="block text-[11px] text-zen-charcoal/60">No. Pembayaran Beli</span>
                    <span className="font-mono text-zen-charcoal">{detailRow.id_payment_buy || '-'}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-zen-border p-3.5 space-y-2">
                  <div className="font-bold text-zen-charcoal border-b border-zen-border/60 pb-1.5">
                    Informasi Pemakaian (Redeem)
                  </div>
                  <div>
                    <span className="block text-[11px] text-zen-charcoal/60">Outlet Pakai</span>
                    <span className="font-semibold text-zen-charcoal">
                      {detailRow.kode_outlet_used
                        ? `[${detailRow.kode_outlet_used}] ${detailRow.outlet_used_name || ''}`
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-zen-charcoal/60">Waktu Pakai (WIB)</span>
                    <span className="text-zen-charcoal">{formatDateTimeWib(detailRow.used_at)}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-zen-charcoal/60">No. Pembayaran Pakai</span>
                    <span className="font-mono text-zen-charcoal">{detailRow.id_payment_used || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Section Perpanjangan Masa Kadaluarsa (Hanya Role 5, 8, 13 & Maks. 1x) */}
              {detailRow.has_been_extended && detailRow.extension_log ? (
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/25 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b border-indigo-200/70 dark:border-indigo-800/70 pb-1.5">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Riwayat Perpanjangan Masa Kadaluarsa
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-indigo-100 text-indigo-800 border-indigo-300 text-[10px]"
                    >
                      Sudah Diperpanjang (Maks. 1x)
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                    <div>
                      <span className="block text-indigo-900/65 dark:text-indigo-300/70">Durasi Pilihan</span>
                      <span className="font-semibold text-indigo-950 dark:text-indigo-100">
                        {detailRow.extension_log.allowance_days > 0
                          ? `${getExtensionDurationLabel(detailRow.extension_log.extension_days)} (+${detailRow.extension_log.total_added_days} hari)`
                          : getExtensionDurationLabel(detailRow.extension_log.extension_days)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-indigo-900/65 dark:text-indigo-300/70">
                        Perubahan Berlaku s/d
                      </span>
                      <span className="font-semibold text-indigo-950 dark:text-indigo-100">
                        {formatDateOnly(detailRow.extension_log.old_expired_date)} →{' '}
                        {formatDateOnly(detailRow.extension_log.new_expired_date)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-indigo-900/65 dark:text-indigo-300/70">Petugas</span>
                      <span className="font-semibold text-indigo-950 dark:text-indigo-100">
                        {detailRow.extension_log.extended_by_name || '-'} (Role{' '}
                        {detailRow.extension_log.extended_by_role})
                      </span>
                    </div>
                    <div>
                      <span className="block text-indigo-900/65 dark:text-indigo-300/70">
                        Waktu Perpanjangan (WIB)
                      </span>
                      <span className="text-indigo-950 dark:text-indigo-100">
                        {formatDateTimeWib(detailRow.extension_log.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-indigo-200/60 dark:border-indigo-800/60">
                    <span className="block text-[11px] text-indigo-900/65 dark:text-indigo-300/70">
                      Catatan / Keterangan
                    </span>
                    <p className="text-xs text-indigo-950 dark:text-indigo-100 whitespace-pre-wrap mt-0.5">
                      {detailRow.extension_log.notes}
                    </p>
                  </div>
                </div>
              ) : canExtendExpiry ? (
                !detailRow.has_used && detailRow.is_active ? (
                  extensionEligibility?.eligible ? (
                    <div className="rounded-xl border border-zen-matcha/40 bg-zen-matcha/5 dark:bg-zen-matcha/10 p-3.5 space-y-3">
                      {!showExtendForm ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="font-bold text-zen-charcoal flex items-center gap-1.5">
                              <CalendarPlus className="h-4 w-4 text-zen-moss" />
                              Perpanjangan Masa Kadaluarsa (Maksimal 1 Kali)
                            </div>
                            <p className="text-[11px] text-zen-charcoal/70">
                              GC melewati masa berlaku 120 hari sejak{' '}
                              <strong>{formatDateOnly(extensionEligibility.posExpiredDateStr)}</strong> (
                              <strong>{extensionEligibility.daysSinceExpired} hari</strong> yang lalu).
                              Menyesuaikan masa berlaku dari hari ini dan tanggal beli sistem (120 hari ZenSystem Desktop).
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setShowExtendForm(true)}
                            className="gap-1.5 bg-zen-matcha hover:bg-zen-moss text-white shrink-0"
                          >
                            <CalendarPlus className="h-4 w-4" />
                            Tambah Masa Kadaluarsa
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 border-b border-zen-border/60 pb-2">
                            <span className="font-bold text-zen-charcoal flex items-center gap-1.5">
                              <CalendarPlus className="h-4 w-4 text-zen-moss" />
                              Tambah Masa Kadaluarsa GC
                            </span>
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]"
                            >
                              Hanya 1x Perpanjangan
                            </Badge>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-zen-charcoal">
                              Pilih Durasi Perpanjangan
                            </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              {EXTENSION_OPTIONS.map((opt) => {
                                const isSelected = selectedExtensionDays === opt.days
                                return (
                                  <button
                                    key={opt.days}
                                    type="button"
                                    onClick={() => setSelectedExtensionDays(opt.days)}
                                    className={`rounded-lg border px-2 py-2.5 text-center font-bold text-xs transition-colors ${
                                      isSelected
                                        ? 'border-zen-moss bg-zen-matcha/15 text-zen-charcoal ring-1 ring-zen-moss'
                                        : 'border-zen-border bg-white dark:bg-zen-stone hover:bg-zen-linen/60 text-zen-charcoal/80'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          {extensionPreview && (
                            <div className="rounded-lg border border-zen-border/80 bg-white dark:bg-zen-stone p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="block text-zen-charcoal/60">Berlaku s/d Baru</span>
                                <span className="font-bold text-zen-moss text-xs">
                                  {formatDateOnly(extensionPreview.newExpiredDateStr)}
                                </span>
                                <span className="block text-[10px] text-zen-charcoal/60">
                                  (+{extensionPreview.totalAddedDays} hari dari hari ini,{' '}
                                  {formatDateOnly(extensionPreview.todayUserStr)})
                                </span>
                              </div>
                              <div>
                                <span className="block text-zen-charcoal/60">
                                  Tanggal Beli Sistem Baru (Sync Desktop 120 Hari)
                                </span>
                                <span className="font-semibold text-zen-charcoal text-xs">
                                  {formatDateOnly(extensionPreview.newBuyAtDateStr)} 12:00 WIB
                                </span>
                                <span className="block text-[10px] text-zen-charcoal/60">
                                  Tanggal beli asli tetap tersimpan di audit
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor="gc-extension-notes"
                                className="text-xs font-semibold text-zen-charcoal"
                              >
                                Catatan / Keterangan <span className="text-red-600">*</span>
                              </Label>
                              <span
                                className={`text-[11px] font-medium ${
                                  isNotesValid ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {trimmedNotesLen} / {MIN_EXTENSION_NOTES_LENGTH} karakter minimal
                              </span>
                            </div>
                            <Textarea
                              id="gc-extension-notes"
                              rows={3}
                              value={extensionNotes}
                              onChange={(e) => setExtensionNotes(e.target.value)}
                              placeholder="Tuliskan alasan perpanjangan masa berlaku GC (minimal 10 karakter), misalnya nama tamu, persetujuan manajemen, atau alasan jadwal ulang..."
                              className="bg-white dark:bg-zen-stone border-zen-border text-xs"
                            />
                          </div>

                          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-900 p-2.5 text-[11px] text-amber-900 dark:text-amber-200">
                            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
                            <span>
                              <strong>Perhatian:</strong> Perpanjangan masa kadaluarsa hanya dapat dilakukan{' '}
                              <strong>1 (satu) kali</strong> per Gift Certificate dan tidak dapat diulang kembali.
                            </span>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={extendMutation.isPending}
                              onClick={() => {
                                setShowExtendForm(false)
                                setExtensionNotes('')
                              }}
                              className="border-zen-border"
                            >
                              Batal
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={!isNotesValid || extendMutation.isPending}
                              onClick={handleSubmitExtension}
                              className="gap-1.5 bg-zen-matcha hover:bg-zen-moss text-white"
                            >
                              <CalendarPlus className="h-4 w-4" />
                              {extendMutation.isPending ? 'Menyimpan...' : 'Simpan Perpanjangan'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/70 p-3 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        {extensionEligibility?.reason === 'NO_BUY_AT' ? (
                          <>
                            Perpanjangan masa kadaluarsa tidak tersedia karena tanggal beli (<code>buy_at</code>)
                            tidak tercatat pada GC ini.
                          </>
                        ) : extensionEligibility?.reason === 'NOT_EXPIRED_YET' ? (
                          <>
                            Perpanjangan masa kadaluarsa belum dapat dilakukan karena GC ini masih berlaku hingga{' '}
                            <strong>{formatDateOnly(extensionEligibility.posExpiredDateStr)}</strong> (berdasarkan{' '}
                            <code>buy_at</code> + 120 hari). Fitur ini hanya tersedia untuk GC yang sudah kadaluarsa
                            1–30 hari.
                          </>
                        ) : (
                          <>
                            Perpanjangan masa kadaluarsa tidak diizinkan karena GC ini telah melewati batas maksimal
                            30 hari sejak tanggal kadaluarsa{' '}
                            <strong>{formatDateOnly(extensionEligibility?.posExpiredDateStr)}</strong> (
                            <strong>{extensionEligibility?.daysSinceExpired ?? '-'} hari</strong> yang lalu
                            berdasarkan <code>buy_at</code> + 120 hari).
                          </>
                        )}
                      </span>
                    </div>
                  )
                ) : (
                  <div className="rounded-xl border border-zen-border/70 bg-zen-linen/40 dark:bg-black/15 p-3 text-[11px] text-zen-charcoal/70 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      Perpanjangan masa kadaluarsa tidak tersedia karena GC ini{' '}
                      <strong>{!detailRow.is_active ? 'berstatus Non-Aktif' : 'sudah dipakai (Redeemed)'}</strong>.
                    </span>
                  </div>
                )
              ) : null}

              <div className="rounded-xl border border-zen-border/70 bg-zen-linen/30 dark:bg-black/15 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zen-charcoal/70">
                <div>
                  <span className="font-semibold">UID Sistem:</span>{' '}
                  <span className="font-mono">{detailRow.uid}</span>
                </div>
                <div>
                  <span className="font-semibold">Masuk Cloud (WIB):</span>{' '}
                  <span>{formatDateTimeWib(detailRow.created_at)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

export default GcListPage
