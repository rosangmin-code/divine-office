'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { bookPageToPdfPage, bookPageSide, PDF_ASSET_PATH } from '@/lib/pdf-page'

const MIN_BOOK_PAGE = 1
const MAX_BOOK_PAGE = 969 // 485 2-up pages -> 970 halves; last indexable half is 969

// Swipe gesture tuning (per FR-017j plan §3.3)
const SWIPE_THRESHOLD = 60 // px horizontal travel to register a swipe
const EDGE_DEADZONE = 16 // px from left edge ignored — iOS back-gesture safety
const VERTICAL_REJECT = 1.2 // |dx| must exceed VERTICAL_REJECT * |dy|
const SWIPE_DEBOUNCE_MS = 100 // ignore additional swipes within this window

type PdfDoc = {
  getPage: (n: number) => Promise<{
    getViewport: (opts: { scale: number }) => { width: number; height: number }
    render: (opts: {
      canvasContext: CanvasRenderingContext2D
      viewport: { width: number; height: number }
      canvas: HTMLCanvasElement
    }) => { promise: Promise<void>; cancel: () => void }
  }>
  destroy: () => Promise<void>
}

export function PdfViewer({ initialBookPage }: { initialBookPage: number }) {
  const router = useRouter()
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfDocRef = useRef<PdfDoc | null>(null)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)
  const lastSwipeAtRef = useRef(0)
  const pointerStateRef = useRef<{ id: number; x: number; y: number } | null>(null)
  const [bookPage, setBookPage] = useState(initialBookPage)
  const [frameWidth, setFrameWidth] = useState(0)
  const [docReady, setDocReady] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const goPrev = useCallback(
    () => setBookPage((p) => Math.max(MIN_BOOK_PAGE, p - 1)),
    [],
  )
  const goNext = useCallback(
    () => setBookPage((p) => Math.min(MAX_BOOK_PAGE, p + 1)),
    [],
  )
  const goHome = useCallback(() => setBookPage(MIN_BOOK_PAGE), [])
  const goEnd = useCallback(() => setBookPage(MAX_BOOK_PAGE), [])

  const goBack = () => {
    // Prefer browser history so the originating prayer page restores its scroll.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  // 1) Load the PDF document once on mount and cache via ref.
  //    Subsequent page changes only call doc.getPage(...) — no re-fetch.
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setErrorMessage('')
    ;(async () => {
      try {
        // legacy build: ES5-compatible main API. The default build calls
        // Uint8Array.prototype.toHex() which is Chrome 140+/Safari 18.2+ only,
        // so it breaks on older Android Chrome. Must stay paired with the
        // legacy worker copied to /public/pdf.worker.min.mjs — mixing builds
        // triggers "API version X does not match the Worker version Y".
        const pdfjs = (await import(
          'pdfjs-dist/legacy/build/pdf.min.mjs'
        )) as typeof import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const loadingTask = pdfjs.getDocument(PDF_ASSET_PATH)
        const doc = await loadingTask.promise
        if (cancelled) {
          void doc.destroy()
          return
        }
        pdfDocRef.current = doc as unknown as PdfDoc
        setDocReady(true)
      } catch (error) {
        if (!cancelled) {
          setStatus('error')
          const name = (error as { name?: string } | null)?.name
          const message = (error as Error)?.message || 'Алдаа гарлаа'
          setErrorMessage(name ? `${name}: ${message}` : message)
        }
      }
    })()
    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
      void pdfDocRef.current?.destroy()
      pdfDocRef.current = null
    }
  }, [])

  // 2) Observe the canvas frame width — drives fit-to-width re-render.
  //    Frame is constrained by `max-w-[480px]` on desktop so the canvas
  //    never grows beyond a comfortable reading width.
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const measure = () => setFrameWidth(el.clientWidth)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 3) Render the current bookPage when the doc + frame width are ready.
  useEffect(() => {
    if (!docReady || frameWidth <= 0) return
    const doc = pdfDocRef.current
    if (!doc) return

    let cancelled = false
    setStatus('loading')
    ;(async () => {
      try {
        const pdfPageNum = bookPageToPdfPage(bookPage)
        const pdfPage = await doc.getPage(pdfPageNum)
        if (cancelled) return
        const canvas = canvasRef.current
        if (!canvas) return

        const dpr =
          typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

        // Native PDF viewport is the full 2-up spread (both halves).
        const unscaled = pdfPage.getViewport({ scale: 1 })
        const halfNativeW = unscaled.width / 2

        // fit-to-width: scale the half-page so its CSS width equals frameWidth.
        // Desktop is naturally capped via the frame's max-w-[480px] CSS bound,
        // so this never produces a horizontally scrolling canvas.
        const cssScale = frameWidth / halfNativeW
        const renderScale = cssScale * dpr
        const viewport = pdfPage.getViewport({ scale: renderScale })
        const halfDeviceW = Math.floor(viewport.width / 2)

        canvas.width = halfDeviceW
        canvas.height = Math.floor(viewport.height)

        // CSS box: device px ÷ dpr keeps display crisp at the requested CSS size.
        canvas.style.width = `${halfNativeW * cssScale}px`
        canvas.style.height = `${unscaled.height * cssScale}px`

        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Shift the page so only the requested half lands in the canvas.
        if (bookPageSide(bookPage) === 'right') {
          ctx.setTransform(1, 0, 0, 1, -halfDeviceW, 0)
        }

        renderTaskRef.current?.cancel()
        const task = pdfPage.render({ canvasContext: ctx, viewport, canvas })
        renderTaskRef.current = task
        await task.promise
        if (!cancelled) setStatus('ready')
      } catch (error) {
        const name = (error as { name?: string } | null)?.name
        if (!cancelled && name !== 'RenderingCancelledException') {
          setStatus('error')
          const message = (error as Error)?.message || 'Алдаа гарлаа'
          setErrorMessage(name ? `${name}: ${message}` : message)
        }
      }
    })()

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
    }
  }, [bookPage, frameWidth, docReady])

  // 4) Keyboard navigation: ArrowLeft / ArrowRight / Home / End.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'Home') {
        e.preventDefault()
        goHome()
      } else if (e.key === 'End') {
        e.preventDefault()
        goEnd()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [goPrev, goNext, goHome, goEnd])

  // 5) Swipe gesture: pointerdown captures start, pointerup decides direction.
  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    pointerStateRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
    }
  }
  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const start = pointerStateRef.current
    pointerStateRef.current = null
    if (!start || start.id !== e.pointerId) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    if (absDx < SWIPE_THRESHOLD) return
    if (absDx <= VERTICAL_REJECT * absDy) return
    // iOS edge-back gesture protection — ignore swipes starting near left edge.
    if (start.x < EDGE_DEADZONE) return
    const now = Date.now()
    if (now - lastSwipeAtRef.current < SWIPE_DEBOUNCE_MS) return
    lastSwipeAtRef.current = now
    if (dx < 0) goNext()
    else goPrev()
  }
  const handlePointerCancel: React.PointerEventHandler<HTMLDivElement> = () => {
    pointerStateRef.current = null
  }

  return (
    <div
      data-role="pdf-viewer-container"
      className="relative min-h-[100dvh] w-full overflow-hidden bg-stone-100 dark:bg-neutral-950"
      style={{ touchAction: 'pan-y pinch-zoom' }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {/* Floating Буцах — 44x44 touch target, dark mode + safe-area-inset. */}
      <button
        type="button"
        onClick={goBack}
        aria-label="Буцах"
        className="absolute z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-lg text-stone-800 shadow-md backdrop-blur-sm hover:bg-white dark:bg-neutral-900/70 dark:text-stone-100 dark:hover:bg-neutral-900"
        style={{
          top: 'max(0.75rem, env(safe-area-inset-top, 0px))',
          left: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        }}
      >
        <span aria-hidden>←</span>
      </button>

      {/* Page indicator — aria-live announces page changes for AT users. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-role="pdf-page-indicator"
        className="pointer-events-none absolute z-20 rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-stone-700 shadow-md backdrop-blur-sm dark:bg-neutral-900/70 dark:text-stone-200"
        style={{
          top: 'max(0.75rem, env(safe-area-inset-top, 0px))',
          right: 'max(0.75rem, env(safe-area-inset-right, 0px))',
        }}
      >
        х. {bookPage}
      </div>

      {/* sr-only equivalent prev/next nav so AT users retain explicit controls. */}
      <nav aria-label="Хуудас солих" className="sr-only">
        <button
          type="button"
          onClick={goPrev}
          disabled={bookPage <= MIN_BOOK_PAGE}
          aria-label="Өмнөх хуудас"
          aria-keyshortcuts="ArrowLeft"
        >
          Өмнөх
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={bookPage >= MAX_BOOK_PAGE}
          aria-label="Дараагийн хуудас"
          aria-keyshortcuts="ArrowRight"
        >
          Дараах
        </button>
      </nav>

      {/* Constrained frame: drives fit-to-width measurement.
          Mobile (≤480px viewport) → frame = viewport. Desktop → frame = 480px capped. */}
      <div
        ref={frameRef}
        data-role="pdf-canvas-frame"
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] items-center justify-center"
      >
        {status === 'loading' ? (
          <p
            data-role="pdf-loading"
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-stone-500 dark:text-stone-400"
          >
            Ачаалж байна…
          </p>
        ) : null}

        {status === 'error' ? (
          <div
            data-role="pdf-error"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-sm"
          >
            <p className="text-red-600 dark:text-red-400">Уншиж чадсангүй.</p>
            <pre className="max-w-full whitespace-pre-wrap break-words rounded bg-stone-200 px-3 py-2 text-xs text-stone-700 dark:bg-stone-800 dark:text-stone-300">
              {errorMessage}
            </pre>
            <a
              href={PDF_ASSET_PATH}
              className="rounded-lg bg-stone-200 px-4 py-2 text-stone-700 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
            >
              PDF татах
            </a>
          </div>
        ) : null}

        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Дуулал номын ${bookPage}-р хуудас`}
          className={`bg-white shadow ${status === 'ready' ? '' : 'invisible'}`}
          data-role="pdf-canvas"
          data-book-page={bookPage}
        />
      </div>
    </div>
  )
}
