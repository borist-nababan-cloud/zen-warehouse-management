/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

// Keep immediate activation & clean outdated caches (aligned with commit e042ded)
self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()

// Precache static app shell assets injected by VitePWA
precacheAndRoute(self.__WB_MANIFEST)

// Cache Google Fonts only — NEVER intercept *.supabase.co API/Auth requests
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

interface PushNotificationPayload {
  title?: string
  body?: string
  url?: string
  icon?: string
  badge?: string
  tag?: string
  category?: string
  announcementId?: string
}

// Background Web Push handler — wakes up even when PWA/app is closed
self.addEventListener('push', (event: PushEvent) => {
  let data: PushNotificationPayload = {
    title: 'Zen Warehouse Management',
    body: 'Ada pengumuman baru di Zen WHMS.',
    url: '/dashboard',
  }

  if (event.data) {
    try {
      const parsed = event.data.json() as PushNotificationPayload
      data = {
        ...data,
        ...parsed,
      }
    } catch {
      const text = event.data.text()
      if (text) {
        data.body = text
      }
    }
  }

  const title = data.title || 'Zen Warehouse Management'
  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body: data.body || 'Ada pembaruan baru di Zen WHMS.',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    tag: data.tag || 'zen-whms-announcement',
    renotify: true,
    vibrate: [150, 75, 150],
    data: {
      url: data.url && data.url.startsWith('/') ? data.url : '/dashboard',
      announcementId: data.announcementId || null,
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click handler — focuses existing window or opens target route
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const notifData = (event.notification.data || {}) as { url?: string }
  const targetPath =
    notifData.url && notifData.url.startsWith('/') ? notifData.url : '/dashboard'
  const targetUrl = new URL(targetPath, self.location.origin).href

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client && client.url.startsWith(self.location.origin)) {
            if ('navigate' in client && client.url !== targetUrl) {
              return client.navigate(targetUrl).then((navigated) => navigated?.focus())
            }
            return client.focus()
          }
        }
        return self.clients.openWindow(targetUrl)
      })
  )
})
