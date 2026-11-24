import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BellRing,
  CheckCircle2,
  Laptop,
  Megaphone,
  Send,
  Smartphone,
  Sparkles,
  Trash2,
  Users,
  RefreshCw,
  Wrench,
  Info,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useAuthUser } from '@/hooks/useAuth'
import { useMasterOutlet } from '@/hooks/useMasterOutlet'
import { ROLE_LABELS, type RoleId } from '@/types/database'
import {
  broadcastAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  fetchPushStats,
  type AnnouncementCategory,
  type AnnouncementTargetType,
  type WhmAnnouncement,
} from '@/services/pushNotificationService'

const SELECTABLE_ROLES: Array<{ id: RoleId; label: string }> = [
  { id: 1, label: `1 - ${ROLE_LABELS[1]}` },
  { id: 2, label: `2 - ${ROLE_LABELS[2]}` },
  { id: 3, label: `3 - ${ROLE_LABELS[3]}` },
  { id: 4, label: `4 - ${ROLE_LABELS[4]}` },
  { id: 5, label: `5 - ${ROLE_LABELS[5]}` },
  { id: 6, label: `6 - ${ROLE_LABELS[6]}` },
  { id: 7, label: `7 - ${ROLE_LABELS[7]}` },
  { id: 8, label: `8 - ${ROLE_LABELS[8]}` },
  { id: 10, label: `10 - ${ROLE_LABELS[10]}` },
  { id: 13, label: `13 - ${ROLE_LABELS[13]}` },
  { id: 14, label: `14 - ${ROLE_LABELS[14]}` },
  { id: 15, label: `15 - ${ROLE_LABELS[15]}` },
  { id: 16, label: `16 - ${ROLE_LABELS[16]}` },
  { id: 18, label: `18 - ${ROLE_LABELS[18]}` },
  { id: 19, label: `19 - ${ROLE_LABELS[19]}` },
]

const ROUTE_PRESETS: Array<{ label: string; value: string }> = [
  { label: 'Dasbor Utama (/dashboard)', value: '/dashboard' },
  { label: 'Tutorial & Panduan (/tutorial)', value: '/tutorial' },
  { label: 'Jual Customer — Pesanan (/customer-sales/orders)', value: '/customer-sales/orders' },
  { label: 'Transfer Stok — Request (/sto/requests)', value: '/sto/requests' },
  { label: 'Persetujuan Opname (/inventory/opname-approval)', value: '/inventory/opname-approval' },
  { label: 'HRD — Laporan Evaluasi TR (/hrd/tr-laporan)', value: '/hrd/tr-laporan' },
  { label: 'HRD — Employee KPI (/hrd/employee-kpi)', value: '/hrd/employee-kpi' },
  { label: 'POS Live Report (/pos-dashboard/live)', value: '/pos-dashboard/live' },
  { label: 'Web Data — Berita & Promo (/web/news-promo)', value: '/web/news-promo' },
  { label: 'Rute Kustom (Ketik Manual)', value: '__custom__' },
]

const CATEGORY_OPTIONS: Array<{
  value: AnnouncementCategory
  label: string
  badgeClass: string
  Icon: React.ElementType
}> = [
  {
    value: 'NEW_MODULE',
    label: 'Modul Baru',
    badgeClass: 'bg-zen-matcha/15 text-zen-moss dark:text-zen-matcha border-zen-matcha/30',
    Icon: Sparkles,
  },
  {
    value: 'UPDATE',
    label: 'Pembaruan',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    Icon: RefreshCw,
  },
  {
    value: 'MAINTENANCE',
    label: 'Pemeliharaan',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    Icon: Wrench,
  },
  {
    value: 'INFO',
    label: 'Informasi',
    badgeClass: 'bg-zen-sand/30 text-zen-charcoal dark:text-zen-linen border-zen-sand/50',
    Icon: Info,
  },
]

export function AnnouncementsPage() {
  const { user } = useAuthUser()
  const queryClient = useQueryClient()
  const { data: outlets = [] } = useMasterOutlet(false)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<AnnouncementCategory>('NEW_MODULE')
  const [routePreset, setRoutePreset] = useState('/dashboard')
  const [customUrl, setCustomUrl] = useState('/dashboard')
  const [targetType, setTargetType] = useState<AnnouncementTargetType>('ALL')
  const [selectedRoles, setSelectedRoles] = useState<number[]>([])
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([])
  const [sendPush, setSendPush] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['whm-push-stats'],
    queryFn: fetchPushStats,
    staleTime: 1000 * 30,
  })

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['whm-announcements-admin', user?.id],
    queryFn: () => fetchAnnouncements(user?.id || '', 50),
    enabled: Boolean(user?.id),
    staleTime: 1000 * 30,
  })

  const announcements = historyData?.items || []
  const activeUrl = routePreset === '__custom__' ? customUrl.trim() || '/dashboard' : routePreset

  const platformSummary = useMemo(() => {
    const bp = stats?.by_platform || {}
    return {
      android: bp.android || 0,
      ios: bp.ios || 0,
      desktop: bp.desktop || 0,
      other: bp.other || 0,
    }
  }, [stats])

  const toggleRole = (roleId: number) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    )
  }

  const toggleOutlet = (kode: string) => {
    setSelectedOutlets((prev) =>
      prev.includes(kode) ? prev.filter((o) => o !== kode) : [...prev, kode]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanTitle = title.trim()
    const cleanBody = body.trim()
    if (!cleanTitle) {
      toast.error('Judul pengumuman wajib diisi.')
      return
    }
    if (!cleanBody) {
      toast.error('Isi pesan pengumuman wajib diisi.')
      return
    }
    if (!activeUrl.startsWith('/')) {
      toast.error('Tautan tujuan harus diawali tanda "/" (contoh: /tutorial).')
      return
    }
    if (targetType === 'ROLES' && selectedRoles.length === 0) {
      toast.error('Pilih minimal satu Role tujuan.')
      return
    }
    if (targetType === 'OUTLETS' && selectedOutlets.length === 0) {
      toast.error('Pilih minimal satu Outlet tujuan.')
      return
    }

    setIsSending(true)
    try {
      const result = await broadcastAnnouncement({
        title: cleanTitle,
        body: cleanBody,
        url: activeUrl,
        category,
        target_type: targetType,
        target_roles: targetType === 'ROLES' ? selectedRoles : undefined,
        target_outlets: targetType === 'OUTLETS' ? selectedOutlets : undefined,
        send_push: sendPush,
      })

      if (result.warning) {
        toast.warning(result.warning)
      } else if (sendPush) {
        const { sent_count, total_targeted, cleaned_count } = result.stats
        toast.success(
          `Pengumuman terkirim! Push: ${sent_count}/${total_targeted} perangkat` +
            (cleaned_count > 0 ? ` (${cleaned_count} perangkat usang dibersihkan).` : '.')
        )
      } else {
        toast.success('Pengumuman In-App berhasil diterbitkan.')
      }

      setTitle('')
      setBody('')
      setSelectedRoles([])
      setSelectedOutlets([])
      await Promise.all([
        refetchHistory(),
        refetchStats(),
        queryClient.invalidateQueries({ queryKey: ['whm-announcements'] }),
      ])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim pengumuman.'
      toast.error(msg)
    } finally {
      setIsSending(false)
    }
  }

  const handleDelete = async (item: WhmAnnouncement) => {
    const confirmed = window.confirm(
      `Hapus pengumuman "${item.title}" dari riwayat dan lonceng notifikasi?`
    )
    if (!confirmed) return

    setDeletingId(item.id)
    try {
      await deleteAnnouncement(item.id)
      toast.success('Pengumuman berhasil dihapus.')
      await Promise.all([
        refetchHistory(),
        queryClient.invalidateQueries({ queryKey: ['whm-announcements'] }),
      ])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus pengumuman.'
      toast.error(msg)
    } finally {
      setDeletingId(null)
    }
  }

  const renderTargetBadge = (item: WhmAnnouncement) => {
    if (item.target_type === 'ALL') {
      return (
        <span className="inline-flex items-center rounded-full bg-zen-matcha/15 px-2 py-0.5 text-[11px] font-medium text-zen-moss dark:text-zen-matcha">
          Semua Pengguna
        </span>
      )
    }
    if (item.target_type === 'ROLES') {
      return (
        <span className="inline-flex items-center rounded-full bg-purple-500/15 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:text-purple-300">
          Role: {(item.target_roles || []).join(', ')}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300">
        Outlet: {(item.target_outlets || []).join(', ')}
      </span>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-serif text-zen-charcoal flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-zen-moss" />
              Pengumuman &amp; Push Notification
            </h1>
            <p className="text-sm text-zen-charcoal/70 mt-1">
              Kirim pengumuman modul baru atau informasi penting langsung ke notifikasi perangkat PWA pengguna (Android, iOS, Laptop/PC) maupun lonceng In-App.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchStats()
              refetchHistory()
            }}
            className="self-start sm:self-auto gap-1.5 border-zen-border"
          >
            <RefreshCw className="h-4 w-4" />
            Segarkan Data
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-zen-border bg-white dark:bg-zen-stone p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zen-charcoal/70">
                Perangkat Push Aktif
              </span>
              <BellRing className="h-5 w-5 text-zen-moss" />
            </div>
            <p className="text-2xl font-bold text-zen-charcoal mt-2">
              {stats?.active_devices ?? 0}
            </p>
            <p className="text-[11px] text-zen-charcoal/60 mt-0.5">
              Browser &amp; PWA siap menerima notifikasi latar belakang
            </p>
          </div>

          <div className="rounded-xl border border-zen-border bg-white dark:bg-zen-stone p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zen-charcoal/70">
                Pengguna Berlangganan
              </span>
              <Users className="h-5 w-5 text-zen-moss" />
            </div>
            <p className="text-2xl font-bold text-zen-charcoal mt-2">
              {stats?.unique_users ?? 0}
            </p>
            <p className="text-[11px] text-zen-charcoal/60 mt-0.5">
              Akun unik dengan minimal 1 perangkat aktif
            </p>
          </div>

          <div className="rounded-xl border border-zen-border bg-white dark:bg-zen-stone p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zen-charcoal/70">
                Distribusi Platform
              </span>
              <Smartphone className="h-5 w-5 text-zen-moss" />
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs font-semibold text-zen-charcoal">
              <span className="inline-flex items-center gap-1 rounded-md bg-zen-linen dark:bg-black/20 px-2 py-1">
                <Smartphone className="h-3.5 w-3.5 text-zen-moss" />
                Android: {platformSummary.android}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-zen-linen dark:bg-black/20 px-2 py-1">
                <Smartphone className="h-3.5 w-3.5 text-sky-600" />
                iOS: {platformSummary.ios}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-zen-linen dark:bg-black/20 px-2 py-1">
                <Laptop className="h-3.5 w-3.5 text-amber-600" />
                Desktop: {platformSummary.desktop}
              </span>
            </div>
          </div>
        </div>

        {/* Broadcast Composer Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zen-border bg-white dark:bg-zen-stone p-5 shadow-xs space-y-5"
        >
          <div className="flex items-center gap-2 border-b border-zen-border/70 pb-3">
            <Send className="h-5 w-5 text-zen-moss" />
            <h2 className="text-base font-bold text-zen-charcoal">
              Buat &amp; Kirim Pengumuman Baru
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zen-charcoal">
                Judul Pengumuman <span className="text-red-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Contoh: Modul Baru Penjualan Customer B2B Sudah Tersedia!"
                required
              />
              <p className="text-[11px] text-zen-charcoal/55 text-right">
                {title.length}/120 karakter
              </p>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zen-charcoal">
                Kategori Pengumuman
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORY_OPTIONS.map((opt) => {
                  const Icon = opt.Icon
                  const active = category === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCategory(opt.value)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-all ${
                        active
                          ? 'border-zen-matcha bg-zen-matcha text-white shadow-xs'
                          : 'border-zen-border bg-zen-linen/50 dark:bg-black/15 text-zen-charcoal hover:bg-zen-sand/20'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zen-charcoal">
              Isi Pesan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={3}
              required
              placeholder="Tuliskan ringkasan modul baru atau instruksi singkat untuk pengguna..."
              className="w-full rounded-lg border border-zen-border bg-white dark:bg-zen-stone px-3 py-2 text-sm text-zen-charcoal placeholder:text-zen-charcoal/40 focus:outline-none focus:ring-2 focus:ring-zen-matcha"
            />
            <p className="text-[11px] text-zen-charcoal/55 text-right">
              {body.length}/500 karakter
            </p>
          </div>

          {/* Target Route */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zen-charcoal">
                Halaman Tujuan Saat Notifikasi Diklik
              </label>
              <select
                value={routePreset}
                onChange={(e) => setRoutePreset(e.target.value)}
                className="w-full h-10 rounded-lg border border-zen-border bg-white dark:bg-zen-stone px-3 text-sm text-zen-charcoal focus:outline-none focus:ring-2 focus:ring-zen-matcha"
              >
                {ROUTE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {routePreset === '__custom__' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zen-charcoal">
                  Rute Kustom (diawali &quot;/&quot;)
                </label>
                <Input
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="/hrd/therapist-flow"
                />
              </div>
            )}
          </div>

          {/* Audience Target */}
          <div className="space-y-3 rounded-xl border border-zen-border/70 bg-zen-linen/40 dark:bg-black/15 p-4">
            <label className="text-xs font-semibold text-zen-charcoal block">
              Target Penerima
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'ALL', label: 'Semua Pengguna' },
                  { id: 'ROLES', label: 'Role Tertentu' },
                  { id: 'OUTLETS', label: 'Outlet Tertentu' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTargetType(opt.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                    targetType === opt.id
                      ? 'border-zen-matcha bg-zen-matcha text-white'
                      : 'border-zen-border bg-white dark:bg-zen-stone text-zen-charcoal hover:bg-zen-sand/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {targetType === 'ROLES' && (
              <div className="pt-2 space-y-2">
                <p className="text-[11px] text-zen-charcoal/70">
                  Pilih satu atau lebih Role tujuan ({selectedRoles.length} dipilih):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SELECTABLE_ROLES.map((r) => {
                    const checked = selectedRoles.includes(r.id)
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleRole(r.id)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          checked
                            ? 'border-zen-matcha bg-zen-matcha/20 text-zen-moss dark:text-zen-matcha font-semibold'
                            : 'border-zen-border bg-white dark:bg-zen-stone text-zen-charcoal/80 hover:bg-zen-sand/20'
                        }`}
                      >
                        {r.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {targetType === 'OUTLETS' && (
              <div className="pt-2 space-y-2">
                <p className="text-[11px] text-zen-charcoal/70">
                  Pilih satu atau lebih Outlet tujuan ({selectedOutlets.length} dipilih):
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {outlets.map((o) => {
                    const checked = selectedOutlets.includes(o.kode_outlet)
                    return (
                      <button
                        key={o.kode_outlet}
                        type="button"
                        onClick={() => toggleOutlet(o.kode_outlet)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          checked
                            ? 'border-zen-matcha bg-zen-matcha/20 text-zen-moss dark:text-zen-matcha font-semibold'
                            : 'border-zen-border bg-white dark:bg-zen-stone text-zen-charcoal/80 hover:bg-zen-sand/20'
                        }`}
                      >
                        [{o.kode_outlet}] {o.name_outlet}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Push Toggle + Submit */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-zen-border/70">
            <div className="flex items-center gap-3">
              <Switch checked={sendPush} onCheckedChange={setSendPush} />
              <div>
                <p className="text-xs font-semibold text-zen-charcoal">
                  Kirim Push Notification Latar Belakang (Background OS Push)
                </p>
                <p className="text-[11px] text-zen-charcoal/65">
                  Jika aktif, perangkat yang berlangganan langsung menerima notifikasi meski aplikasi ditutup.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSending}
              className="bg-zen-matcha hover:bg-zen-moss text-white gap-2 shrink-0"
            >
              <Send className="h-4 w-4" />
              {isSending ? 'Mengirim Pengumuman...' : 'Kirim Pengumuman Sekarang'}
            </Button>
          </div>
        </form>

        {/* Info Notice */}
        <div className="rounded-xl border border-zen-sand/60 bg-zen-linen/70 dark:bg-zen-stone/70 p-4 flex items-start gap-3 text-xs text-zen-charcoal/80">
          <AlertCircle className="h-4 w-4 text-zen-moss shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-zen-charcoal">
              Cara Pengguna Menerima Push Notification di Latar Belakang:
            </p>
            <p>
              Pengguna cukup mengetuk ikon <strong>Lonceng (🔔)</strong> di pojok kanan atas lalu menekan tombol <strong>Aktifkan</strong>. Khusus pengguna <strong>iPhone/iPad (iOS 16.4+)</strong>, aplikasi wajib dipasang ke Layar Utama (<em>Add to Home Screen</em>) terlebih dahulu.
            </p>
          </div>
        </div>

        {/* History Table */}
        <div className="rounded-xl border border-zen-border bg-white dark:bg-zen-stone shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zen-border/70 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zen-charcoal">
              Riwayat Pengumuman Terkirim ({announcements.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zen-linen/70 dark:bg-black/20 border-b border-zen-border/70 text-zen-charcoal/75">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Pengumuman</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 font-semibold">Target</th>
                  <th className="px-4 py-3 font-semibold">Pengiriman Push</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zen-border/50">
                {isLoadingHistory ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zen-charcoal/60">
                      Memuat riwayat pengumuman...
                    </td>
                  </tr>
                ) : announcements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zen-charcoal/60">
                      Belum ada pengumuman yang dikirim.
                    </td>
                  </tr>
                ) : (
                  announcements.map((item) => {
                    const cat =
                      CATEGORY_OPTIONS.find((c) => c.value === item.category) ||
                      CATEGORY_OPTIONS[3]
                    const CatIcon = cat.Icon
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-zen-linen/40 dark:hover:bg-white/5 align-top"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-zen-charcoal/80">
                          <div>
                            {format(new Date(item.created_at), 'dd MMM yyyy', {
                              locale: localeId,
                            })}
                          </div>
                          <div className="text-[11px] text-zen-charcoal/55">
                            {format(new Date(item.created_at), 'HH:mm', { locale: localeId })} WIB
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-md">
                          <p className="font-bold text-zen-charcoal">{item.title}</p>
                          <p className="text-zen-charcoal/75 mt-0.5 whitespace-pre-line">
                            {item.body}
                          </p>
                          <p className="text-[11px] text-zen-moss mt-1">
                            Tujuan: <code className="font-mono">{item.url}</code> • Oleh:{' '}
                            {item.created_by_name || 'SUPERUSER'}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cat.badgeClass}`}
                          >
                            <CatIcon className="h-3 w-3" />
                            {cat.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {renderTargetBadge(item)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.send_push ? (
                            <div className="space-y-0.5">
                              <div className="inline-flex items-center gap-1 font-semibold text-zen-moss">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {item.push_sent_count} / {item.push_total_targeted} perangkat
                              </div>
                              {item.push_failed_count > 0 && (
                                <div className="text-[11px] text-amber-700 dark:text-amber-300">
                                  Gagal: {item.push_failed_count}
                                  {item.push_cleaned_count > 0
                                    ? ` (${item.push_cleaned_count} dibersihkan)`
                                    : ''}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-zen-charcoal/60">
                              In-App Saja
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === item.id}
                            onClick={() => handleDelete(item)}
                            title="Hapus pengumuman"
                            className="h-8 w-8 text-zen-charcoal/60 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default AnnouncementsPage
