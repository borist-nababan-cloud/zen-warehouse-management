import { useState, useEffect, useCallback } from 'react'

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export interface PWAInstallState {
  isInstallable: boolean
  isInstalled: boolean
  isIOS: boolean
  isIOSSafari: boolean
  promptInstall: () => Promise<boolean>
}

// Capture beforeinstallprompt at module load time so it is never missed before React mounts
let cachedDeferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    cachedDeferredPrompt = e as BeforeInstallPromptEvent
    listeners.forEach((cb) => cb(cachedDeferredPrompt))
  })

  window.addEventListener('appinstalled', () => {
    cachedDeferredPrompt = null
    listeners.forEach((cb) => cb(null))
  })
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => cachedDeferredPrompt
  )
  const [isInstallable, setIsInstallable] = useState<boolean>(() => Boolean(cachedDeferredPrompt))
  const [isInstalled, setIsInstalled] = useState<boolean>(false)
  const [isIOS, setIsIOS] = useState<boolean>(false)
  const [isIOSSafari, setIsIOSSafari] = useState<boolean>(false)

  useEffect(() => {
    const checkInstalled = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches
      const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true
      const isAndroidApp = document.referrer.includes('android-app://')
      return isStandaloneMedia || isIOSStandalone || isAndroidApp
    }

    const installed = checkInstalled()
    setIsInstalled(installed)

    const ua = window.navigator.userAgent.toLowerCase()
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(isIOSDevice)

    const isSafariBrowser = /safari/.test(ua) && !/chrome|crios|fxios|edgios/.test(ua)
    setIsIOSSafari(isIOSDevice && isSafariBrowser && !installed)

    if (installed) {
      setIsInstallable(false)
      return
    }

    if (cachedDeferredPrompt) {
      setDeferredPrompt(cachedDeferredPrompt)
      setIsInstallable(true)
    }

    const handlePromptChange = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt)
      setIsInstallable(Boolean(prompt))
    }

    listeners.add(handlePromptChange)

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      listeners.delete(handlePromptChange)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const promptToUse = deferredPrompt || cachedDeferredPrompt
    if (!promptToUse) return false
    try {
      await promptToUse.prompt()
      const choiceResult = await promptToUse.userChoice
      if (choiceResult.outcome === 'accepted') {
        cachedDeferredPrompt = null
        setIsInstalled(true)
        setIsInstallable(false)
        setDeferredPrompt(null)
        return true
      }
      return false
    } catch (err) {
      console.warn('Error during PWA installation prompt:', err)
      return false
    }
  }, [deferredPrompt])

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isIOSSafari,
    promptInstall,
  }
}
