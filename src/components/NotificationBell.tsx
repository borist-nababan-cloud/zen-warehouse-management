import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  BellOff,
  BellRing,
  CheckCheck,
  ExternalLink,
  Megaphone,
  Smartphone,
  Sparkles,
  Wrench,
  Info,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuthUser } from '@/hooks/useAuth'
import {
  fetchAnnouncements,
  getCurrentDeviceSubscriptionStatus,
  markAllAnnouncementsAsRead,
  markAnnouncementAsRead,
  subscribeCurrentDevice,
  syncExistingDeviceSubscription,
  unsubscribeCurrentDevice,
  type AnnouncementCategory,
  type DevicePushStatus,
  type WhmAnnouncement,
} from '@/services/pushNotificationService'

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

export function NotificationBell() {
  const { user } = useAuthUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const syncedUserRef = useRef<string | null>(null)

  const [open, setOpen] = useState(false)
  const [pushStatus, setPushStatus] = useState<DevicePushStatus>('unsubscribed')
  const [pushBusy, setPushBusy] = useState(false)

  const userId = user?.id || ''
  const isSuperuser = user?.user_role === 8

  const { data, isLoading } = useQuery({
    queryKey: ['whm-announcements', userId],
    queryFn: () => fetchAnnouncements(userId, 20),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  })

  const items = data?.items || []
  const unreadCount = data?.unreadCount || 0

  useEffect(() => {
    if (!userId) {
      syncedUserRef.current = null
      return
    }
    if (syncedUserRef.current === userId) return
    syncedUserRef.current = userId

    let active = true
    syncExistingDeviceSubscription().then(async (synced) => {
      if (!active) return
      if (synced) {
        setPushStatus('subscribed')
      } else {
        const status = await getCurrentDeviceSubscriptionStatus()
        if (active) setPushStatus(status)
      }
    })

    return () => {
      active = false
    }
  }, [userId])

  useEffect(() => {
    let active = true
    getCurrentDeviceSubscriptionStatus().then((status) => {
      if (active) setPushStatus(status)
    })
    return () => {
      active = false
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleEnablePush = async () => {
    setPushBusy(true)
    try {
      await subscribeCurrentDevice()
      setPushStatus('subscribed')
      toast.success('Notifikasi Push aktif! Anda akan menerima info modul baru di perangkat ini.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengaktifkan notifikasi.'
      toast.error(msg)
      const status = await getCurrentDeviceSubscriptionStatus()
      setPushStatus(status)
    } finally {
      setPushBusy(false)
    }
  }

  const handleDisablePush = async () => {
    setPushBusy(true)
    try {
      await unsubscribeCurrentDevice()
      setPushStatus('unsubscribed')
      toast.success('Notifikasi Push pada perangkat ini telah dinonaktifkan.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menonaktifkan notifikasi.'
      toast.error(msg)
    } finally {
      setPushBusy(false)
    }
  }

  const handleOpenItem = async (item: WhmAnnouncement) => {
    if (!item.is_read && userId) {
      try {
        await markAnnouncementAsRead(item.id, userId)
        queryClient.invalidateQueries({ queryKey: ['whm-announcements', userId] })
      } catch {
        // Non-blocking
      }
    }
    setOpen(false)
    if (item.url && item.url.startsWith('/')) {
      navigate(item.url)
    }
  }

  const handleMarkAllRead = async () => {
    if (!userId) return
    const unreadIds = items.filter((i) => !i.is_read).map((i) => i.id)
    if (unreadIds.length === 0) return
    try {
      await markAllAnnouncementsAsRead(unreadIds, userId)
      queryClient.invalidateQueries({ queryKey: ['whm-announcements', userId] })
      toast.success('Semua pengumuman ditandai sudah dibaca.')
    } catch {
      toast.error('Gagal memperbarui status baca.')
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        title="Pengumuman & Notifikasi"
        className="relative h-9 w-9 rounded-full text-zen-charcoal hover:bg-zen-sand/25"
      >
        {pushStatus === 'subscribed' ? (
          <BellRing className="h-5 w-5 text-zen-moss" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-md rounded-2xl border border-zen-border bg-white dark:bg-zen-stone shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zen-border/70 px-4 py-3 bg-zen-linen/60 dark:bg-zen-stone">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-zen-moss" />
              <span className="text-sm font-bold text-zen-charcoal">
                Pengumuman & Notifikasi
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-zen-moss hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tandai dibaca
              </button>
            )}
          </div>

          {/* Push Subscription Status Bar */}
          <div className="border-b border-zen-border/60 px-4 py-2.5 bg-zen-linen/30 dark:bg-black/15">
            {pushStatus === 'subscribed' && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-zen-moss font-medium">
                  <BellRing className="h-4 w-4 shrink-0" />
                  <span>Notifikasi Push perangkat aktif</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pushBusy}
                  onClick={handleDisablePush}
                  className="h-7 px-2 text-[11px] text-zen-charcoal/70 hover:text-red-600"
                >
                  <BellOff className="h-3.5 w-3.5 mr-1" />
                  Nonaktifkan
                </Button>
              </div>
            )}

            {pushStatus === 'unsubscribed' && (
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-zen-charcoal/80 leading-snug">
                  <p className="font-semibold text-zen-charcoal">Aktifkan Notifikasi Push</p>
                  <p>Terima info modul baru meski aplikasi ditutup.</p>
                </div>
                <Button
                  size="sm"
                  disabled={pushBusy}
                  onClick={handleEnablePush}
                  className="h-8 px-3 text-xs bg-zen-matcha hover:bg-zen-moss text-white shrink-0"
                >
                  {pushBusy ? 'Memproses...' : 'Aktifkan'}
                </Button>
              </div>
            )}

            {pushStatus === 'ios-needs-pwa' && (
              <div className="flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Pengguna iPhone/iPad: pasang Zen WHMS ke <strong>Layar Utama (Add to Home Screen)</strong> lalu buka dari ikon tersebut untuk mengaktifkan Push Notification.
                </span>
              </div>
            )}

            {pushStatus === 'denied' && (
              <div className="flex items-start gap-2 text-[11px] text-red-700 dark:text-red-300 leading-snug">
                <BellOff className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Izin notifikasi diblokir browser. Aktifkan kembali pada pengaturan situs di browser Anda.
                </span>
              </div>
            )}

            {pushStatus === 'unsupported' && (
              <div className="text-[11px] text-zen-charcoal/60">
                Browser perangkat ini belum mendukung Push Notification. Pengumuman tetap tampil di daftar ini.
              </div>
            )}
          </div>

          {/* Announcement Feed */}
          <div className="max-h-80 overflow-y-auto divide-y divide-zen-border/50">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-zen-charcoal/60">
                Memuat pengumuman...
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-xs text-zen-charcoal/60">
                Belum ada pengumuman terbaru.
              </div>
            ) : (
              items.map((item) => {
                const meta = CATEGORY_META[item.category] || CATEGORY_META.INFO
                const CatIcon = meta.Icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpenItem(item)}
                    className={`w-full text-left px-4 py-3 transition-colors hover:bg-zen-linen/70 dark:hover:bg-white/5 ${
                      !item.is_read ? 'bg-zen-matcha/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}
                      >
                        <CatIcon className="h-3 w-3" />
                        {meta.label}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!item.is_read && (
                          <span className="h-2 w-2 rounded-full bg-zen-matcha" />
                        )}
                        <span className="text-[10px] text-zen-charcoal/55">
                          {format(new Date(item.created_at), 'dd MMM HH:mm', {
                            locale: localeId,
                          })}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-zen-charcoal leading-snug">
                      {item.title}
                    </p>
                    <p className="text-xs text-zen-charcoal/75 mt-0.5 line-clamp-2 leading-relaxed">
                      {item.body}
                    </p>
                    {item.url && item.url !== '/dashboard' && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-zen-moss">
                        Buka halaman terkait
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Superuser Footer Shortcut */}
          {isSuperuser && (
            <div className="border-t border-zen-border/70 p-2.5 bg-zen-linen/50 dark:bg-zen-stone">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpen(false)
                  navigate('/admin/announcements')
                }}
                className="w-full h-8 text-xs border-zen-matcha/40 text-zen-moss hover:bg-zen-matcha/10"
              >
                <Megaphone className="h-3.5 w-3.5 mr-1.5" />
                Kelola & Kirim Pengumuman Push
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
