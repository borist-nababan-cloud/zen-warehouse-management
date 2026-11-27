import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, format, parseISO, subDays } from 'date-fns'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Eye,
  FilterX,
  Gift,
  Image as ImageIcon,
  Lock,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Ticket,
  TicketCheck,
  TicketPlus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { SearchableSelect } from '@/components/ui/searchable-select'
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
  gcComplimentService,
  type GcComplimentRow,
  type GcComplimentTriState,
  type WebServiceOption,
} from '@/services/gcComplimentService'

type DatePreset = 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR' | 'ALL' | 'CUSTOM'

const PAGE_SIZE = 50
const EXPORT_MAX_ROWS = 2000

function getWibTodayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getDateRangeForPreset(
  preset: Exclude<DatePreset, 'CUSTOM'>
): { start: string; end: string } {
  if (preset === 'ALL') {
    return { start: '', end: '' }
  }
  const todayStr = getWibTodayStr()
  if (preset === 'THIS_WEEK') {
    const start = format(subDays(parseISO(todayStr), 7), 'yyyy-MM-dd')
    return { start, end: todayStr }
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

function buildPreviewGcNumber(prefix: string, seq: number): string {
  const cleanPrefix = prefix.trim().toUpperCase().replace(/^\.+|\.+$/g, '')
  const padded = String(Math.max(1, seq)).padStart(4, '0')
  return cleanPrefix ? `111.${cleanPrefix}.${padded}` : `111.<PREFIX>.${padded}`
}

function stripDigits(gcNumber: string): string {
  return gcNumber.replace(/[^0-9]/g, '')
}

function getComplimentStatusLabel(row: GcComplimentRow): string {
  if (row.has_used) return 'Sudah Dipakai'
  if (row.is_active) return 'Aktif (Belum Dipakai)'
  return 'Draft (Belum Aktif)'
}

export function GcComplimentPage() {
  const { user } = useAuthUser()
  const queryClient = useQueryClient()
  const todayStr = useMemo(() => getWibTodayStr(), [])
  const initialRange = useMemo(() => getDateRangeForPreset('THIS_WEEK'), [])

  // Generator Form State
  const [showGenerator, setShowGenerator] = useState<boolean>(true)
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [namaGc, setNamaGc] = useState<string>('')
  const [hargaJasa, setHargaJasa] = useState<string>('0')
  const [hargaJual, setHargaJual] = useState<string>('0')
  const [prefixInput, setPrefixInput] = useState<string>('')
  const [startNumberInput, setStartNumberInput] = useState<string>('1')
  const [countInput, setCountInput] = useState<string>('1')
  const [notesInput, setNotesInput] = useState<string>('')
  const [imageProgress, setImageProgress] = useState<{
    label: string
    done: number
    total: number
  } | null>(null)

  // List Filter State
  const [datePreset, setDatePreset] = useState<DatePreset>('THIS_WEEK')
  const [startDate, setStartDate] = useState<string>(initialRange.start)
  const [endDate, setEndDate] = useState<string>(initialRange.end)
  const [isActiveFilter, setIsActiveFilter] = useState<GcComplimentTriState>('ALL')
  const [hasUsedFilter, setHasUsedFilter] = useState<GcComplimentTriState>('ALL')
  const [serviceFilter, setServiceFilter] = useState<string>('ALL')
  const [searchInput, setSearchInput] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')
  const [page, setPage] = useState<number>(1)

  // Selection, Activation & Preview Modal State
  const [selectedRowMap, setSelectedRowMap] = useState<Record<string, GcComplimentRow>>({})
  const [showActivateModal, setShowActivateModal] = useState<boolean>(false)
  const [packNumberInput, setPackNumberInput] = useState<string>('')
  const [detailRow, setDetailRow] = useState<GcComplimentRow | null>(null)
  const [isRerenderingSingle, setIsRerenderingSingle] = useState<boolean>(false)
  const [isExporting, setIsExporting] = useState<boolean>(false)

  // Debounce search (350ms)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  // Load Active Services from web_services
  const { data: webServices = [], isLoading: isLoadingServices } = useQuery<WebServiceOption[]>({
    queryKey: ['pos-gc-compliment-web-services'],
    queryFn: () => gcComplimentService.getActiveWebServices(),
    staleTime: 1000 * 60 * 10,
  })

  const selectedService = useMemo(
    () => webServices.find((s) => s.id === selectedServiceId) || null,
    [webServices, selectedServiceId]
  )

  const serviceSelectOptions = useMemo(
    () =>
      webServices.map((s) => ({
        value: s.id,
        label: `[${s.category}] ${s.name}`,
        subLabel: `${s.duration_minutes} Menit • ${s.service_code}`,
      })),
    [webServices]
  )

  const handleSelectService = (serviceId: string) => {
    setSelectedServiceId(serviceId)
    const found = webServices.find((s) => s.id === serviceId)
    if (found) {
      setNamaGc(`${found.duration_minutes} MIN ${found.name}`)
    }
  }

  const isDateRangeInvalid = Boolean(
    !debouncedSearch && startDate && endDate && startDate > endDate
  )

  const queryParams = useMemo(
    () => ({
      startDate: startDate || null,
      endDate: endDate || null,
      isActive: isActiveFilter,
      hasUsed: hasUsedFilter,
      webServiceId: serviceFilter,
      search: debouncedSearch,
      page,
      pageSize: PAGE_SIZE,
    }),
    [startDate, endDate, isActiveFilter, hasUsedFilter, serviceFilter, debouncedSearch, page]
  )

  const {
    data: listResponse,
    isLoading,
    isFetching,
    error: listError,
    refetch,
  } = useQuery({
    queryKey: ['pos-gc-compliment-list', user?.id, user?.user_role, user?.kode_outlet, queryParams],
    queryFn: () => gcComplimentService.getList(queryParams),
    enabled: Boolean(user && !isDateRangeInvalid),
    placeholderData: (prev) => prev,
  })

  const rows = listResponse?.rows || []
  const summary = listResponse?.summary || {
    total_count: 0,
    total_harga_jasa: 0,
    draft_count: 0,
    active_unused_count: 0,
    used_count: 0,
  }
  const pagination = listResponse?.pagination || {
    page: 1,
    page_size: PAGE_SIZE,
    total_count: 0,
    total_pages: 1,
  }

  // Keep selectedRowMap clean if any row is already active
  useEffect(() => {
    if (rows.length === 0) return
    setSelectedRowMap((prev) => {
      let changed = false
      const next = { ...prev }
      for (const r of rows) {
        if (next[r.uid] && r.is_active) {
          delete next[r.uid]
          changed = true
        } else if (next[r.uid]) {
          next[r.uid] = r
        }
      }
      return changed ? next : prev
    })
  }, [rows])

  const selectedRows = useMemo(() => Object.values(selectedRowMap), [selectedRowMap])
  const selectedUids = useMemo(() => selectedRows.map((r) => r.uid), [selectedRows])

  const draftRowsOnPage = useMemo(() => rows.filter((r) => !r.is_active), [rows])
  const allDraftOnPageSelected =
    draftRowsOnPage.length > 0 && draftRowsOnPage.every((r) => Boolean(selectedRowMap[r.uid]))

  const toggleSelectRow = (row: GcComplimentRow) => {
    if (row.is_active) return
    setSelectedRowMap((prev) => {
      const next = { ...prev }
      if (next[row.uid]) {
        delete next[row.uid]
      } else {
        next[row.uid] = row
      }
      return next
    })
  }

  const toggleSelectAllOnPage = () => {
    setSelectedRowMap((prev) => {
      const next = { ...prev }
      if (allDraftOnPageSelected) {
        for (const r of draftRowsOnPage) {
          delete next[r.uid]
        }
      } else {
        for (const r of draftRowsOnPage) {
          next[r.uid] = r
        }
      }
      return next
    })
  }

  // Generator Live Preview Calculation
  const parsedStartNum = Math.max(1, parseInt(startNumberInput || '1', 10) || 1)
  const parsedCount = Math.min(100, Math.max(1, parseInt(countInput || '1', 10) || 1))
  const parsedHargaJasa = Math.max(0, Number(hargaJasa || 0) || 0)
  const parsedHargaJual = Math.max(0, Number(hargaJual || 0) || 0)
  const cleanPrefix = prefixInput.trim().toUpperCase().replace(/^\.+|\.+$/g, '')
  const previewFirstGc = buildPreviewGcNumber(cleanPrefix, parsedStartNum)
  const previewLastGc = buildPreviewGcNumber(cleanPrefix, parsedStartNum + parsedCount - 1)
  const previewFirstBarcode = cleanPrefix ? stripDigits(previewFirstGc) : '1110001'
  const prefixHasDigits = /\d/.test(cleanPrefix)

  // Generate Batch Mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const generated = await gcComplimentService.generateBatch({
        prefix: cleanPrefix,
        startNumber: parsedStartNum,
        count: parsedCount,
        webServiceId: selectedServiceId,
        namaGc: namaGc.trim(),
        hargaJasa: parsedHargaJasa,
        hargaJual: parsedHargaJual,
        notes: notesInput.trim(),
      })

      setImageProgress({
        label: 'Merender & mengunggah gambar GC Compliment...',
        done: 0,
        total: generated.rows.length,
      })

      const renderRes = await gcComplimentService.renderAndUploadVoucherImages(
        generated.rows,
        (done, total) => {
          setImageProgress({
            label: 'Merender & mengunggah gambar GC Compliment...',
            done,
            total,
          })
        }
      )

      return { generated, renderRes }
    },
    onSuccess: ({ generated, renderRes }) => {
      setImageProgress(null)
      queryClient.invalidateQueries({ queryKey: ['pos-gc-compliment-list'] })
      setStartNumberInput(String(parsedStartNum + generated.count))
      if (renderRes.failedCount > 0) {
        toast.warning(
          `${generated.count} GC dibuat, namun ${renderRes.failedCount} gambar gagal diunggah. Anda dapat melakukan "Render Ulang Gambar" pada rincian GC.`
        )
      } else {
        toast.success(
          `Berhasil membuat ${generated.count} GC Compliment beserta gambar (${generated.rows[0]?.gc_number}${
            generated.count > 1 ? ` – ${generated.rows[generated.count - 1]?.gc_number}` : ''
          }).`
        )
      }
    },
    onError: (err) => {
      setImageProgress(null)
      toast.error(err instanceof Error ? err.message : 'Gagal membuat GC Compliment.')
    },
  })

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedServiceId) {
      toast.error('Silakan pilih layanan dari daftar web_services terlebih dahulu.')
      return
    }
    if (!namaGc.trim()) {
      toast.error('Nama GC wajib diisi.')
      return
    }
    if (!cleanPrefix || !/^[A-Z0-9._-]+$/.test(cleanPrefix)) {
      toast.error('Prefix setelah "111." wajib diisi (huruf/angka, contoh: CMP2611).')
      return
    }
    if (parsedCount < 1 || parsedCount > 100) {
      toast.error('Jumlah GC per batch harus antara 1 sampai 100.')
      return
    }
    generateMutation.mutate()
  }

  // Open Activation Modal with smart Pack Number prefill
  const handleOpenActivateModal = () => {
    if (selectedRows.length === 0) return
    if (selectedRows.length === 1) {
      setPackNumberInput(selectedRows[0].gc_number)
    } else {
      setPackNumberInput(`111.PKT.${format(new Date(), 'yyyyMMdd.HHmm')}`)
    }
    setShowActivateModal(true)
  }

  // Activate Selected GC Mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      const activated = await gcComplimentService.activateBatch(
        selectedUids,
        packNumberInput.trim()
      )

      setImageProgress({
        label: 'Memperbarui stempel Valid Through (+120 Hari) pada gambar GC...',
        done: 0,
        total: activated.rows.length,
      })

      const renderRes = await gcComplimentService.renderAndUploadVoucherImages(
        activated.rows,
        (done, total) => {
          setImageProgress({
            label: 'Memperbarui stempel Valid Through (+120 Hari) pada gambar GC...',
            done,
            total,
          })
        }
      )

      return { activated, renderRes }
    },
    onSuccess: ({ activated, renderRes }) => {
      setImageProgress(null)
      setShowActivateModal(false)
      setSelectedRowMap({})
      queryClient.invalidateQueries({ queryKey: ['pos-gc-compliment-list'] })
      queryClient.invalidateQueries({ queryKey: ['pos-gc-list'] })

      if (renderRes.failedCount > 0) {
        toast.warning(
          `${activated.activated_count} GC diaktifkan (${activated.id_payment_buy}), namun ${renderRes.failedCount} gambar gagal diperbarui stempel tanggal.`
        )
      } else {
        toast.success(
          `${activated.activated_count} GC berhasil diaktifkan ke POS (ID Payment: ${activated.id_payment_buy}, Berlaku s/d ${formatDateOnly(activated.expired_date)}).`
        )
      }
    },
    onError: (err) => {
      setImageProgress(null)
      toast.error(err instanceof Error ? err.message : 'Gagal mengaktifkan GC Compliment.')
    },
  })

  const handleConfirmActivate = () => {
    if (!packNumberInput.trim()) {
      toast.error('Pack Number wajib diisi sebelum aktivasi.')
      return
    }
    activateMutation.mutate()
  }

  const handleRerenderSingleImage = async (row: GcComplimentRow) => {
    setIsRerenderingSingle(true)
    try {
      const res = await gcComplimentService.renderAndUploadVoucherImages([row])
      if (res.updated.length > 0) {
        const newUrl = res.updated[0].image_url
        setDetailRow((prev) => (prev && prev.uid === row.uid ? { ...prev, image_url: newUrl } : prev))
        queryClient.invalidateQueries({ queryKey: ['pos-gc-compliment-list'] })
        toast.success(`Gambar GC ${row.gc_number} berhasil dirender ulang.`)
      } else {
        toast.error(`Gagal merender ulang gambar GC ${row.gc_number}.`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal merender ulang gambar.')
    } finally {
      setIsRerenderingSingle(false)
    }
  }

  const handleDownloadVoucherImage = async (row: GcComplimentRow) => {
    if (!row.image_url) {
      toast.error('Gambar GC belum tersedia. Klik "Render Ulang Gambar" pada detail GC.')
      return
    }
    try {
      const resp = await fetch(row.image_url, { mode: 'cors' })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const blob = await resp.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `GC_${row.gc_number.replace(/[^a-zA-Z0-9._-]/g, '_')}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
      toast.success(`Gambar GC ${row.gc_number} berhasil diunduh.`)
    } catch {
      toast.error('Gagal mengunduh gambar GC.')
    }
  }

  const handleCopyText = async (label: string, text?: string | null) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} disalin: ${text}`)
    } catch {
      toast.error(`Gagal menyalin ${label}.`)
    }
  }

  const handleApplyPreset = (preset: Exclude<DatePreset, 'CUSTOM'>) => {
    const range = getDateRangeForPreset(preset)
    setDatePreset(preset)
    setStartDate(range.start)
    setEndDate(range.end)
    setPage(1)
  }

  const handleResetFilters = () => {
    const range = getDateRangeForPreset('THIS_WEEK')
    setDatePreset('THIS_WEEK')
    setStartDate(range.start)
    setEndDate(range.end)
    setIsActiveFilter('ALL')
    setHasUsedFilter('ALL')
    setServiceFilter('ALL')
    setSearchInput('')
    setDebouncedSearch('')
    setPage(1)
  }

  const handleExportCsv = async () => {
    if (isDateRangeInvalid) {
      toast.error('Rentang tanggal tidak valid.')
      return
    }
    setIsExporting(true)
    try {
      const res = await gcComplimentService.getList({
        ...queryParams,
        page: 1,
        pageSize: EXPORT_MAX_ROWS,
      })
      if (!res.rows.length) {
        toast.error('Tidak ada data GC Compliment untuk diekspor.')
        return
      }
      if (res.pagination.total_count > EXPORT_MAX_ROWS) {
        toast.info(
          `Mengekspor ${formatCount(EXPORT_MAX_ROWS)} baris terbaru dari total ${formatCount(res.pagination.total_count)} data.`
        )
      }

      const headers = [
        'No. GC',
        'Barcode (1D)',
        'QR Code',
        'Pack Number',
        'Layanan',
        'Kategori',
        'Durasi (Menit)',
        'Nama GC',
        'Harga Jasa (IDR)',
        'Harga Jual (IDR)',
        'Status',
        'Aktif',
        'Sudah Dipakai',
        'Berlaku s/d',
        'ID Payment Buy',
        'Waktu Aktivasi (WIB)',
        'Outlet Pakai',
        'Waktu Pakai (WIB)',
        'Catatan',
        'Dibuat Oleh',
        'Tanggal Dibuat (WIB)',
        'URL Gambar GC',
      ]

      const csvLines = [
        headers.map(escapeCsvCell).join(','),
        ...res.rows.map((r) =>
          [
            r.gc_number,
            r.gc_barcode,
            r.qrcode,
            r.pack_number || '',
            r.service_name || '',
            r.service_category || '',
            r.duration_minutes ?? '',
            r.nama_gc,
            r.harga_jasa,
            r.harga_jual,
            getComplimentStatusLabel(r),
            r.is_active ? 'YA' : 'TIDAK',
            r.has_used ? 'YA' : 'TIDAK',
            r.expired_date || '',
            r.id_payment_buy || '',
            r.activated_at ? formatDateTimeWib(r.activated_at) : '',
            r.kode_outlet_used
              ? `[${r.kode_outlet_used}] ${r.outlet_used_name || ''}`
              : '',
            r.used_at ? formatDateTimeWib(r.used_at) : '',
            r.notes || '',
            r.created_by_name || '',
            formatDateTimeWib(r.created_at),
            r.image_url || '',
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
      link.href = url
      link.download = `Laporan_GC_Compliment_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
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

  const startIndex =
    pagination.total_count === 0 ? 0 : (pagination.page - 1) * pagination.page_size + 1
  const endIndex = Math.min(pagination.page * pagination.page_size, pagination.total_count)
  const expectedExpiryOnActivate = format(addDays(new Date(), 120), 'dd/MMM/yyyy')
  const isBusy = generateMutation.isPending || activateMutation.isPending

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24">
        {/* Header & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif text-zen-charcoal flex items-center gap-2.5">
              <TicketPlus className="h-6 w-6 text-zen-moss" />
              Generate GC Compliment
            </h1>
            <p className="text-sm text-zen-charcoal/70 mt-1">
              Pembuatan batch voucher Gift Certificate Compliment (Outlet 111 Holding), pembuatan gambar Barcode &amp; QR, serta aktivasi ke sistem POS.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowGenerator((v) => !v)}
              className="gap-1.5 border-zen-border"
            >
              {showGenerator ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Tutup Form Generate
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4 text-zen-moss" />
                  Buka Form Generate
                </>
              )}
            </Button>
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
              onClick={handleExportCsv}
              disabled={isLoading || isExporting || pagination.total_count === 0}
              className="gap-1.5 border-zen-sand bg-zen-linen/70 text-zen-charcoal hover:bg-zen-sand/30"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Mengekspor...' : 'Ekspor CSV'}
            </Button>
          </div>
        </div>

        {/* Live Image Generation Progress */}
        {imageProgress && (
          <Card className="border-zen-matcha/60 bg-zen-matcha/10 shadow-xs">
            <CardContent className="py-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-zen-charcoal">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-zen-moss animate-pulse" />
                  {imageProgress.label}
                </span>
                <span>
                  {imageProgress.done} / {imageProgress.total}
                </span>
              </div>
              <Progress
                value={
                  imageProgress.total > 0
                    ? Math.round((imageProgress.done / imageProgress.total) * 100)
                    : 0
                }
                className="h-2"
              />
            </CardContent>
          </Card>
        )}

        {/* Top 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="border-zen-border bg-white dark:bg-zen-stone shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-zen-charcoal/70">
                Total GC Compliment
              </CardTitle>
              <Ticket className="h-4 w-4 text-zen-moss" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zen-charcoal">
                {formatCount(summary.total_count)} <span className="text-sm font-normal">lembar</span>
              </div>
              <p className="text-xs text-zen-charcoal/65 mt-1">
                Total nilai jasa: <strong>{formatIdr(summary.total_harga_jasa)}</strong>
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/25 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                Draft (Belum Aktif)
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                {formatCount(summary.draft_count)}
              </div>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">
                Siap dicentang untuk aktivasi ke POS
              </p>
            </CardContent>
          </Card>

          <Card className="border-sky-200 dark:border-sky-900 bg-sky-50/60 dark:bg-sky-950/25 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-sky-900 dark:text-sky-200">
                Aktif (Belum Dipakai)
              </CardTitle>
              <Gift className="h-4 w-4 text-sky-700 dark:text-sky-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-800 dark:text-sky-200">
                {formatCount(summary.active_unused_count)}
              </div>
              <p className="text-xs text-sky-700/80 dark:text-sky-300/80 mt-1">
                Sudah masuk POS &amp; siap ditukar tamu
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/25 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
                Sudah Dipakai (Live)
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                {formatCount(summary.used_count)}
              </div>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                Telah di-redeem di cabang Zen Family Spa
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Batch Generator Card */}
        {showGenerator && (
          <Card className="border-zen-matcha/40 bg-white dark:bg-zen-stone shadow-xs">
            <CardHeader className="pb-3 border-b border-zen-border/60 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-zen-charcoal flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-zen-moss" />
                Formulir Pembuatan Batch GC Compliment (Outlet 111 Holding)
              </CardTitle>
              <Badge variant="outline" className="border-zen-matcha/40 bg-zen-matcha/10 text-zen-moss text-xs">
                Tgl Terbit: {formatDateOnly(todayStr)}
              </Badge>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleGenerateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  {/* Service Selector + Background Preview */}
                  <div className="lg:col-span-6 space-y-1.5">
                    <Label className="text-xs font-semibold text-zen-charcoal">
                      Pilih Layanan Treatment (`web_services`) <span className="text-red-600">*</span>
                    </Label>
                    <SearchableSelect
                      options={serviceSelectOptions}
                      value={selectedServiceId}
                      onChange={handleSelectService}
                      disabled={isLoadingServices || isBusy}
                      placeholder={
                        isLoadingServices
                          ? 'Memuat layanan aktif...'
                          : 'Cari & pilih layanan (nama, kategori, durasi)...'
                      }
                    />
                    {selectedService && (
                      <div className="mt-2 flex items-center gap-3 rounded-lg border border-zen-border/80 bg-zen-linen/40 dark:bg-black/20 p-2">
                        {selectedService.image_url ? (
                          <img
                            src={selectedService.image_url}
                            alt={selectedService.name}
                            className="h-12 w-20 rounded object-cover border border-zen-border shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-20 rounded bg-zen-sand/30 flex items-center justify-center shrink-0">
                            <ImageIcon className="h-5 w-5 text-zen-charcoal/40" />
                          </div>
                        )}
                        <div className="min-w-0 text-xs">
                          <div className="font-semibold text-zen-charcoal truncate">
                            {selectedService.name}
                          </div>
                          <div className="text-[11px] text-zen-charcoal/65">
                            Kategori: <strong>{selectedService.category}</strong> • Durasi:{' '}
                            <strong>{selectedService.duration_minutes} Menit</strong>
                          </div>
                          <div className="text-[10px] text-zen-moss">
                            Foto layanan di atas digunakan sebagai latar belakang gambar GC.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nama GC (Auto-filled & editable) */}
                  <div className="lg:col-span-6 space-y-1.5">
                    <Label htmlFor="gc-nama" className="text-xs font-semibold text-zen-charcoal">
                      Caption / Nama GC (`nama_gc`) <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="gc-nama"
                      value={namaGc}
                      disabled={isBusy}
                      onChange={(e) => setNamaGc(e.target.value)}
                      placeholder="Otomatis terisi saat memilih layanan; bebas diedit/ditambah teks..."
                      className="bg-white dark:bg-zen-stone border-zen-border"
                    />
                    <p className="text-[11px] text-zen-charcoal/65">
                      Otomatis menggabungkan <strong>Durasi + Nama Layanan</strong>, tetap dapat diedit/ditambah teks untuk judul voucher.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-start">
                  {/* Prefix after 111. */}
                  <div className="lg:col-span-4 space-y-1.5">
                    <Label htmlFor="gc-prefix" className="text-xs font-semibold text-zen-charcoal">
                      Prefix Nomor GC (setelah `111.`) <span className="text-red-600">*</span>
                    </Label>
                    <div className="flex items-center">
                      <span className="inline-flex h-10 items-center gap-1 rounded-l-md border border-r-0 border-zen-border bg-zen-linen/80 dark:bg-black/30 px-3 font-mono text-sm font-bold text-zen-charcoal">
                        <Lock className="h-3.5 w-3.5 text-zen-moss" />
                        111.
                      </span>
                      <Input
                        id="gc-prefix"
                        value={prefixInput}
                        disabled={isBusy}
                        onChange={(e) =>
                          setPrefixInput(e.target.value.toUpperCase().replace(/[^A-Z0-9._-]/g, ''))
                        }
                        placeholder="CMP2611"
                        className="rounded-l-none font-mono uppercase bg-white dark:bg-zen-stone border-zen-border"
                      />
                    </div>
                    {cleanPrefix && !prefixHasDigits && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        Disarankan menyertakan angka periode (mis. `CMP2611`) agar 1D Barcode (angka saja) tidak mirip batch lain.
                      </p>
                    )}
                  </div>

                  {/* Start Number */}
                  <div className="lg:col-span-2 space-y-1.5">
                    <Label htmlFor="gc-start" className="text-xs font-semibold text-zen-charcoal">
                      No. Awal
                    </Label>
                    <Input
                      id="gc-start"
                      type="number"
                      min={1}
                      value={startNumberInput}
                      disabled={isBusy}
                      onChange={(e) => setStartNumberInput(e.target.value)}
                      className="font-mono bg-white dark:bg-zen-stone border-zen-border"
                    />
                  </div>

                  {/* Count */}
                  <div className="lg:col-span-2 space-y-1.5">
                    <Label htmlFor="gc-count" className="text-xs font-semibold text-zen-charcoal">
                      Jumlah GC (1–100)
                    </Label>
                    <Input
                      id="gc-count"
                      type="number"
                      min={1}
                      max={100}
                      value={countInput}
                      disabled={isBusy}
                      onChange={(e) => setCountInput(e.target.value)}
                      className="font-mono bg-white dark:bg-zen-stone border-zen-border"
                    />
                  </div>

                  {/* Harga Jasa */}
                  <div className="lg:col-span-2 space-y-1.5">
                    <Label htmlFor="gc-harga-jasa" className="text-xs font-semibold text-zen-charcoal">
                      Harga Jasa (Rp) <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="gc-harga-jasa"
                      type="number"
                      min={0}
                      step="1000"
                      value={hargaJasa}
                      disabled={isBusy}
                      onChange={(e) => setHargaJasa(e.target.value)}
                      className="font-mono bg-white dark:bg-zen-stone border-zen-border"
                    />
                    <p className="text-[10px] text-zen-charcoal/60">Nilai `value` saat redeem di POS</p>
                  </div>

                  {/* Harga Jual */}
                  <div className="lg:col-span-2 space-y-1.5">
                    <Label htmlFor="gc-harga-jual" className="text-xs font-semibold text-zen-charcoal">
                      Harga Jual (Rp)
                    </Label>
                    <Input
                      id="gc-harga-jual"
                      type="number"
                      min={0}
                      step="1000"
                      value={hargaJual}
                      disabled={isBusy}
                      onChange={(e) => setHargaJual(e.target.value)}
                      className="font-mono bg-white dark:bg-zen-stone border-zen-border"
                    />
                    <p className="text-[10px] text-zen-charcoal/60">Default `0` untuk Compliment</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                  {/* Live Format Preview */}
                  <div className="lg:col-span-5 rounded-lg border border-zen-border bg-zen-linen/50 dark:bg-black/20 p-3 text-xs space-y-1">
                    <div className="font-semibold text-zen-charcoal">Pratinjau Penomoran Otomatis</div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                      <span>
                        No. GC:{' '}
                        <strong className="font-mono text-zen-charcoal">
                          {previewFirstGc}
                          {parsedCount > 1 ? ` s/d ${previewLastGc}` : ''}
                        </strong>
                      </span>
                      <span>
                        Barcode 1D:{' '}
                        <strong className="font-mono text-zen-moss">{previewFirstBarcode}</strong>
                      </span>
                    </div>
                    <div className="text-[10px] text-zen-charcoal/65">
                      QR Code 24 karakter acak, `pack_number = kosong`, status awal `Draft (Non-Aktif)` &amp; `sold = false`.
                    </div>
                  </div>

                  {/* Optional Batch Notes */}
                  <div className="lg:col-span-4 space-y-1.5">
                    <Label htmlFor="gc-notes" className="text-xs font-semibold text-zen-charcoal">
                      Catatan Batch (Opsional)
                    </Label>
                    <Textarea
                      id="gc-notes"
                      rows={2}
                      value={notesInput}
                      disabled={isBusy}
                      onChange={(e) => setNotesInput(e.target.value)}
                      placeholder="Contoh: Compliment tamu VIP pembukaan cabang, partner media, dll..."
                      className="bg-white dark:bg-zen-stone border-zen-border text-xs min-h-[58px]"
                    />
                  </div>

                  {/* Execute Button */}
                  <div className="lg:col-span-3 flex justify-end">
                    <Button
                      type="submit"
                      disabled={isBusy}
                      className="w-full h-11 gap-2 bg-zen-matcha hover:bg-zen-moss text-white font-semibold"
                    >
                      <TicketPlus className="h-4 w-4" />
                      {generateMutation.isPending
                        ? 'Memproses Batch & Gambar...'
                        : 'Generate GC & Buat Gambar'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filter Card */}
        <Card className="border-zen-border bg-white dark:bg-zen-stone shadow-xs">
          <CardHeader className="pb-3 border-b border-zen-border/60 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold text-zen-charcoal">
              Filter &amp; Pencarian Daftar GC Compliment
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-5 space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">
                  Cari GC Compliment (No. GC / Barcode / QR / Pack / Nama / Catatan)
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zen-charcoal/50" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Ketik sebagian/penuh kode GC, barcode, QR, pack_number..."
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
                {debouncedSearch && (
                  <p className="text-[11px] font-medium text-zen-moss flex items-center gap-1">
                    <Search className="h-3 w-3 shrink-0" />
                    Mencari di seluruh periode tanggal pembuatan (filter tanggal diabaikan sementara)
                  </p>
                )}
              </div>

              <div className="lg:col-span-3 space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">Preset Tanggal Dibuat</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { key: 'THIS_WEEK', label: 'Minggu Ini' },
                      { key: 'THIS_MONTH', label: 'Bulan Ini' },
                      { key: 'THIS_YEAR', label: 'Tahun Ini' },
                      { key: 'ALL', label: 'Semua' },
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
                          ? 'bg-zen-matcha hover:bg-zen-moss text-white text-[11px] px-1.5'
                          : 'border-zen-border text-zen-charcoal text-[11px] px-1.5'
                      }
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-zen-moss" />
                  Dari Tanggal
                </Label>
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
                <Label className="text-xs font-semibold text-zen-charcoal flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-zen-moss" />
                  Sampai Tanggal
                </Label>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zen-border/50">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">Status Aktivasi</Label>
                <Select
                  value={isActiveFilter}
                  onValueChange={(val) => {
                    setIsActiveFilter(val as GcComplimentTriState)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="bg-white dark:bg-zen-stone border-zen-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status Aktivasi</SelectItem>
                    <SelectItem value="FALSE">Belum Aktif (Draft)</SelectItem>
                    <SelectItem value="TRUE">Sudah Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">Status Pemakaian (POS)</Label>
                <Select
                  value={hasUsedFilter}
                  onValueChange={(val) => {
                    setHasUsedFilter(val as GcComplimentTriState)
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
                <Label className="text-xs font-semibold text-zen-charcoal">Filter Layanan Treatment</Label>
                <Select
                  value={serviceFilter}
                  onValueChange={(val) => {
                    setServiceFilter(val)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="bg-white dark:bg-zen-stone border-zen-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Layanan</SelectItem>
                    {webServices.map((s) => (
                      <SelectItem key={`flt-${s.id}`} value={s.id}>
                        [{s.category}] {s.name} ({s.duration_minutes}m)
                      </SelectItem>
                    ))}
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

        {/* Bulk Selection Bar */}
        {selectedRows.length > 0 && (
          <div className="sticky top-3 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zen-moss bg-zen-matcha/15 backdrop-blur px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-zen-charcoal">
              <TicketCheck className="h-5 w-5 text-zen-moss" />
              <span>
                <strong>{formatCount(selectedRows.length)}</strong> GC Draft dipilih untuk aktivasi
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedRowMap({})}
                className="border-zen-border bg-white/80 dark:bg-zen-stone"
              >
                Batal Pilih
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleOpenActivateModal}
                className="gap-1.5 bg-zen-matcha hover:bg-zen-moss text-white font-semibold"
              >
                <TicketCheck className="h-4 w-4" />
                Aktifkan GC Terpilih ({formatCount(selectedRows.length)})
              </Button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {listError && (
          <Card className="border-red-300 bg-red-50/80 dark:bg-red-950/30">
            <CardContent className="py-5 flex items-center gap-3 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>
                {listError instanceof Error ? listError.message : 'Gagal memuat daftar GC Compliment.'}
              </span>
            </CardContent>
          </Card>
        )}

        {/* Data Table Card */}
        <Card className="border-zen-border bg-white dark:bg-zen-stone shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zen-linen/80 dark:bg-black/25 border-b border-zen-border">
                <TableRow>
                  <TableHead className="w-[44px] text-center">
                    <Checkbox
                      aria-label="Pilih semua GC Draft di halaman ini"
                      checked={allDraftOnPageSelected}
                      disabled={draftRowsOnPage.length === 0}
                      onChange={toggleSelectAllOnPage}
                    />
                  </TableHead>
                  <TableHead className="font-bold text-zen-charcoal">No. GC / Barcode / QR</TableHead>
                  <TableHead className="font-bold text-zen-charcoal">Nama GC &amp; Layanan</TableHead>
                  <TableHead className="font-bold text-zen-charcoal text-right">Harga Jasa / Jual</TableHead>
                  <TableHead className="font-bold text-zen-charcoal">Pack &amp; Payment</TableHead>
                  <TableHead className="font-bold text-zen-charcoal">Tgl Dibuat &amp; Berlaku</TableHead>
                  <TableHead className="font-bold text-zen-charcoal text-center">Status</TableHead>
                  <TableHead className="font-bold text-zen-charcoal text-center w-[160px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && !listResponse ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-sm text-zen-charcoal/70">
                      Memuat daftar GC Compliment...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-sm text-zen-charcoal/65">
                      Belum ada data GC Compliment yang sesuai dengan filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const isSelected = Boolean(selectedRowMap[row.uid])
                    return (
                      <TableRow
                        key={row.uid}
                        className={`hover:bg-zen-linen/40 dark:hover:bg-white/5 ${
                          isSelected ? 'bg-zen-matcha/10' : ''
                        }`}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            aria-label={`Pilih ${row.gc_number}`}
                            checked={isSelected}
                            disabled={row.is_active}
                            onChange={() => toggleSelectRow(row)}
                          />
                        </TableCell>

                        <TableCell>
                          <div className="font-mono text-xs font-bold text-zen-charcoal">
                            {row.gc_number}
                          </div>
                          <div className="font-mono text-[11px] text-zen-charcoal/70">
                            BC (1D): {row.gc_barcode}
                          </div>
                          <div className="font-mono text-[10px] text-zen-moss">
                            QR: {row.qrcode}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs font-semibold text-zen-charcoal">{row.nama_gc}</div>
                          {row.service_name && (
                            <div className="text-[11px] text-zen-charcoal/65">
                              {row.service_category ? `[${row.service_category}] ` : ''}
                              {row.service_name}
                              {row.duration_minutes ? ` • ${row.duration_minutes}m` : ''}
                            </div>
                          )}
                          {row.notes && (
                            <div className="text-[11px] text-zen-charcoal/60 italic truncate max-w-[260px]" title={row.notes}>
                              Catatan: {row.notes}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-right whitespace-nowrap">
                          <div className="font-mono text-xs font-bold text-zen-charcoal">
                            {formatIdr(row.harga_jasa)}
                          </div>
                          <div className="font-mono text-[11px] text-zen-charcoal/60">
                            Jual: {formatIdr(row.harga_jual)}
                          </div>
                        </TableCell>

                        <TableCell>
                          {row.pack_number ? (
                            <div className="font-mono text-xs font-medium text-zen-charcoal">
                              {row.pack_number}
                            </div>
                          ) : (
                            <span className="text-xs text-zen-charcoal/45">-</span>
                          )}
                          {row.id_payment_buy && (
                            <div className="font-mono text-[10px] text-zen-charcoal/65 truncate max-w-[190px]" title={row.id_payment_buy}>
                              {row.id_payment_buy}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="text-xs text-zen-charcoal">
                            {formatDateTimeWib(row.created_at)}
                          </div>
                          <div className="text-[11px] text-zen-charcoal/65">
                            Exp: {row.expired_date ? formatDateOnly(row.expired_date) : 'Menunggu aktivasi'}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            {row.has_used ? (
                              <>
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[11px]"
                                >
                                  Sudah Dipakai
                                </Badge>
                                {row.kode_outlet_used && (
                                  <span className="text-[10px] text-zen-charcoal/65">
                                    [{row.kode_outlet_used}] {formatDateOnly(row.used_at)}
                                  </span>
                                )}
                              </>
                            ) : row.is_active ? (
                              <Badge
                                variant="outline"
                                className="bg-sky-50 text-sky-700 border-sky-300 text-[11px]"
                              >
                                Aktif (POS)
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-800 border-amber-300 text-[11px]"
                              >
                                Draft
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setDetailRow(row)}
                              className="h-7 px-2 text-xs gap-1 border-zen-border hover:bg-zen-matcha/10 hover:text-zen-moss"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Gambar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!row.image_url}
                              onClick={() => handleDownloadVoucherImage(row)}
                              title="Unduh Gambar GC (.jpg)"
                              className="h-7 px-2 text-xs gap-1 border-zen-border"
                            >
                              <Download className="h-3.5 w-3.5" />
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

      {/* Activation Modal */}
      <Dialog
        open={showActivateModal}
        onOpenChange={(open) => !open && !activateMutation.isPending && setShowActivateModal(false)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-lg">
              <TicketCheck className="h-5 w-5 text-zen-moss" />
              Aktivasi GC Compliment ke POS
            </DialogTitle>
            <DialogDescription>
              Mengaktifkan GC Compliment terpilih ke tabel transaksi POS (`ot_pos_gc_transaction`) agar dapat langsung dipakai di seluruh cabang Zen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="activate-pack-number" className="text-xs font-semibold text-zen-charcoal">
                Pack Number (`pack_number`) <span className="text-red-600">*</span>
              </Label>
              <Input
                id="activate-pack-number"
                value={packNumberInput}
                disabled={activateMutation.isPending}
                onChange={(e) => setPackNumberInput(e.target.value)}
                placeholder="Masukkan Pack Number (otomatis terisi dan dapat diedit)"
                className="font-mono bg-white dark:bg-zen-stone border-zen-border"
              />
              <p className="text-[11px] text-zen-charcoal/65">
                {selectedRows.length === 1
                  ? 'Terisi otomatis sesuai No. GC karena hanya 1 GC yang dipilih (bebas diedit).'
                  : `Terisi saran kode batch otomatis untuk ${selectedRows.length} GC terpilih (bebas diedit).`}
              </p>
            </div>

            <div className="rounded-xl border border-zen-border bg-zen-linen/50 dark:bg-black/20 p-3 space-y-1.5 text-[11px]">
              <div className="font-bold text-zen-charcoal">Ringkasan Data yang Dikirim ke POS:</div>
              <div>• Outlet Beli (`kode_outlet_buy`): <strong className="font-mono">111 (ZEN HEAD OFFICE)</strong></div>
              <div>• ID Pembayaran (`id_payment_buy`): <strong className="font-mono">WHMAPP.111.&lt;YYYYMMDDHHMMSS&gt;.&lt;4HEX&gt;</strong></div>
              <div>• Waktu Beli (`buy_at`): <strong>Waktu lokal Anda saat ini</strong></div>
              <div>• Masa Berlaku (`expired_date`): <strong>{expectedExpiryOnActivate} (+120 hari)</strong></div>
              <div>• Nominal POS (`value`): <strong>Menggunakan `harga_jasa` masing-masing GC</strong></div>
              <div>• Pembaruan Gambar: <strong>Stempel tanggal `Valid Through` otomatis diperbarui</strong></div>
            </div>

            <div className="space-y-1.5">
              <div className="font-semibold text-zen-charcoal">
                Daftar GC Terpilih ({selectedRows.length} lembar):
              </div>
              <div className="max-h-36 overflow-y-auto rounded-lg border border-zen-border p-2 space-y-1 bg-white dark:bg-zen-stone">
                {selectedRows.map((r) => (
                  <div key={r.uid} className="flex items-center justify-between text-[11px] border-b last:border-b-0 border-zen-border/40 py-1">
                    <span className="font-mono font-bold text-zen-charcoal">{r.gc_number}</span>
                    <span className="text-zen-charcoal/70 truncate mx-2">{r.nama_gc}</span>
                    <span className="font-mono font-semibold text-zen-moss shrink-0">{formatIdr(r.harga_jasa)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zen-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activateMutation.isPending}
                onClick={() => setShowActivateModal(false)}
                className="border-zen-border"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={activateMutation.isPending || !packNumberInput.trim()}
                onClick={handleConfirmActivate}
                className="gap-1.5 bg-zen-matcha hover:bg-zen-moss text-white font-semibold"
              >
                <TicketCheck className="h-4 w-4" />
                {activateMutation.isPending ? 'Mengaktifkan ke POS...' : 'Konfirmasi & Aktifkan GC'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Voucher Image Preview & Detail Modal */}
      <Dialog open={Boolean(detailRow)} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-lg">
              <Gift className="h-5 w-5 text-zen-moss" />
              Pratinjau Gambar &amp; Rincian GC Compliment
            </DialogTitle>
            <DialogDescription>
              Pratinjau e-voucher Gift Certificate beserta 1D Barcode, QR Code, dan status sinkronisasi POS.
            </DialogDescription>
          </DialogHeader>

          {detailRow && (
            <div className="space-y-4 text-xs">
              {/* Rendered Voucher Artwork */}
              <div className="rounded-xl border border-zen-border bg-black/5 dark:bg-black/30 p-2 overflow-hidden">
                {detailRow.image_url ? (
                  <img
                    src={detailRow.image_url}
                    alt={`GC ${detailRow.gc_number}`}
                    className="w-full h-auto rounded-lg shadow-md"
                  />
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center gap-2 text-zen-charcoal/60">
                    <ImageIcon className="h-8 w-8" />
                    <span>Gambar voucher belum tersedia. Klik "Render Ulang Gambar" di bawah.</span>
                  </div>
                )}
              </div>

              {/* Action Toolbar inside Preview */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyText('No. GC', detailRow.gc_number)}
                    className="h-8 text-xs gap-1.5 border-zen-border"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Salin No. GC
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyText('QR Code', detailRow.qrcode)}
                    className="h-8 text-xs gap-1.5 border-zen-border"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Salin QR Code
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!detailRow.image_url}
                    onClick={() => handleCopyText('URL Gambar', detailRow.image_url)}
                    className="h-8 text-xs gap-1.5 border-zen-border"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Salin URL
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isRerenderingSingle}
                    onClick={() => handleRerenderSingleImage(detailRow)}
                    className="h-8 text-xs gap-1.5 border-zen-border"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRerenderingSingle ? 'animate-spin' : ''}`} />
                    {isRerenderingSingle ? 'Merender...' : 'Render Ulang Gambar'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!detailRow.image_url}
                    onClick={() => handleDownloadVoucherImage(detailRow)}
                    className="h-8 text-xs gap-1.5 bg-zen-matcha hover:bg-zen-moss text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Unduh Gambar (.jpg)
                  </Button>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-zen-border bg-zen-linen/45 dark:bg-black/20 p-3.5">
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">No. GC</span>
                  <span className="font-mono font-bold text-sm text-zen-charcoal">
                    {detailRow.gc_number}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Status Voucher</span>
                  <span className="font-semibold text-sm text-zen-charcoal">
                    {getComplimentStatusLabel(detailRow)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">1D Barcode (Angka Saja)</span>
                  <span className="font-mono text-zen-charcoal">{detailRow.gc_barcode}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">QR Code (24 Karakter)</span>
                  <span className="font-mono text-zen-moss">{detailRow.qrcode}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Caption / Nama GC</span>
                  <span className="font-semibold text-zen-charcoal">{detailRow.nama_gc}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Layanan Referensi</span>
                  <span className="text-zen-charcoal">
                    {detailRow.service_name
                      ? `[${detailRow.service_category}] ${detailRow.service_name} (${detailRow.duration_minutes}m)`
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Harga Jasa / Harga Jual</span>
                  <span className="font-mono font-semibold text-zen-charcoal">
                    {formatIdr(detailRow.harga_jasa)} / {formatIdr(detailRow.harga_jual)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Pack Number</span>
                  <span className="font-mono text-zen-charcoal">{detailRow.pack_number || '-'}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">ID Payment Aktivasi</span>
                  <span className="font-mono text-zen-charcoal">{detailRow.id_payment_buy || '-'}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Berlaku s/d (Valid Through)</span>
                  <span className="font-semibold text-zen-charcoal">
                    {detailRow.expired_date ? formatDateOnly(detailRow.expired_date) : 'Menunggu aktivasi (+120 hari)'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Dibuat Oleh &amp; Tanggal</span>
                  <span className="text-zen-charcoal">
                    {detailRow.created_by_name || '-'} • {formatDateTimeWib(detailRow.created_at)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Diaktifkan Oleh &amp; Waktu</span>
                  <span className="text-zen-charcoal">
                    {detailRow.activated_at
                      ? `${detailRow.activated_by_name || '-'} • ${formatDateTimeWib(detailRow.activated_at)}`
                      : '-'}
                  </span>
                </div>
                {detailRow.notes && (
                  <div className="sm:col-span-2">
                    <span className="block text-[11px] text-zen-charcoal/60">Catatan</span>
                    <span className="text-zen-charcoal whitespace-pre-wrap">{detailRow.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

export default GcComplimentPage
