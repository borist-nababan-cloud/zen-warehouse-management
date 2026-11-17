import { useState, useEffect } from 'react'
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'zen_whms_pwa_dismissed_until'
const SNOOZE_MS = 24 * 60 * 60 * 1000 // 24 hours

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isIOSSafari, promptInstall } = usePWAInstall()
  const [dismissed, setDismissed] = useState<boolean>(true)
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false)

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || '0')
      setDismissed(Date.now() < until)
    } catch {
      setDismissed(false)
    }
  }, [])

  if (isInstalled || dismissed || (!isInstallable && !isIOSSafari)) {
    return null
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + SNOOZE_MS))
    } catch {
      // ignore storage errors
    }
    setDismissed(true)
    setShowIosGuide(false)
  }

  const handleInstallClick = async () => {
    if (isIOSSafari) {
      setShowIosGuide(true)
    } else {
      await promptInstall()
    }
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded-2xl border border-zen-sand/60 bg-white dark:bg-zen-stone p-3.5 shadow-lg print:hidden">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-zen-matcha/15 flex items-center justify-center shrink-0">
            <img src="/pwa-192x192.png" alt="Zen WHMS" className="w-8 h-8 rounded-lg object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-zen-charcoal dark:text-zen-linen">
                Pasang Zen WHMS
              </p>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-zen-charcoal/50 hover:text-zen-charcoal dark:text-zen-linen/50"
                aria-label="Tutup banner instalasi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              Akses lebih cepat dari layar utama perangkat Anda seperti aplikasi native.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="h-7 px-3 text-xs bg-zen-matcha hover:bg-zen-moss text-white gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Pasang Aplikasi
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-7 px-2 text-[11px] text-muted-foreground"
              >
                Nanti Saja
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zen-stone border border-zen-sand/50 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-zen-matcha" />
                <h3 className="font-bold text-sm text-zen-charcoal dark:text-zen-linen">
                  Pasang Zen WHMS di iPhone / iPad
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ol className="space-y-2.5 text-xs text-zen-charcoal dark:text-zen-linen/90">
              <li className="flex items-center gap-2">
                <span className="font-bold text-zen-moss">1.</span>
                <span>Ketuk ikon <Share className="inline h-3.5 w-3.5 mx-0.5 text-blue-600" /> <strong>Bagikan (Share)</strong> di bilah Safari.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold text-zen-moss">2.</span>
                <span>Gulir ke bawah dan pilih <PlusSquare className="inline h-3.5 w-3.5 mx-0.5 text-zen-matcha" /> <strong>Tambah ke Layar Utama</strong>.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold text-zen-moss">3.</span>
                <span>Ketuk <strong>Tambah</strong> di pojok kanan atas untuk menyelesaikan.</span>
              </li>
            </ol>
            <Button onClick={handleDismiss} className="w-full bg-zen-matcha hover:bg-zen-moss text-white text-xs h-8">
              Mengerti
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
