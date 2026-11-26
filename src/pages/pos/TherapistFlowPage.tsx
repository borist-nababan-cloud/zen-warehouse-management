import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Clock,
  Info,
  Lock,
  RefreshCw,
  Store,
  Timer,
  Users,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthUser } from '@/hooks/useAuth'
import { getWIBDateParts, getWIBLiveClockString } from '@/lib/dateUtils'
import {
  therapistFlowService,
  type TherapistFlowGuest,
  type TherapistFlowMaster,
  type TherapistFlowRow,
} from '@/services/therapistFlowService'
import type { MasterOutlet } from '@/types/database'

type FlowTabValue = 'today_guest' | 'yesterday_flow' | 'today_hour'
type DeptSubTabValue = 'BM' | 'RF'

const MULTI_OUTLET_ROLES = [5, 8, 13, 16, 20]
const LOCKED_OUTLET_ROLES = [6, 11, 14, 15, 19]
const AUTO_REFRESH_INTERVAL_SEC = 60
const GUEST_COLUMNS = [0, 1, 2, 3, 4] as const

interface GroupPaletteStyle {
  rowClass: string
  stickyCellClass: string
  badgeClass: string
}

const GROUP_PASTEL_PALETTE: GroupPaletteStyle[] = [
  // Group 1 (Sage / Emerald Pastel)
  {
    rowClass:
      'bg-emerald-50/75 hover:bg-emerald-100/60 dark:bg-emerald-950/35 dark:hover:bg-emerald-950/55',
    stickyCellClass:
      'bg-[#effaf3] dark:bg-[#192822] border-l-4 border-l-emerald-400 dark:border-l-emerald-500/80',
    badgeClass:
      'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/65 dark:text-emerald-100 dark:border-emerald-700',
  },
  // Group 2 (Sky / Blue Pastel)
  {
    rowClass:
      'bg-sky-50/75 hover:bg-sky-100/60 dark:bg-sky-950/35 dark:hover:bg-sky-950/55',
    stickyCellClass:
      'bg-[#eff8ff] dark:bg-[#182530] border-l-4 border-l-sky-400 dark:border-l-sky-500/80',
    badgeClass:
      'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-900/65 dark:text-sky-100 dark:border-sky-700',
  },
  // Group 3 (Amber / Warm Sand Pastel)
  {
    rowClass:
      'bg-amber-50/75 hover:bg-amber-100/60 dark:bg-amber-950/30 dark:hover:bg-amber-950/50',
    stickyCellClass:
      'bg-[#fef9ec] dark:bg-[#2a2316] border-l-4 border-l-amber-400 dark:border-l-amber-500/80',
    badgeClass:
      'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/65 dark:text-amber-100 dark:border-amber-700',
  },
  // Group 4 (Violet / Lavender Pastel)
  {
    rowClass:
      'bg-violet-50/75 hover:bg-violet-100/60 dark:bg-violet-950/35 dark:hover:bg-violet-950/55',
    stickyCellClass:
      'bg-[#f5f2ff] dark:bg-[#231d30] border-l-4 border-l-violet-400 dark:border-l-violet-500/80',
    badgeClass:
      'bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-900/65 dark:text-violet-100 dark:border-violet-700',
  },
  // Group 5 (Rose / Peach Pastel)
  {
    rowClass:
      'bg-rose-50/75 hover:bg-rose-100/60 dark:bg-rose-950/30 dark:hover:bg-rose-950/50',
    stickyCellClass:
      'bg-[#fff1f4] dark:bg-[#2c1a20] border-l-4 border-l-rose-400 dark:border-l-rose-500/80',
    badgeClass:
      'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-900/65 dark:text-rose-100 dark:border-rose-700',
  },
  // Group 6 (Teal / Mint Pastel)
  {
    rowClass:
      'bg-teal-50/75 hover:bg-teal-100/60 dark:bg-teal-950/35 dark:hover:bg-teal-950/55',
    stickyCellClass:
      'bg-[#eefbfa] dark:bg-[#162928] border-l-4 border-l-teal-400 dark:border-l-teal-500/80',
    badgeClass:
      'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-900/65 dark:text-teal-100 dark:border-teal-700',
  },
]

const NEUTRAL_GROUP_STYLE: GroupPaletteStyle = {
  rowClass: 'bg-zen-paper hover:bg-zen-linen/50 dark:hover:bg-white/5',
  stickyCellClass: 'bg-zen-paper border-l-4 border-l-zen-border',
  badgeClass:
    'bg-zen-linen text-zen-charcoal border-zen-border dark:bg-zen-stone dark:text-zen-charcoal',
}

function getGroupPaletteStyle(ngroup: string | null | undefined): GroupPaletteStyle {
  const cleaned = (ngroup || '').trim()
  if (!cleaned) return NEUTRAL_GROUP_STYLE
  const parsed = Number.parseInt(cleaned, 10)
  if (Number.isFinite(parsed) && parsed > 0) {
    return GROUP_PASTEL_PALETTE[(parsed - 1) % GROUP_PASTEL_PALETTE.length]
  }
  let hash = 0
  for (let i = 0; i < cleaned.length; i += 1) {
    hash = (hash * 31 + cleaned.charCodeAt(i)) % 1000
  }
  return GROUP_PASTEL_PALETTE[Math.abs(hash) % GROUP_PASTEL_PALETTE.length]
}

function getYesterdayWibDate(todayWib: string): string {
  const [y, m, d] = todayWib.split('-').map(Number)
  const prev = new Date(Date.UTC(y, m - 1, d - 1))
  const py = prev.getUTCFullYear()
  const pm = String(prev.getUTCMonth() + 1).padStart(2, '0')
  const pd = String(prev.getUTCDate()).padStart(2, '0')
  return `${py}-${pm}-${pd}`
}

function formatDateIndonesian(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEE, dd MMM yyyy', { locale: idLocale })
  } catch {
    return dateStr
  }
}

function formatTimeRange(startTime?: string | null, endTime?: string | null): string {
  const start = startTime ? startTime.slice(0, 5) : ''
  const end = endTime ? endTime.slice(0, 5) : ''
  if (start && end && start !== end) return `${start}–${end}`
  if (start) return start
  return '-'
}

function formatRoomLabel(roomId: string | null | undefined, kodeOutlet: string): string {
  const raw = (roomId || '').trim()
  if (!raw) return '-'
  const prefix = `${kodeOutlet}.`
  const cleaned = raw.startsWith(prefix) ? raw.slice(prefix.length).trim() : raw
  return cleaned || '-'
}

function getSourceShortLabel(master: TherapistFlowMaster): string {
  switch (master.source) {
    case 'DESKTOP':
      return master.updated_by ? `Desktop (${master.updated_by})` : 'Desktop'
    case 'AUTO_CRON':
      return 'Rollover 00:05 WIB'
    case 'ESTIMATED_FLIP':
      return 'Estimasi Kemarin'
    default:
      return 'Default ATAS'
  }
}

function getGuestStatusMeta(statusTrans?: string | null): {
  label: string
  badgeClass: string
  cardClass: string
} {
  const upper = (statusTrans || '').toUpperCase().trim()
  if (upper === 'STARTED') {
    return {
      label: 'Berlangsung',
      badgeClass:
        'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700',
      cardClass:
        'border-amber-300 bg-amber-50/95 hover:bg-amber-100 dark:border-amber-700/90 dark:bg-amber-950/60 dark:hover:bg-amber-950/80',
    }
  }
  if (upper === 'PAID') {
    return {
      label: 'Selesai',
      badgeClass:
        'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-700',
      cardClass:
        'border-zen-border bg-white/90 hover:bg-white dark:border-zen-border dark:bg-zen-paper/90 dark:hover:bg-zen-paper',
    }
  }
  return {
    label: upper || 'Lainnya',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    cardClass:
      'border-zen-border bg-white/90 hover:bg-white dark:border-zen-border dark:bg-zen-paper/90 dark:hover:bg-zen-paper',
  }
}

function AttendanceBadge({ row, compact = false }: { row: TherapistFlowRow; compact?: boolean }) {
  if (row.attendance_status === 'PRESENT') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/75 dark:text-emerald-200 whitespace-nowrap"
        title={`Absen Masuk: ${row.fp_in_wib || '-'} WIB`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
        {compact ? `Hadir ${row.fp_in_wib || ''}` : `Hadir ${row.fp_in_wib || ''}`}
      </span>
    )
  }

  if (row.attendance_status === 'CLOCKED_OUT') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-100/90 px-2 py-0.5 text-[10px] font-semibold text-sky-900 dark:border-sky-700 dark:bg-sky-950/75 dark:text-sky-200 whitespace-nowrap"
        title={`Masuk: ${row.fp_in_wib || '-'} WIB • Pulang: ${row.fp_out_wib || '-'} WIB`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-sky-600 dark:bg-sky-400 shrink-0" />
        Plg {row.fp_out_wib || ''}
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-zen-border bg-white/75 dark:bg-zen-stone/80 px-2 py-0.5 text-[10px] font-medium text-zen-charcoal/60 whitespace-nowrap"
      title="Belum ada catatan absensi hari ini"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-zen-charcoal/35 shrink-0" />
      OFF
    </span>
  )
}

interface FlowTableProps {
  title: string
  subtitle: string
  rows: TherapistFlowRow[]
  kodeOutlet: string
  isLoading: boolean
  onSelectTherapist: (row: TherapistFlowRow, sectionLabel: string) => void
}

function FlowTable({
  title,
  subtitle,
  rows,
  kodeOutlet,
  isLoading,
  onSelectTherapist,
}: FlowTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-zen-linen/90 dark:bg-zen-stone/90 border-b border-zen-border">
          <TableRow className="hover:bg-transparent">
            <TableHead className="sticky left-0 z-10 h-9 bg-zen-linen dark:bg-zen-stone py-1.5 font-bold text-xs text-zen-charcoal min-w-[190px] shadow-[1px_0_0_0_var(--color-zen-border)]">
              Terapis
            </TableHead>
            <TableHead className="h-9 py-1.5 font-bold text-xs text-zen-charcoal text-center w-[96px]">
              Absen
            </TableHead>
            <TableHead className="h-9 py-1.5 font-bold text-xs text-zen-charcoal text-center w-[72px]">
              Group
            </TableHead>
            <TableHead className="h-9 py-1.5 font-bold text-xs text-zen-charcoal text-center w-[72px]">
              Slot
            </TableHead>
            <TableHead className="h-9 py-1.5 font-bold text-xs text-zen-charcoal min-w-[155px]">
              Guest 1
            </TableHead>
            <TableHead className="h-9 py-1.5 font-bold text-xs text-zen-charcoal min-w-[155px]">
              Guest 2
            </TableHead>
            <TableHead className="h-9 py-1.5 font-bold text-xs text-zen-charcoal min-w-[155px]">
              Guest 3
            </TableHead>
            <TableHead className="h-9 py-1.5 font-bold text-xs text-zen-charcoal min-w-[155px]">
              Guest 4
            </TableHead>
            <TableHead className="h-9 py-1.5 font-bold text-xs text-zen-charcoal min-w-[155px]">
              Guest 5
            </TableHead>
            <TableHead className="h-9 py-1.5 font-bold text-xs text-zen-charcoal text-center w-[76px]">
              Total
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center text-sm text-zen-charcoal/70">
                Memuat daftar {title}...
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center text-sm text-zen-charcoal/65">
                Belum ada data {title} pada outlet ini di `ot_pos_tr_flow_detail`.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, idx) => {
              const prevRow = idx > 0 ? rows[idx - 1] : null
              const isGroupBoundary = Boolean(prevRow && prevRow.ngroup !== row.ngroup)
              const extraGuests = Math.max(0, row.total_guests - 5)
              const groupStyle = getGroupPaletteStyle(row.ngroup)

              return (
                <TableRow
                  key={row.kodekaryawan}
                  className={`${groupStyle.rowClass} ${
                    isGroupBoundary ? 'border-t-2 border-zen-sand dark:border-zen-sand/40' : ''
                  }`}
                >
                  {/* 1. Terapis (2 baris padat) */}
                  <TableCell
                    className={`sticky left-0 z-10 py-1.5 px-2.5 shadow-[1px_0_0_0_var(--color-zen-border)] align-middle ${groupStyle.stickyCellClass}`}
                  >
                    <div className="font-semibold text-xs text-zen-charcoal leading-tight truncate max-w-[205px]" title={row.namakaryawan}>
                      {row.namakaryawan}
                    </div>
                    <div className="font-mono text-[10.5px] text-zen-charcoal/65 leading-tight mt-0.5">
                      ID: {row.idkaryawan || '-'} • {row.kodekaryawan}
                    </div>
                  </TableCell>

                  {/* 2. Absen (kolom tersendiri) */}
                  <TableCell className="py-1.5 px-1.5 text-center align-middle">
                    <AttendanceBadge row={row} compact />
                  </TableCell>

                  {/* 3. Group (font lebih besar + warna pastel grup) */}
                  <TableCell className="py-1.5 px-1.5 text-center align-middle">
                    <span
                      className={`inline-flex min-w-[36px] items-center justify-center rounded-lg border px-2 py-0.5 font-mono text-base sm:text-lg font-extrabold leading-none ${groupStyle.badgeClass}`}
                    >
                      {row.ngroup || '-'}
                    </span>
                  </TableCell>

                  {/* 4. Slot (font lebih besar) */}
                  <TableCell className="py-1.5 px-1.5 text-center align-middle">
                    <span className="inline-flex min-w-[36px] items-center justify-center rounded-lg border border-zen-matcha/45 bg-white/85 dark:bg-zen-paper/85 px-2 py-0.5 font-mono text-base sm:text-lg font-extrabold leading-none text-zen-moss dark:text-zen-matcha">
                      {row.noslot || '-'}
                    </span>
                  </TableCell>

                  {/* 5..9. Guest 1 .. Guest 5 (kompak) */}
                  {GUEST_COLUMNS.map((guestIdx) => {
                    const guest: TherapistFlowGuest | undefined = row.guests[guestIdx]
                    if (!guest) {
                      return (
                        <TableCell
                          key={`${row.kodekaryawan}-g-${guestIdx}`}
                          className="py-1 px-1.5 text-center align-middle text-xs text-zen-charcoal/30"
                        >
                          —
                        </TableCell>
                      )
                    }

                    const isRequest = (guest.byrequest || '').toUpperCase().trim() === 'Y'
                    const statusMeta = getGuestStatusMeta(guest.status_trans)
                    const roomDisplay = formatRoomLabel(guest.room_id, kodeOutlet)

                    return (
                      <TableCell
                        key={`${row.kodekaryawan}-g-${guestIdx}`}
                        className="align-middle p-1"
                      >
                        <button
                          type="button"
                          onClick={() => onSelectTherapist(row, `${title} (${subtitle})`)}
                          className={`w-full text-left rounded-md border px-2 py-1 transition-colors cursor-pointer ${statusMeta.cardClass}`}
                        >
                          <div className="flex items-center justify-between gap-1 text-[10px] leading-tight text-zen-charcoal/75 font-mono">
                            <span className="flex items-center gap-0.5 truncate">
                              <Clock className="h-2.5 w-2.5 shrink-0 text-zen-moss" />
                              {formatTimeRange(guest.start_time, guest.end_time)}
                            </span>
                            <span className="flex items-center gap-1 shrink-0">
                              {isRequest && (
                                <span className="rounded bg-indigo-100 px-1 text-[9px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                                  REQ
                                </span>
                              )}
                              <span
                                className={`rounded border px-1 text-[9px] font-semibold ${statusMeta.badgeClass}`}
                              >
                                {statusMeta.label}
                              </span>
                            </span>
                          </div>

                          <div className="mt-0.5 flex items-center justify-between gap-1.5 leading-tight">
                            <span
                              className="truncate text-[11.5px] font-semibold text-zen-charcoal"
                              title={guest.nama_customer || '-'}
                            >
                              {guest.nama_customer || '-'}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] text-zen-charcoal/65">
                              Rm {roomDisplay}
                            </span>
                          </div>
                        </button>
                      </TableCell>
                    )
                  })}

                  {/* 10. Total & +N lagi */}
                  <TableCell className="py-1.5 px-1.5 text-center align-middle">
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={`font-mono text-sm font-extrabold leading-none ${
                          row.total_guests > 0
                            ? 'text-zen-moss dark:text-zen-matcha'
                            : 'text-zen-charcoal/40'
                        }`}
                      >
                        {row.total_guests}
                      </span>
                      {extraGuests > 0 && (
                        <button
                          type="button"
                          onClick={() => onSelectTherapist(row, `${title} (${subtitle})`)}
                          className="rounded-full border border-zen-matcha/50 bg-zen-matcha/15 px-1.5 py-0.2 text-[9.5px] font-bold text-zen-moss hover:bg-zen-matcha/25 dark:text-zen-matcha cursor-pointer whitespace-nowrap"
                        >
                          +{extraGuests} lagi
                        </button>
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
  )
}

export function TherapistFlowPage() {
  const { user } = useAuthUser()
  const roleId = Number(user?.user_role || 0)
  const isMultiOutlet = MULTI_OUTLET_ROLES.includes(roleId)
  const isLockedOutlet = LOCKED_OUTLET_ROLES.includes(roleId)

  const [activeTab, setActiveTab] = useState<FlowTabValue>('today_guest')
  const [activeDeptTab, setActiveDeptTab] = useState<DeptSubTabValue>('BM')
  const [selectedOutlet, setSelectedOutlet] = useState<string>('101')
  const [todayWib, setTodayWib] = useState<string>(() => getWIBDateParts().dateStr)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true)
  const [countdown, setCountdown] = useState<number>(AUTO_REFRESH_INTERVAL_SEC)
  const [lastUpdatedWib, setLastUpdatedWib] = useState<string>(() => getWIBLiveClockString())

  const [modalState, setModalState] = useState<{
    row: TherapistFlowRow
    sectionLabel: string
  } | null>(null)

  const yesterdayWib = useMemo(() => getYesterdayWibDate(todayWib), [todayWib])

  // Load active outlets only (master_outlet.active = true)
  const { data: activeOutlets = [], isLoading: isOutletsLoading } = useQuery<MasterOutlet[]>({
    queryKey: ['pos-therapist-flow-active-outlets'],
    queryFn: () => therapistFlowService.getActiveOutlets(),
    staleTime: 1000 * 60 * 10,
  })

  // Ensure default '101' or fallback to first active outlet if '101' is unavailable
  useEffect(() => {
    if (!isMultiOutlet || activeOutlets.length === 0) return
    const exists = activeOutlets.some((o) => o.kode_outlet === selectedOutlet)
    if (!exists) {
      const has101 = activeOutlets.some((o) => o.kode_outlet === '101')
      setSelectedOutlet(has101 ? '101' : activeOutlets[0].kode_outlet)
    }
  }, [activeOutlets, isMultiOutlet, selectedOutlet])

  const effectiveOutlet = isLockedOutlet ? user?.kode_outlet || null : selectedOutlet

  const userOutletLabel = useMemo(() => {
    const code = user?.kode_outlet || ''
    const found = activeOutlets.find((o) => o.kode_outlet === code)
    const name = found?.name_outlet || user?.outlet?.name_outlet || ''
    return code ? (name ? `[${code}] ${name}` : `[${code}]`) : 'Outlet belum terdaftar'
  }, [activeOutlets, user?.kode_outlet, user?.outlet?.name_outlet])

  const targetDate = activeTab === 'yesterday_flow' ? yesterdayWib : todayWib
  const isQueryTab = activeTab === 'today_guest' || activeTab === 'yesterday_flow'

  const {
    data: flowData,
    isLoading: isFlowLoading,
    isFetching: isFlowFetching,
    error: flowError,
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: ['pos-therapist-flow', roleId, effectiveOutlet, targetDate],
    queryFn: () => therapistFlowService.getTherapistFlow(effectiveOutlet, targetDate),
    enabled: Boolean(user && effectiveOutlet && isQueryTab),
    placeholderData: (prev) => prev,
  })

  const refetchRef = useRef(refetch)
  useEffect(() => {
    refetchRef.current = refetch
  }, [refetch])

  useEffect(() => {
    if (dataUpdatedAt > 0) {
      setLastUpdatedWib(getWIBLiveClockString(new Date(dataUpdatedAt)))
    }
  }, [dataUpdatedAt])

  const triggerManualRefresh = () => {
    const currentWibDate = getWIBDateParts().dateStr
    if (currentWibDate !== todayWib) {
      setTodayWib(currentWibDate)
    }
    setCountdown(AUTO_REFRESH_INTERVAL_SEC)
    void refetchRef.current()
  }

  // Auto-refresh 60 detik khusus tab Hari Ini (Per Tamu), jeda saat tab browser disembunyikan
  useEffect(() => {
    if (activeTab !== 'today_guest' || !autoRefreshEnabled || !effectiveOutlet) {
      return
    }

    const intervalId = window.setInterval(() => {
      if (document.hidden) return
      setCountdown((prev) => {
        if (prev <= 1) {
          const currentWibDate = getWIBDateParts().dateStr
          if (currentWibDate !== todayWib) {
            setTodayWib(currentWibDate)
          }
          void refetchRef.current()
          return AUTO_REFRESH_INTERVAL_SEC
        }
        return prev - 1
      })
    }, 1000)

    const handleVisibility = () => {
      if (!document.hidden) {
        const currentWibDate = getWIBDateParts().dateStr
        if (currentWibDate !== todayWib) {
          setTodayWib(currentWibDate)
          setCountdown(AUTO_REFRESH_INTERVAL_SEC)
          void refetchRef.current()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [activeTab, autoRefreshEnabled, effectiveOutlet, todayWib])

  const renderNestedFlowCard = (dateStr: string) => {
    const master = flowData?.master
    const summary = flowData?.summary
    const bmRows = flowData?.bm_rows || []
    const rfRows = flowData?.rf_rows || []

    return (
      <div className="space-y-2.5">
        {master && !master.master_found && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50/80 px-3 py-1.5 text-[11px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-200">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>
              Master slot tanggal ini belum tersimpan dari Desktop/Rollover — menampilkan urutan{' '}
              <strong>
                {master.label} ({master.direction})
              </strong>{' '}
              ({getSourceShortLabel(master)}).
            </span>
          </div>
        )}

        {flowError && (
          <Card className="border-red-300 bg-red-50/80 dark:bg-red-950/30">
            <CardContent className="py-3 px-4 flex items-center gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                {flowError instanceof Error
                  ? flowError.message
                  : 'Gagal memuat data Therapist Flow.'}
              </span>
            </CardContent>
          </Card>
        )}

        {/* Unified Card dengan Sub-Tab Level 2: Flow BM (TB) & Flow RF (TR) */}
        <Card className="border-zen-border bg-zen-paper shadow-xs overflow-hidden">
          {/* Sub-Tab Header + Info Tanggal & Arah Slot Kompak */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 px-3 pt-2 pb-0 border-b border-zen-border bg-zen-linen/50 dark:bg-zen-stone/50">
            {/* Sub-Tab Level 2 (Underline Style agar kontras dengan Tab Level 1) */}
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveDeptTab('BM')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeDeptTab === 'BM'
                    ? 'border-zen-matcha text-zen-moss dark:text-zen-matcha bg-zen-paper/80 rounded-t-lg'
                    : 'border-transparent text-zen-charcoal/65 hover:text-zen-charcoal hover:bg-zen-paper/40 rounded-t-lg'
                }`}
              >
                <span>Flow BM</span>
                <span className="text-[10px] font-medium text-zen-charcoal/55">(TB)</span>
                <span className="rounded-full border border-zen-border bg-zen-linen dark:bg-zen-stone px-1.5 py-0.2 font-mono text-[10px] font-semibold text-zen-charcoal">
                  {summary?.bm_therapists ?? bmRows.length} TR • {summary?.bm_present ?? 0} Hadir
                </span>
                <span className="rounded-full bg-zen-matcha/15 px-1.5 py-0.2 font-mono text-[10px] font-bold text-zen-moss dark:text-zen-matcha">
                  {summary?.bm_guests ?? 0} Tamu
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDeptTab('RF')}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeDeptTab === 'RF'
                    ? 'border-zen-matcha text-zen-moss dark:text-zen-matcha bg-zen-paper/80 rounded-t-lg'
                    : 'border-transparent text-zen-charcoal/65 hover:text-zen-charcoal hover:bg-zen-paper/40 rounded-t-lg'
                }`}
              >
                <span>Flow RF</span>
                <span className="text-[10px] font-medium text-zen-charcoal/55">(TR)</span>
                <span className="rounded-full border border-zen-border bg-zen-linen dark:bg-zen-stone px-1.5 py-0.2 font-mono text-[10px] font-semibold text-zen-charcoal">
                  {summary?.rf_therapists ?? rfRows.length} TR • {summary?.rf_present ?? 0} Hadir
                </span>
                <span className="rounded-full bg-zen-matcha/15 px-1.5 py-0.2 font-mono text-[10px] font-bold text-zen-moss dark:text-zen-matcha">
                  {summary?.rf_guests ?? 0} Tamu
                </span>
              </button>
            </div>

            {/* Strip Info Tanggal, Arah Slot & Status Berlangsung */}
            <div className="flex flex-wrap items-center gap-2 pb-2 lg:pb-1.5 text-[11px]">
              <span className="inline-flex items-center gap-1 font-semibold text-zen-charcoal">
                <Calendar className="h-3.5 w-3.5 text-zen-moss" />
                {formatDateIndonesian(dateStr)}
              </span>

              {master && (
                <Badge
                  className={`gap-1 py-0.5 px-2 text-[10.5px] font-bold border-transparent ${
                    master.status_slot === 0
                      ? 'bg-zen-matcha hover:bg-zen-moss text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                  title={getSourceShortLabel(master)}
                >
                  {master.status_slot === 0 ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {master.status_slot === 0 ? 'ATAS (1 → N)' : 'BAWAH (N → 1)'}
                </Badge>
              )}

              {(summary?.total_active_started ?? 0) > 0 && (
                <Badge
                  variant="outline"
                  className="py-0.5 px-2 text-[10.5px] border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200 font-semibold"
                >
                  {summary?.total_active_started} Berlangsung
                </Badge>
              )}
            </div>
          </div>

          {/* Tabel Aktif Sesuai Sub-Tab */}
          {activeDeptTab === 'BM' ? (
            <FlowTable
              title="Flow BM"
              subtitle="Body Massage • TB"
              rows={bmRows}
              kodeOutlet={flowData?.kode_outlet || effectiveOutlet || ''}
              isLoading={isFlowLoading && !flowData}
              onSelectTherapist={(row, sectionLabel) => setModalState({ row, sectionLabel })}
            />
          ) : (
            <FlowTable
              title="Flow RF"
              subtitle="Foot Reflexology • TR"
              rows={rfRows}
              kodeOutlet={flowData?.kode_outlet || effectiveOutlet || ''}
              isLoading={isFlowLoading && !flowData}
              onSelectTherapist={(row, sectionLabel) => setModalState({ row, sectionLabel })}
            />
          )}
        </Card>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-3 pb-12">
        {/* Toolbar Atas Terpadu & Kompak (Judul + Outlet + Auto-Refresh + Segarkan) */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 rounded-xl border border-zen-border bg-zen-paper px-3.5 py-2.5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold font-serif text-zen-charcoal flex items-center gap-2 shrink-0">
              <ArrowUpDown className="h-5 w-5 text-zen-moss" />
              Therapist Flow
            </h1>

            <div className="w-full sm:w-[270px] shrink-0">
              {isMultiOutlet ? (
                <Select
                  value={selectedOutlet}
                  onValueChange={(val) => {
                    setSelectedOutlet(val)
                    setCountdown(AUTO_REFRESH_INTERVAL_SEC)
                  }}
                  disabled={isOutletsLoading || activeOutlets.length === 0}
                >
                  <SelectTrigger className="h-8 text-xs bg-zen-linen/60 dark:bg-zen-stone border-zen-border">
                    <div className="flex items-center gap-1.5 truncate">
                      <Store className="h-3.5 w-3.5 text-zen-moss shrink-0" />
                      <SelectValue placeholder="Pilih 1 outlet aktif..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {activeOutlets.map((o) => (
                      <SelectItem key={o.kode_outlet} value={o.kode_outlet} className="text-xs">
                        [{o.kode_outlet}] {o.name_outlet}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex h-8 items-center gap-1.5 rounded-md border border-zen-border bg-zen-linen/70 dark:bg-zen-stone px-2.5 text-xs font-semibold text-zen-charcoal">
                  <Lock className="h-3.5 w-3.5 text-zen-moss shrink-0" />
                  <span className="truncate">{userOutletLabel}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'today_guest' && (
              <div className="flex items-center gap-2 rounded-lg border border-zen-border bg-zen-linen/60 dark:bg-zen-stone/70 px-2.5 py-1 text-[11px]">
                <Timer className="h-3.5 w-3.5 text-zen-moss shrink-0" />
                <span className="font-medium text-zen-charcoal">Auto</span>
                <Switch
                  checked={autoRefreshEnabled}
                  onCheckedChange={(checked) => {
                    setAutoRefreshEnabled(checked)
                    setCountdown(AUTO_REFRESH_INTERVAL_SEC)
                  }}
                  aria-label="Aktifkan refresh otomatis setiap 60 detik"
                  className="scale-90"
                />
                {autoRefreshEnabled && (
                  <span className="font-mono text-[11px] text-zen-moss dark:text-zen-matcha font-bold min-w-[36px] text-right">
                    {countdown}s
                  </span>
                )}
              </div>
            )}

            <span className="text-[11px] text-zen-charcoal/60 font-mono">
              {lastUpdatedWib} WIB
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerManualRefresh}
              disabled={isFlowFetching || !isQueryTab || !effectiveOutlet}
              className="h-8 px-2.5 text-xs gap-1.5 border-zen-border bg-zen-paper hover:bg-zen-cream"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFlowFetching ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
          </div>
        </div>

        {!effectiveOutlet && !isMultiOutlet && (
          <Card className="border-amber-300 bg-amber-50/80 dark:bg-amber-950/30">
            <CardContent className="py-3 px-4 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Kode outlet belum terdaftar pada profil akun Anda. Silakan hubungi Administrator untuk menetapkan outlet tugas.
              </span>
            </CardContent>
          </Card>
        )}

        {/* Tab Level 1 (Periode / Mode) */}
        <Tabs
          value={activeTab}
          onValueChange={(val: string) => {
            setActiveTab(val as FlowTabValue)
            if (val === 'today_guest') {
              setCountdown(AUTO_REFRESH_INTERVAL_SEC)
            }
          }}
        >
          <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 bg-zen-stone/80 dark:bg-zen-stone p-1 rounded-xl border border-zen-border">
            <TabsTrigger
              value="today_guest"
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                activeTab === 'today_guest'
                  ? '!bg-zen-matcha !text-white shadow-xs'
                  : 'text-zen-charcoal/75 hover:text-zen-charcoal'
              }`}
            >
              Hari Ini (Per Tamu)
            </TabsTrigger>
            <TabsTrigger
              value="yesterday_flow"
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                activeTab === 'yesterday_flow'
                  ? '!bg-zen-matcha !text-white shadow-xs'
                  : 'text-zen-charcoal/75 hover:text-zen-charcoal'
              }`}
            >
              Flow Kemarin
            </TabsTrigger>
            <TabsTrigger
              value="today_hour"
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                activeTab === 'today_hour'
                  ? '!bg-zen-matcha !text-white shadow-xs'
                  : 'text-zen-charcoal/75 hover:text-zen-charcoal'
              }`}
            >
              Hari Ini (Per Jam)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today_guest" className="mt-2.5">
            {renderNestedFlowCard(todayWib)}
          </TabsContent>

          <TabsContent value="yesterday_flow" className="mt-2.5">
            {renderNestedFlowCard(yesterdayWib)}
          </TabsContent>

          <TabsContent value="today_hour" className="mt-2.5">
            <Card className="border-zen-border bg-zen-paper shadow-xs">
              <CardContent className="py-12 px-6 text-center space-y-2.5">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zen-matcha/15 text-zen-moss">
                  <Clock className="h-6 w-6" />
                </div>
                <h2 className="text-base font-bold font-serif text-zen-charcoal">
                  Alur Terapis Per Jam — Segera Hadir
                </h2>
                <p className="mx-auto max-w-md text-xs text-zen-charcoal/70">
                  Tampilan linimasa per jam untuk memantau kepadatan terapis dan distribusi tamu
                  berdasarkan slot waktu operasional sedang disiapkan untuk tahap pengembangan
                  berikutnya.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Rincian Semua Tamu Terapis */}
      <Dialog open={Boolean(modalState)} onOpenChange={(open) => !open && setModalState(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-zen-charcoal flex items-center gap-2">
              <Users className="h-5 w-5 text-zen-moss" />
              Daftar Tamu Terapis — {modalState?.row.namakaryawan}
            </DialogTitle>
            <DialogDescription>
              {modalState?.sectionLabel} • {formatDateIndonesian(targetDate)} • Outlet{' '}
              {flowData?.kode_outlet || effectiveOutlet}
            </DialogDescription>
          </DialogHeader>

          {modalState && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-zen-border bg-zen-linen/70 dark:bg-zen-stone p-3">
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">ID &amp; Kode</span>
                  <span className="font-mono font-semibold text-zen-charcoal">
                    {modalState.row.idkaryawan || '-'} / {modalState.row.kodekaryawan}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Group / Slot</span>
                  <span className="font-mono font-bold text-zen-moss dark:text-zen-matcha">
                    Group {modalState.row.ngroup || '-'} • Slot {modalState.row.noslot || '-'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Kehadiran</span>
                  <div className="mt-0.5">
                    <AttendanceBadge row={modalState.row} />
                  </div>
                </div>
                <div>
                  <span className="block text-[11px] text-zen-charcoal/60">Total Tamu</span>
                  <span className="font-mono text-sm font-bold text-zen-charcoal">
                    {modalState.row.total_guests} Tamu
                  </span>
                </div>
              </div>

              {modalState.row.guests.length === 0 ? (
                <div className="rounded-xl border border-zen-border p-6 text-center text-zen-charcoal/65">
                  Belum ada transaksi tamu untuk terapis ini pada tanggal tersebut.
                </div>
              ) : (
                <div className="space-y-2">
                  {modalState.row.guests.map((guest, idx) => {
                    const isRequest = (guest.byrequest || '').toUpperCase().trim() === 'Y'
                    const statusMeta = getGuestStatusMeta(guest.status_trans)
                    const roomDisplay = formatRoomLabel(
                      guest.room_id,
                      flowData?.kode_outlet || effectiveOutlet || ''
                    )

                    return (
                      <div
                        key={guest.trans_id || `${idx}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-zen-border bg-zen-paper p-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center justify-center rounded-md bg-zen-matcha/15 px-2 py-0.5 font-mono text-[11px] font-bold text-zen-moss dark:text-zen-matcha">
                              Guest {idx + 1}
                            </span>
                            <span className="font-mono font-semibold text-zen-charcoal">
                              {formatTimeRange(guest.start_time, guest.end_time)}
                            </span>
                            {isRequest && (
                              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                                REQUEST
                              </span>
                            )}
                            <span
                              className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${statusMeta.badgeClass}`}
                            >
                              {statusMeta.label}
                            </span>
                          </div>

                          <div className="text-sm font-bold text-zen-charcoal">
                            {guest.nama_customer || '-'}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zen-charcoal/70 font-mono">
                            <span>Room: {roomDisplay}</span>
                            {guest.typejasa && <span>Jasa: {guest.typejasa}</span>}
                            {guest.rcpt && <span>Resepsionis: {guest.rcpt}</span>}
                          </div>
                        </div>

                        <div className="text-[11px] font-mono text-zen-charcoal/60 sm:text-right">
                          {guest.trans_id}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

export default TherapistFlowPage
