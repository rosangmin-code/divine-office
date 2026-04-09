'use client'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 h-10 w-10 text-stone-400 dark:text-stone-500" aria-hidden="true">
          <path d="M12 2v20M5 5l14 14M19 5L5 19" />
          <circle cx="12" cy="12" r="9" />
        </svg>
        <h2 className="mb-2 text-lg font-semibold text-stone-800 dark:text-stone-200">
          Алдаа гарлаа
        </h2>
        <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">
          Уучлаарай, ямар нэг зүйл буруу болсон байна.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-stone-200 px-6 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600"
        >
          Дахин оролдох
        </button>
      </div>
    </div>
  )
}
