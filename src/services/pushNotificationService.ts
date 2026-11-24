import { supabase } from '@/lib/supabase'

export type AnnouncementCategory = 'NEW_MODULE' | 'UPDATE' | 'MAINTENANCE' | 'INFO'
export type AnnouncementTargetType = 'ALL' | 'ROLES' | 'OUTLETS'
export type DevicePushStatus =
  | 'unsupported'
  | 'ios-needs-pwa'
  | 'denied'
  | 'subscribed'
  | 'unsubscribed'

export interface WhmAnnouncement {
  id: string
  title: string
  body: string
  url: string
  category: AnnouncementCategory
  target_type: AnnouncementTargetType
  target_roles: number[] | null
  target_outlets: string[] | null
  send_push: boolean
  push_total_targeted: number
  push_sent_count: number
  push_failed_count: number
  push_cleaned_count: number
  created_by: string | null
  created_by_name: string | null
  created_at: string
  is_read?: boolean
}

export interface WhmPushStats {
  active_devices: number
  unique_users: number
  by_platform: Record<string, number>
}

export interface BroadcastAnnouncementPayload {
  title: string
  body: string
  url: string
  category: AnnouncementCategory
  target_type: AnnouncementTargetType
  target_roles?: number[]
  target_outlets?: string[]
  send_push: boolean
}

export interface BroadcastAnnouncementResult {
  success: boolean
  warning?: string
  announcement: WhmAnnouncement
  stats: {
    total_targeted: number
    sent_count: number
    failed_count: number
    cleaned_count: number
  }
}

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function detectPlatform(): 'android' | 'ios' | 'desktop' | 'other' {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent || ''
  if (/Android/i.test(ua)) return 'android'
  if (isIOSDevice()) return 'ios'
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return 'desktop'
  return 'other'
}

export function isWebPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function keysEqual(
  existingKey: ArrayBuffer | null | undefined,
  expectedKey: Uint8Array
): boolean {
  if (!existingKey) return false
  const existingBytes = new Uint8Array(existingKey)
  if (existingBytes.byteLength !== expectedKey.byteLength) return false
  for (let i = 0; i < expectedKey.byteLength; i++) {
    if (existingBytes[i] !== expectedKey[i]) return false
  }
  return true
}

function extractSubscriptionKeys(subscription: PushSubscription): {
  endpoint: string
  p256dh: string
  auth: string
} {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh || arrayBufferToBase64Url(subscription.getKey('p256dh'))
  const auth = json.keys?.auth || arrayBufferToBase64Url(subscription.getKey('auth'))
  return {
    endpoint: subscription.endpoint,
    p256dh,
    auth,
  }
}

async function waitForServiceWorkerReady(
  timeoutMs = 10000
): Promise<ServiceWorkerRegistration> {
  let timerId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(
        new Error(
          'Service Worker PWA belum siap. Silakan muat ulang halaman lalu coba aktifkan kembali.'
        )
      )
    }, timeoutMs)
  })

  try {
    return await Promise.race([navigator.serviceWorker.ready, timeoutPromise])
  } finally {
    if (timerId !== undefined) clearTimeout(timerId)
  }
}

let cachedVapidPublicKey: string | null = null

export async function getVapidPublicKey(): Promise<string> {
  if (cachedVapidPublicKey) return cachedVapidPublicKey

  const envKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim()
  if (envKey) {
    cachedVapidPublicKey = envKey
    return envKey
  }

  const { data, error } = await supabase.rpc('get_whm_vapid_public_key')
  if (error || !data) {
    throw new Error('Kunci publik VAPID tidak tersedia. Hubungi administrator.')
  }
  cachedVapidPublicKey = String(data).trim()
  return cachedVapidPublicKey
}

export async function getCurrentDeviceSubscriptionStatus(): Promise<DevicePushStatus> {
  if (isIOSDevice() && !isStandalonePWA()) {
    return 'ios-needs-pwa'
  }
  if (!isWebPushSupported()) {
    return 'unsupported'
  }
  if (Notification.permission === 'denied') {
    return 'denied'
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return 'unsubscribed'
    const existing = await registration.pushManager.getSubscription()
    return existing ? 'subscribed' : 'unsubscribed'
  } catch {
    return 'unsubscribed'
  }
}

export async function subscribeCurrentDevice(): Promise<{ endpoint: string }> {
  if (isIOSDevice() && !isStandalonePWA()) {
    throw new Error(
      'Di iPhone/iPad, silakan pasang Zen WHMS ke Layar Utama (Add to Home Screen) terlebih dahulu lalu buka dari ikon tersebut.'
    )
  }
  if (!isWebPushSupported()) {
    throw new Error('Browser pada perangkat ini belum mendukung Push Notification.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(
      'Izin notifikasi ditolak. Anda dapat mengaktifkannya kembali di pengaturan browser.'
    )
  }

  const vapidPublicKey = await getVapidPublicKey()
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
  const registration = await waitForServiceWorkerReady(10000)

  let subscription = await registration.pushManager.getSubscription()
  if (
    subscription &&
    !keysEqual(subscription.options?.applicationServerKey, applicationServerKey)
  ) {
    await subscription.unsubscribe()
    subscription = null
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    })
  }

  const { endpoint, p256dh, auth } = extractSubscriptionKeys(subscription)

  if (!endpoint || !p256dh || !auth) {
    throw new Error('Gagal membaca kunci langganan push dari browser.')
  }

  const { error } = await supabase.rpc('upsert_whm_push_subscription', {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_user_agent: navigator.userAgent || '',
    p_platform: detectPlatform(),
  })

  if (error) {
    throw new Error(`Gagal menyimpan langganan notifikasi: ${error.message}`)
  }

  return { endpoint }
}

/**
 * Silently re-associates an existing browser push subscription to the
 * currently authenticated user (handles shared device account switches & refreshes last_seen_at).
 */
export async function syncExistingDeviceSubscription(): Promise<boolean> {
  try {
    if (isIOSDevice() && !isStandalonePWA()) return false
    if (!isWebPushSupported() || Notification.permission !== 'granted') return false

    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return false

    const existing = await registration.pushManager.getSubscription()
    if (!existing) return false

    const { endpoint, p256dh, auth } = extractSubscriptionKeys(existing)
    if (!endpoint || !p256dh || !auth) return false

    const { error } = await supabase.rpc('upsert_whm_push_subscription', {
      p_endpoint: endpoint,
      p_p256dh: p256dh,
      p_auth: auth,
      p_user_agent: navigator.userAgent || '',
      p_platform: detectPlatform(),
    })

    return !error
  } catch {
    return false
  }
}

export async function unsubscribeCurrentDevice(): Promise<void> {
  if (!isWebPushSupported()) return

  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return

  const existing = await registration.pushManager.getSubscription()
  if (!existing) return

  const endpoint = existing.endpoint
  await existing.unsubscribe()

  await supabase.rpc('deactivate_whm_push_subscription', {
    p_endpoint: endpoint,
  })
}

export async function fetchAnnouncements(
  userId: string,
  limit = 30
): Promise<{ items: WhmAnnouncement[]; unreadCount: number }> {
  const [annRes, readRes] = await Promise.all([
    supabase
      .from('whm_announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('whm_announcement_reads')
      .select('announcement_id')
      .eq('user_id', userId),
  ])

  if (annRes.error) throw annRes.error
  if (readRes.error) throw readRes.error

  const readIds = new Set(
    (readRes.data || []).map((r: { announcement_id: string }) => r.announcement_id)
  )

  const items: WhmAnnouncement[] = (annRes.data || []).map((row) => ({
    ...(row as WhmAnnouncement),
    is_read: readIds.has((row as WhmAnnouncement).id),
  }))

  const unreadCount = items.filter((item) => !item.is_read).length
  return { items, unreadCount }
}

export async function markAnnouncementAsRead(
  announcementId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.from('whm_announcement_reads').upsert(
    {
      announcement_id: announcementId,
      user_id: userId,
    },
    { onConflict: 'announcement_id,user_id' }
  )
  if (error) throw error
}

export async function markAllAnnouncementsAsRead(
  announcementIds: string[],
  userId: string
): Promise<void> {
  if (announcementIds.length === 0) return
  const rows = announcementIds.map((id) => ({
    announcement_id: id,
    user_id: userId,
  }))
  const { error } = await supabase
    .from('whm_announcement_reads')
    .upsert(rows, { onConflict: 'announcement_id,user_id' })
  if (error) throw error
}

export async function fetchPushStats(): Promise<WhmPushStats> {
  const { data, error } = await supabase.rpc('get_whm_push_stats')
  if (error) throw error
  return (data || {
    active_devices: 0,
    unique_users: 0,
    by_platform: {},
  }) as WhmPushStats
}

export async function broadcastAnnouncement(
  payload: BroadcastAnnouncementPayload
): Promise<BroadcastAnnouncementResult> {
  const { data, error } = await supabase.functions.invoke('send-whm-push', {
    body: payload,
  })

  if (error) {
    let detailMessage = ''
    const ctx = (error as { context?: unknown }).context
    if (ctx && typeof (ctx as Response).clone === 'function') {
      try {
        const errBody = (await (ctx as Response).clone().json()) as { error?: string }
        if (errBody?.error) {
          detailMessage = String(errBody.error)
        }
      } catch {
        // Ignore JSON parsing failure for non-JSON error responses
      }
    }
    throw new Error(detailMessage || error.message || 'Gagal mengirim pengumuman.')
  }

  if (data?.error) {
    throw new Error(String(data.error))
  }

  return data as BroadcastAnnouncementResult
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('whm_announcements').delete().eq('id', id)
  if (error) throw error
}
