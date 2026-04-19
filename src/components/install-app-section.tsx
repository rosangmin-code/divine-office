'use client'

import { useEffect, useState } from 'react'
import { ACTIVE_ACCENT, SECTION_CARD } from '@/app/settings/page'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type InstallStatus =
  | 'unknown'
  | 'standalone'
  | 'installed'
  | 'chromiumReady'
  | 'chromiumPending'
  | 'chromiumDismissed'
  | 'ios'
  | 'iosDismissed'
  | 'unsupported'

const DISMISS_KEY = 'loth-install-dismissed-at'
const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const UNSUPPORTED_TIMEOUT_MS = 30_000

function readDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const ts = Number.parseInt(raw, 10)
    if (!Number.isFinite(ts)) return false
    return Date.now() - ts < DISMISS_WINDOW_MS
  } catch {
    return false
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

function detectIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIosDevice = /iPhone|iPad|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return isIosDevice && isSafari
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

export function InstallAppSection() {
  const [status, setStatus] = useState<InstallStatus>('unknown')
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (detectStandalone()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('standalone')
      return
    }

    const dismissed = readDismissed()
    const ios = detectIosSafari()

    if (ios) {
      setStatus(dismissed ? 'iosDismissed' : 'ios')
      return
    }

    let gotPrompt = false
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      gotPrompt = true
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setStatus(dismissed ? 'chromiumDismissed' : 'chromiumReady')
    }
    const onAppInstalled = () => {
      setDeferredPrompt(null)
      setStatus('installed')
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)

    const timeoutId = window.setTimeout(() => {
      if (!gotPrompt) setStatus('unsupported')
    }, UNSUPPORTED_TIMEOUT_MS)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
      window.clearTimeout(timeoutId)
    }
  }, [])

  async function handleInstallClick() {
    if (!deferredPrompt) return
    setStatus('chromiumPending')
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      } else {
        writeDismissed()
        setStatus('chromiumDismissed')
      }
    } catch {
      setStatus('chromiumReady')
    }
  }

  function handleIosDismiss() {
    writeDismissed()
    setStatus('iosDismissed')
  }

  return (
    <section aria-labelledby="install-heading" className={SECTION_CARD}>
      <h2
        id="install-heading"
        className="mb-1 text-lg font-semibold text-stone-800 dark:text-stone-200"
      >
        Апп-г суулгах
      </h2>
      <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
        Нүүр дэлгэцэнд нэмж, офлайн хэрэглэх боломжтой.
      </p>

      <div role="status" aria-live="polite">
        {renderBody(status, handleInstallClick, handleIosDismiss)}
      </div>
    </section>
  )
}

function renderBody(
  status: InstallStatus,
  onInstall: () => void,
  onIosDismiss: () => void,
) {
  if (status === 'unknown') {
    return (
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Төлөвийг шалгаж байна…
      </p>
    )
  }

  if (status === 'standalone' || status === 'installed') {
    return (
      <p className="text-sm text-stone-600 dark:text-stone-300">
        ✓ Апп аль хэдийн суулгасан байна.
      </p>
    )
  }

  if (status === 'chromiumReady' || status === 'chromiumPending') {
    return (
      <button
        type="button"
        onClick={onInstall}
        disabled={status === 'chromiumPending'}
        className={`min-h-[44px] rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${ACTIVE_ACCENT} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {status === 'chromiumPending' ? 'Суулгаж байна…' : 'Суулгах'}
      </button>
    )
  }

  if (status === 'chromiumDismissed') {
    return (
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Дараа дахин оролдоно уу.
      </p>
    )
  }

  if (status === 'ios') {
    return (
      <div className="space-y-4">
        <ol className="space-y-2 text-sm text-stone-600 dark:text-stone-300">
          <li className="flex gap-2">
            <span className="font-semibold text-stone-400 dark:text-stone-500">1.</span>
            <span className="flex flex-wrap items-center gap-1">
              Safari-гийн
              <ShareIcon />
              Share товчийг дар
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-stone-400 dark:text-stone-500">2.</span>
            <span>&quot;Нүүр дэлгэцэнд нэмэх&quot; сонголтыг сонго</span>
          </li>
        </ol>
        <button
          type="button"
          onClick={onIosDismiss}
          className={`min-h-[44px] rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${ACTIVE_ACCENT}`}
        >
          Ойлголоо
        </button>
      </div>
    )
  }

  if (status === 'iosDismissed') {
    return (
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Safari-гийн Share → &quot;Нүүр дэлгэцэнд нэмэх&quot;.
      </p>
    )
  }

  return (
    <p className="text-sm text-stone-500 dark:text-stone-400">
      Таны хөтчид суулгах дэмжлэг одоогоор байхгүй байна.
    </p>
  )
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="inline-block align-middle text-stone-500 dark:text-stone-400"
    >
      <path d="M12 3v13" />
      <path d="M8 7l4-4 4 4" />
      <rect x="4" y="11" width="16" height="10" rx="2" />
    </svg>
  )
}
