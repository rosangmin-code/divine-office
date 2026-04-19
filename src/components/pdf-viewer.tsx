'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { bookPageToPdfPage, bookPageSide, PDF_ASSET_PATH } from '@/lib/pdf-page'

const MIN_BOOK_PAGE = 1
const MAX_BOOK_PAGE = 969 // 485 2-up pages -> 970 halves; last indexable half is 969

export function PdfViewer({ initialBookPage }: { initialBookPage: number }) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)
  const [bookPage, setBookPage] = useState(initialBookPage)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setErrorMessage('')

    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

        const loadingTask = pdfjs.getDocument(PDF_ASSET_PATH)
        const doc = await loadingTask.promise
        if (cancelled) {
          void doc.destroy()
          return
        }

        const pdfPageNum = bookPageToPdfPage(bookPage)
        const pdfPage = await doc.getPage(pdfPageNum)
        if (cancelled) return

        const canvas = canvasRef.current
        if (!canvas) return

        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
        const baseScale = 1.5
        const viewport = pdfPage.getViewport({ scale: baseScale * dpr })
        const halfW = Math.floor(viewport.width / 2)

        canvas.width = halfW
        canvas.height = Math.floor(viewport.height)

        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Shift the page so only the requested half lands in the canvas.
        if (bookPageSide(bookPage) === 'right') {
          ctx.setTransform(1, 0, 0, 1, -halfW, 0)
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
          setErrorMessage((error as Error)?.message || 'Алдаа гарлаа')
        }
      }
    })()

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
    }
  }, [bookPage])

  const goBack = () => {
    // Prefer browser history so the originating prayer page restores its scroll.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-neutral-950">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-white px-4 py-3 shadow-sm dark:bg-neutral-900 dark:shadow-none dark:ring-1 dark:ring-stone-800">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
          aria-label="Буцах"
        >
          <span aria-hidden>←</span>
          <span>Буцах</span>
        </button>
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
          х. {bookPage}
        </span>
        <span aria-hidden className="w-[3rem]" />
      </header>

      <main className="flex flex-col items-center px-3 py-4">
        {status === 'loading' ? (
          <p className="my-8 text-sm text-stone-500 dark:text-stone-400">Ачаалж байна…</p>
        ) : null}
        {status === 'error' ? (
          <p className="my-8 text-sm text-red-600 dark:text-red-400">
            Уншиж чадсангүй: {errorMessage}
          </p>
        ) : null}
        <canvas
          ref={canvasRef}
          className={`h-auto max-w-full bg-white shadow ${status === 'ready' ? '' : 'invisible'}`}
          data-role="pdf-canvas"
          data-book-page={bookPage}
        />
      </main>

      <nav
        aria-label="Хуудас солих"
        className="flex items-center justify-between gap-3 px-4 pb-6 pt-2"
      >
        <button
          type="button"
          onClick={() => setBookPage((p) => Math.max(MIN_BOOK_PAGE, p - 1))}
          disabled={bookPage <= MIN_BOOK_PAGE}
          className="rounded-lg bg-stone-200 px-4 py-2 text-sm text-stone-700 hover:bg-stone-300 disabled:opacity-40 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
        >
          ← Өмнөх
        </button>
        <button
          type="button"
          onClick={() => setBookPage((p) => Math.min(MAX_BOOK_PAGE, p + 1))}
          disabled={bookPage >= MAX_BOOK_PAGE}
          className="rounded-lg bg-stone-200 px-4 py-2 text-sm text-stone-700 hover:bg-stone-300 disabled:opacity-40 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
        >
          Дараах →
        </button>
      </nav>
    </div>
  )
}
