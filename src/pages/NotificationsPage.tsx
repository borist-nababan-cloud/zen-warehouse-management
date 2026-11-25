import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  Info,
  Mail,
  MailOpen,
  Megaphone,
  RefreshCw,
  Search,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Badge } from '@/components/ui/badge'
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
import { useAuthUser } from '@/hooks/useAuth'
import {
  fetchAnnouncements,
  markAllAnnouncementsAsRead,
  markAnnouncementAsRead,
  markAnnouncementAsUnread,
  type AnnouncementCategory,
  type WhmAnnouncement,
} from '@/services/pushNotificationService'

type ReadFilter = 'ALL' | 'UNREAD' | 'READ'
type CategoryFilter = 'ALL' | AnnouncementCategory

const CATEGORY_META: Record<
  AnnouncementCategory,
  { label: string; badgeClass: string; Icon: React.ElementType }
> = {
  NEW_MODULE: {
    label: 'Modul Baru',
    badgeClass: 'bg-zen-matcha/15 text-zen-moss dark:text-zen-matcha border-zen-matcha/30',
    Icon: Sparkles,
  },
  UPDATE: {
    label: 'Pembaruan',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    Icon: RefreshCw,
  },
  MAINTENANCE: {
    label: 'Pemeliharaan',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    Icon: Wrench,
  },
  INFO: {
    label: 'Informasi',
    badgeClass: 'bg-zen-sand/30 text-zen-charcoal dark:text-zen-linen border-zen-sand/50',
    Icon: Info,
  },
}

function formatWibDateTime(ts: string): string {
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ts
    return (
      new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d) + ' WIB'
    )
  } catch {
    return ts
  }
}

export function NotificationsPage() {
  const { user } = useAuthUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const highlightedId = searchParams.get('id')
  const lastScrolledIdRef = useRef<string | null>(null)

  const userId = user?.id || ''
  const isSuperuser = user?.user_role === 8

  const [readFilter, setReadFilter] = useState<ReadFilter>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['whm-announcements', userId, 'full'],
    queryFn: () => fetchAnnouncements(userId, 200),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 2,
  })

  const items = useMemo(() => {
    const raw = data?.items || []
    return [...raw].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [data?.items])

  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items]
  )
  const readCount = items.length - unreadCount

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return items.filter((item) => {
      if (readFilter === 'UNREAD' && item.is_read) return false
      if (readFilter === 'READ' && !item.is_read) return false
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false
      if (q) {
        const matchTitle = (item.title || '').toLowerCase().includes(q)
        const matchBody = (item.body || '').toLowerCase().includes(q)
        if (!matchTitle && !matchBody) return false
      }
      return true
    })
  }, [items, readFilter, categoryFilter, searchQuery])

  // Ensure highlighted item from deep link is visible & scrolled smoothly into view
  useEffect(() => {
    if (!highlightedId) {
      lastScrolledIdRef.current = null
      return
    }
    setReadFilter('ALL')
    setCategoryFilter('ALL')
    setSearchQuery('')
  }, [highlightedId])

  useEffect(() => {
    if (!highlightedId || items.length === 0) return
    if (lastScrolledIdRef.current === highlightedId) return

    const el = document.getElementById(`notification-${highlightedId}`)
    if (el) {
      lastScrolledIdRef.current = highlightedId
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedId, items, filteredItems])

  const handleToggleRead = async (item: WhmAnnouncement) => {
    if (!userId) return
    setBusyId(item.id)
    try {
      if (item.is_read) {
        await markAnnouncementAsUnread(item.id, userId)
        toast.success('Notifikasi ditandai belum dibaca.')
      } else {
        await markAnnouncementAsRead(item.id, userId)
        toast.success('Notifikasi ditandai sudah dibaca.')
      }
      await queryClient.invalidateQueries({ queryKey: ['whm-announcements', userId] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui status baca notifikasi.')
    } finally {
      setBusyId(null)
    }
  }

  const handleMarkAllRead = async () => {
    if (!userId) return
    const unreadIds = items.filter((i) => !i.is_read).map((i) => i.id)
    if (unreadIds.length === 0) return

    setMarkingAll(true)
    try {
      await markAllAnnouncementsAsRead(unreadIds, userId)
      await queryClient.invalidateQueries({ queryKey: ['whm-announcements', userId] })
      toast.success('Semua notifikasi telah ditandai sudah dibaca.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menandai semua notifikasi.')
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif text-zen-charcoal flex items-center gap-2.5">
              <Bell className="h-6 w-6 text-zen-moss" />
              Notifikasi &amp; Pengumuman
            </h1>
            <p className="text-sm text-zen-charcoal/70 mt-1">
              Daftar lengkap pengumuman dan notifikasi sistem (diurutkan dari yang terbaru, tanpa pemotongan teks).
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
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAll || unreadCount === 0}
              className="gap-1.5 bg-zen-matcha hover:bg-zen-moss text-white"
            >
              <CheckCheck className="h-4 w-4" />
              {markingAll ? 'Memproses...' : 'Tandai Semua Sudah Dibaca'}
            </Button>
            {isSuperuser && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/announcements')}
                className="gap-1.5 border-zen-matcha/40 text-zen-moss hover:bg-zen-matcha/10"
              >
                <Megaphone className="h-4 w-4" />
                Kelola &amp; Kirim Pengumuman
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card
            onClick={() => setReadFilter('ALL')}
            className={`cursor-pointer transition-all border-zen-border bg-white dark:bg-zen-stone shadow-xs hover:border-zen-matcha/60 ${
              readFilter === 'ALL' ? 'ring-1 ring-zen-matcha/50' : ''
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-zen-charcoal/70">
                Total Notifikasi
              </CardTitle>
              <Bell className="h-4 w-4 text-zen-moss" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zen-charcoal">{items.length}</div>
              <p className="text-xs text-zen-charcoal/65 mt-0.5">Seluruh pengumuman masuk</p>
            </CardContent>
          </Card>

          <Card
            onClick={() => setReadFilter('UNREAD')}
            className={`cursor-pointer transition-all border-zen-matcha/40 bg-zen-matcha/10 shadow-xs hover:border-zen-matcha ${
              readFilter === 'UNREAD' ? 'ring-1 ring-zen-matcha' : ''
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-zen-moss dark:text-zen-matcha">
                Belum Dibaca
              </CardTitle>
              <Mail className="h-4 w-4 text-zen-moss dark:text-zen-matcha" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zen-moss dark:text-zen-matcha">
                {unreadCount}
              </div>
              <p className="text-xs text-zen-charcoal/70 mt-0.5">Menunggu untuk dibaca</p>
            </CardContent>
          </Card>

          <Card
            onClick={() => setReadFilter('READ')}
            className={`cursor-pointer transition-all border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/25 shadow-xs hover:border-emerald-400 ${
              readFilter === 'READ' ? 'ring-1 ring-emerald-500' : ''
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                Sudah Dibaca
              </CardTitle>
              <MailOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                {readCount}
              </div>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                Riwayat yang telah dibuka
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <Card className="border-zen-border bg-white dark:bg-zen-stone shadow-xs">
          <CardContent className="pt-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              {/* Read Status Tabs */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zen-charcoal">Status Baca</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={readFilter === 'ALL' ? 'default' : 'outline'}
                    onClick={() => setReadFilter('ALL')}
                    className={
                      readFilter === 'ALL'
                        ? 'bg-zen-matcha hover:bg-zen-moss text-white text-xs'
                        : 'border-zen-border text-zen-charcoal text-xs'
                    }
                  >
                    Semua ({items.length})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={readFilter === 'UNREAD' ? 'default' : 'outline'}
                    onClick={() => setReadFilter('UNREAD')}
                    className={
                      readFilter === 'UNREAD'
                        ? 'bg-zen-matcha hover:bg-zen-moss text-white text-xs'
                        : 'border-zen-border text-zen-charcoal text-xs'
                    }
                  >
                    Belum Dibaca ({unreadCount})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={readFilter === 'READ' ? 'default' : 'outline'}
                    onClick={() => setReadFilter('READ')}
                    className={
                      readFilter === 'READ'
                        ? 'bg-zen-matcha hover:bg-zen-moss text-white text-xs'
                        : 'border-zen-border text-zen-charcoal text-xs'
                    }
                  >
                    Sudah Dibaca ({readCount})
                  </Button>
                </div>
              </div>

              {/* Category + Search */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 lg:max-w-xl">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zen-charcoal">Kategori</Label>
                  <Select
                    value={categoryFilter}
                    onValueChange={(val) => setCategoryFilter(val as CategoryFilter)}
                  >
                    <SelectTrigger className="bg-white dark:bg-zen-stone border-zen-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Kategori</SelectItem>
                      <SelectItem value="NEW_MODULE">Modul Baru</SelectItem>
                      <SelectItem value="UPDATE">Pembaruan</SelectItem>
                      <SelectItem value="MAINTENANCE">Pemeliharaan</SelectItem>
                      <SelectItem value="INFO">Informasi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zen-charcoal">Cari Notifikasi</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zen-charcoal/50" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari judul atau isi pengumuman..."
                      className="pl-9 pr-8 bg-white dark:bg-zen-stone border-zen-border"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Hapus pencarian"
                        className="absolute right-2.5 top-2.5 text-zen-charcoal/50 hover:text-zen-charcoal"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Banner */}
        {error && (
          <Card className="border-red-300 bg-red-50/80 dark:bg-red-950/30">
            <CardContent className="py-5 flex items-center gap-3 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>
                {error instanceof Error
                  ? error.message
                  : 'Terjadi kesalahan saat memuat daftar notifikasi.'}
              </span>
            </CardContent>
          </Card>
        )}

        {/* Full Notification List */}
        {isLoading ? (
          <Card className="border-zen-border bg-white dark:bg-zen-stone">
            <CardContent className="py-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zen-matcha border-t-transparent mx-auto" />
              <p className="text-xs text-zen-charcoal/70 mt-3">Memuat daftar notifikasi...</p>
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card className="border-dashed border-2 border-zen-sand bg-white/70 dark:bg-zen-stone/60">
            <CardContent className="py-12 text-center space-y-2">
              <Bell className="h-10 w-10 mx-auto text-zen-moss/60" />
              <p className="text-sm font-semibold text-zen-charcoal">
                Tidak ada notifikasi yang sesuai dengan filter saat ini
              </p>
              <p className="text-xs text-zen-charcoal/65">
                Ubah filter status baca, kategori, atau kata kunci pencarian untuk melihat pengumuman lainnya.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const meta = CATEGORY_META[item.category] || CATEGORY_META.INFO
              const CatIcon = meta.Icon
              const isHighlighted = highlightedId === item.id
              const isUnread = !item.is_read
              const isBusy = busyId === item.id

              return (
                <Card
                  key={item.id}
                  id={`notification-${item.id}`}
                  className={`transition-all shadow-xs bg-white dark:bg-zen-stone ${
                    isHighlighted
                      ? 'ring-2 ring-zen-matcha border-zen-matcha/70'
                      : isUnread
                      ? 'border-l-4 border-l-zen-matcha border-zen-border bg-zen-matcha/[0.04]'
                      : 'border-zen-border'
                  }`}
                >
                  <CardContent className="p-5 space-y-3">
                    {/* Top Metadata Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                        >
                          <CatIcon className="h-3.5 w-3.5" />
                          {meta.label}
                        </span>

                        {isUnread ? (
                          <Badge
                            variant="outline"
                            className="bg-zen-matcha/15 text-zen-moss dark:text-zen-matcha border-zen-matcha/40 text-[11px] gap-1"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-zen-matcha" />
                            Belum Dibaca
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Sudah Dibaca
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-zen-charcoal/65 flex flex-wrap items-center gap-2">
                        {item.created_by_name && (
                          <span>
                            Oleh: <strong className="text-zen-charcoal">{item.created_by_name}</strong>
                          </span>
                        )}
                        <span>•</span>
                        <span>{formatWibDateTime(item.created_at)}</span>
                      </div>
                    </div>

                    {/* Title & Full Untruncated Body */}
                    <div className="space-y-1.5">
                      <h2 className="text-base font-bold text-zen-charcoal leading-snug">
                        {item.title}
                      </h2>
                      <p className="text-sm text-zen-charcoal/85 whitespace-pre-line break-words leading-relaxed">
                        {item.body}
                      </p>
                    </div>

                    {/* Actions Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zen-border/50">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleToggleRead(item)}
                        className="h-8 text-xs gap-1.5 border-zen-border"
                      >
                        {isUnread ? (
                          <>
                            <MailOpen className="h-3.5 w-3.5 text-zen-moss" />
                            {isBusy ? 'Menyimpan...' : 'Tandai Sudah Dibaca'}
                          </>
                        ) : (
                          <>
                            <Mail className="h-3.5 w-3.5 text-zen-charcoal/70" />
                            {isBusy ? 'Menyimpan...' : 'Tandai Belum Dibaca'}
                          </>
                        )}
                      </Button>

                      {item.url && item.url.startsWith('/') && item.url !== '/notifications' && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => navigate(item.url)}
                          className="h-8 text-xs gap-1.5 bg-zen-matcha hover:bg-zen-moss text-white"
                        >
                          Buka Halaman Terkait
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default NotificationsPage
